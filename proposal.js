import { loadProjects } from './storage.js';
import { redirectIfNotAuthenticated, updateTopbarUserInfo, logout } from './auth.js';

let currentProject = null;
let currentProposalType = 'internal';

function formatCurrency(value) {
  return `R ${Number(value).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function parseQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function formatDisplayDate(str) {
  const d = parseDate(str);
  if (!d) return 'Not set';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function calculateMargin(cost, sell) {
  const c = Number(cost) || 0;
  const s = Number(sell) || 0;
  if (!s) return 0;
  return Math.max(0, Math.round(((s - c) / s) * 100));
}

function renderInternalProposal() {
  const p = currentProject;
  const products = p.products || [];
  const quantity = Number(p.quantity) || 0;
  const today = new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });

  const totalCost = products.reduce((sum, prod) => sum + (prod.components || []).reduce((s, c) => s + Number(c.cost || 0), 0), 0);
  const totalSell = products.reduce((sum, prod) => sum + Number(prod.sellPrice || 0), 0);

  const productSections = products.map((prod) => {
    const prodCost = (prod.components || []).reduce((s, c) => s + Number(c.cost || 0), 0);
    const sellPrice = Number(prod.sellPrice) || 0;
    const marginRand = Math.max(0, sellPrice - prodCost);
    const marginPercent = calculateMargin(prodCost, sellPrice);
    const totalSellProd = sellPrice * quantity;
    const totalMarginProd = marginRand * quantity;

    const compRows = (prod.components || []).map((c) => `
      <tr><td>${c.name}</td><td>${formatCurrency(c.cost)}</td></tr>
    `).join('');

    return `
      <div class="proposal-product-block" style="margin-bottom:1.5rem;">
        <h4 style="margin-bottom:0.5rem;">${prod.name}</h4>
        <table class="proposal-table">
          <thead><tr><th>Component</th><th>Cost</th></tr></thead>
          <tbody>${compRows || '<tr><td colspan="2">No components.</td></tr>'}</tbody>
          <tfoot><tr><td><strong>Total cost</strong></td><td><strong>${formatCurrency(prodCost)}</strong></td></tr></tfoot>
        </table>
        <table class="proposal-table proposal-table--prices" style="margin-top:0.5rem;">
          <thead><tr><th>Sell price</th><th>Margin/unit</th><th>Total sell</th><th>Total margin</th></tr></thead>
          <tbody>
            <tr>
              <td>${formatCurrency(sellPrice)}</td>
              <td>${formatCurrency(marginRand)} / ${marginPercent}%</td>
              <td>${formatCurrency(totalSellProd)}</td>
              <td>${formatCurrency(totalMarginProd)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  const images = (p.images || []).length
    ? p.images.map((src) => `<div class="proposal-image"><img src="${src}" alt="${p.name}" /></div>`).join('')
    : '<p style="color:var(--muted)">No images uploaded.</p>';

  return `
    <div class="proposal-header proposal-print-header">
      <div class="proposal-brand">
        <div class="brand__mark">EZA</div>
        <div><h2>EZA Design</h2><p>Design Studio</p></div>
      </div>
      <div class="proposal-date-block">
        <p class="proposal-date-label">Date</p>
        <p class="proposal-date-value">${today}</p>
      </div>
    </div>
    <div class="proposal-address-block">
      <p><strong>To:</strong></p>
      <p>Witchious Conradie</p>
      <p>Regional Trading Manager, Fresh Produce</p>
      <p>Shoprite Checkers</p>
    </div>
    <div class="proposal-section">
      <h1 class="proposal-title">${p.name}</h1>
      <p class="proposal-subtitle">${p.category}</p>
    </div>
    <div class="proposal-section">
      <h3>Concept notes</h3>
      <p>${p.notes || 'No concept notes added.'}</p>
    </div>
    <div class="proposal-section">
      <h3>Value add description</h3>
      <p>${p.valueAdd || 'No value-add description entered.'}</p>
    </div>
    <div class="proposal-section">
      <h3>Product images</h3>
      <div class="proposal-images">${images}</div>
    </div>
    <div class="proposal-section">
      <h3>Costing details</h3>
      <p><strong>Quantity:</strong> ${quantity.toLocaleString('en-ZA')}</p>
      <p><strong>Total component cost:</strong> ${formatCurrency(totalCost)}</p>
      <p><strong>Total sell price:</strong> ${formatCurrency(totalSell)}</p>
      ${productSections}
    </div>
    <div class="proposal-footer">
      <div>
        <p><strong>EZA Design</strong></p>
        <p>Project Brain • Product development and costing</p>
        <p>contact@ezadesign.co.za</p>
        <p>+27 21 555 0101</p>
      </div>
      <div>
        <p><strong>Approved by</strong></p>
        <p>Witchious Conradie</p>
        <p>Regional Trading Manager, Fresh Produce</p>
        <p>Shoprite Checkers</p>
      </div>
    </div>
  `;
}

function renderClientProposal() {
  const p = currentProject;
  const products = p.products || [];
  const totalSell = products.reduce((sum, prod) => sum + Number(prod.sellPrice || 0), 0);
  const today = new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });

  const images = (p.images || []).length
    ? p.images.map((src) => `<div class="proposal-image"><img src="${src}" alt="${p.name}" /></div>`).join('')
    : '<p style="color:var(--muted)">No images uploaded.</p>';

  return `
    <div class="proposal-header proposal-print-header">
      <div class="proposal-brand">
        <div class="brand__mark">EZA</div>
        <div><h2>EZA Design</h2><p>Design Studio</p></div>
      </div>
      <div class="proposal-date-block">
        <p class="proposal-date-label">Date</p>
        <p class="proposal-date-value">${today}</p>
      </div>
    </div>
    <div class="proposal-address-block">
      <p><strong>To:</strong></p>
      <p>Witchious Conradie</p>
      <p>Shoprite Checkers</p>
    </div>
    <div class="proposal-section">
      <h1 class="proposal-title">${p.name}</h1>
      <p class="proposal-subtitle">${p.category}</p>
    </div>
    <div class="proposal-section">
      <h3>Product images</h3>
      <div class="proposal-images">${images}</div>
    </div>
    <div class="proposal-section">
      <h3>Concept summary</h3>
      <p>${p.notes || 'No concept notes added.'}</p>
    </div>
    <div class="proposal-section">
      <h3>Value add</h3>
      <p>${p.valueAdd || 'No value-add description entered.'}</p>
    </div>
    <div class="proposal-section">
      <h3>Recommended selling price</h3>
      <div class="client-price-card">
        <p style="font-size:1.6rem;margin:0;">${formatCurrency(totalSell)}</p>
        <p style="margin:0.25rem 0 0;color:var(--muted);">Recommended selling price</p>
      </div>
    </div>
    <div class="proposal-footer">
      <div>
        <p><strong>EZA Design</strong></p>
        <p>Professional proposal for Shoprite Checkers</p>
        <p>contact@ezadesign.co.za</p>
        <p>+27 21 555 0101</p>
      </div>
      <div>
        <p><strong>Prepared for</strong></p>
        <p>Witchious Conradie</p>
        <p>Shoprite Checkers</p>
      </div>
    </div>
  `;
}

async function initProposalPage() {
  if (!redirectIfNotAuthenticated()) return;
  updateTopbarUserInfo();

  const projectNumber = parseQueryParam('project');
  const proposalType = parseQueryParam('type');
  if (!projectNumber) { window.location.href = 'dashboard.html'; return; }

  currentProposalType = proposalType === 'client' ? 'client' : 'internal';

  const projects = await loadProjects();
  currentProject = projects.find((p) => p.number === projectNumber);
  if (!currentProject) { window.location.href = 'dashboard.html'; return; }

  // Images are stored as public URLs inside project.data.images — loaded automatically
  currentProject.images = currentProject.images || [];

  const content = document.getElementById('proposalContent');
  if (content) {
    content.innerHTML = currentProposalType === 'client' ? renderClientProposal() : renderInternalProposal();
  }

  const backBtn = document.getElementById('backToDetail');
  if (backBtn) backBtn.addEventListener('click', () => {
    window.location.href = `project.html?project=${encodeURIComponent(currentProject.number)}`;
  });

  const printBtn = document.getElementById('printProposalBtn');
  if (printBtn) printBtn.addEventListener('click', () => window.print());

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

initProposalPage();
