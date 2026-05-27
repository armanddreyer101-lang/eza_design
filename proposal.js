import { loadProjects, loadProjectImages } from './storage.js';
import { redirectIfNotAuthenticated, updateTopbarUserInfo, logout } from './auth.js';

let currentProject = null;
let currentProposalType = 'internal';

function formatCurrency(value) {
  return `R ${Number(value).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function parseQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function parseDate(dateString) {
  if (!dateString) return null;
  const value = new Date(dateString);
  return Number.isNaN(value.getTime()) ? null : value;
}

function formatDisplayDate(dateString) {
  const date = parseDate(dateString);
  if (!date) return 'Not set';
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function renderInternalProposal(proposalDate, conceptDescription, valueAddDescription, images, totalComponentCost) {
  const componentRows = (currentProject.components || []).map((component) => `
      <tr>
        <td>${component.name}</td>
        <td>${formatCurrency(component.cost)}</td>
      </tr>
    `).join('');

  const sellRows = (currentProject.sellOptions || []).map((price, index) => {
    const marginPerUnit = Math.max(0, price - totalComponentCost);
    const marginPercent = calculateMargin(totalComponentCost, price);
    const totalSell = (Number(price) || 0) * (Number(currentProject.quantity) || 0);
    const totalMargin = marginPerUnit * (Number(currentProject.quantity) || 0);
    return `
      <tr>
        <td>${currentProject.sellLabels?.[index] || `Option ${String.fromCharCode(65 + index)}`}</td>
        <td>${formatCurrency(price)} per unit</td>
        <td>${formatCurrency(marginPerUnit)} / ${marginPercent}% per unit</td>
        <td>${formatCurrency(totalSell)} (total)</td>
        <td>${formatCurrency(totalMargin)} (total margin)</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="proposal-header proposal-print-header">
      <div class="proposal-brand">
        <div class="brand__mark">EZA</div>
        <div>
          <h2>EZA Design</h2>
          <p>Design Studio</p>
        </div>
      </div>
      <div class="proposal-date-block">
        <p class="proposal-date-label">Date</p>
        <p class="proposal-date-value">${proposalDate}</p>
      </div>
    </div>
    <div class="proposal-address-block">
      <p><strong>To:</strong></p>
      <p>Witchious Conradie</p>
      <p>Regional Trading Manager, Fresh Produce</p>
      <p>Shoprite Checkers</p>
    </div>
    <div class="proposal-section">
      <h1 class="proposal-title">${currentProject.name}</h1>
      <p class="proposal-subtitle">${currentProject.category}</p>
    </div>
    <div class="proposal-section">
      <h3>Concept notes</h3>
      <p>${conceptDescription}</p>
    </div>
    <div class="proposal-section">
      <h3>Value add description</h3>
      <p>${valueAddDescription}</p>
    </div>
    <div class="proposal-section">
      <h3>Product images</h3>
      <div class="proposal-images">${images}</div>
    </div>
    <div class="proposal-section">
      <h3>Costing details</h3>
      <p><strong>Quantity:</strong> ${Number(currentProject.quantity || 0).toLocaleString('en-ZA')}</p>
      <p><strong>Total component cost (per unit):</strong> ${formatCurrency(totalComponentCost)}</p>
      <p><strong>Total cost (all units):</strong> ${formatCurrency(totalComponentCost * (Number(currentProject.quantity) || 0))}</p>
      <table class="proposal-table">
        <thead>
          <tr><th>Component</th><th>Cost</th></tr>
        </thead>
        <tbody>${componentRows}</tbody>
        <tfoot>
          <tr><td><strong>Total component cost</strong></td><td><strong>${formatCurrency(totalComponentCost)}</strong></td></tr>
        </tfoot>
      </table>
      <table class="proposal-table proposal-table--prices">
        <thead>
          <tr><th>Option</th><th>Sell price</th><th>Margin (per unit)</th><th>Total sell</th><th>Total margin</th></tr>
        </thead>
        <tbody>${sellRows}</tbody>
      </table>
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

function renderClientProposal(proposalDate, conceptDescription, valueAddDescription, images, bestOption) {
  return `
    <div class="proposal-header proposal-print-header">
      <div class="proposal-brand">
        <div class="brand__mark">EZA</div>
        <div>
          <h2>EZA Design</h2>
          <p>Design Studio</p>
        </div>
      </div>
      <div class="proposal-date-block">
        <p class="proposal-date-label">Date</p>
        <p class="proposal-date-value">${proposalDate}</p>
      </div>
    </div>
    <div class="proposal-address-block">
      <p><strong>To:</strong></p>
      <p>Witchious Conradie</p>
      <p>Shoprite Checkers</p>
    </div>
    <div class="proposal-section">
      <h1 class="proposal-title">${currentProject.name}</h1>
      <p class="proposal-subtitle">${currentProject.category}</p>
    </div>
    <div class="proposal-section">
      <h3>Product images</h3>
      <div class="proposal-images">${images}</div>
    </div>
    <div class="proposal-section">
      <h3>Concept summary</h3>
      <p>${conceptDescription}</p>
    </div>
    <div class="proposal-section">
      <h3>Value add</h3>
      <p>${valueAddDescription}</p>
    </div>
    <div class="proposal-section">
      <h3>Recommended selling price</h3>
      <div class="client-price-card">
        <p class="client-price-value" style="font-size:1.6rem;margin:0;">${formatCurrency(bestOption.price)}</p>
        <p style="margin:0.25rem 0 0;color:var(--muted);">Recommended selling price (best option)</p>
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

function calculateMargin(cost, sell) {
  const totalCost = Number(cost) || 0;
  const totalSell = Number(sell) || 0;
  if (!totalSell) return 0;
  return Math.max(0, Math.round(((totalSell - totalCost) / totalSell) * 100));
}

function renderProposal() {
  const today = new Date();
  const proposalDate = today.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  const conceptDescription = currentProject.notes || 'No concept notes added yet.';
  const valueAddDescription = currentProject.valueAdd || 'No value-add description entered.';
  const images = (currentProject.images || []).length
    ? currentProject.images.map((src) => `<div class="proposal-image"><img src="${src}" alt="${currentProject.name} photo" /></div>`).join('')
    : '<div class="proposal-image"><p style="padding:1rem;color:var(--muted);">No images uploaded yet.</p></div>';
  const totalComponentCost = (currentProject.components || []).reduce((sum, item) => sum + Number(item.cost || 0), 0);

  if (currentProposalType === 'client') {
    const bestOptionIndex = (currentProject.sellOptions || []).reduce((bestIdx, price, idx) => {
      const currentMargin = price - totalComponentCost;
      const bestMargin = (currentProject.sellOptions || [])[bestIdx] - totalComponentCost;
      return currentMargin > bestMargin ? idx : bestIdx;
    }, 0);
    const bestOption = {
      index: bestOptionIndex,
      label: currentProject.sellLabels?.[bestOptionIndex] || `Option ${String.fromCharCode(65 + bestOptionIndex)}`,
      price: currentProject.sellOptions?.[bestOptionIndex] || 0,
    };
    document.getElementById('proposalContent').innerHTML = renderClientProposal(proposalDate, conceptDescription, valueAddDescription, images, bestOption);
  } else {
    document.getElementById('proposalContent').innerHTML = renderInternalProposal(proposalDate, conceptDescription, valueAddDescription, images, totalComponentCost);
  }
}

function initProposalPage() {
  if (!redirectIfNotAuthenticated()) return;
  updateTopbarUserInfo();

  const projectNumber = parseQueryParam('project');
  const proposalType = parseQueryParam('type');
  if (!projectNumber) {
    window.location.href = 'dashboard.html';
    return;
  }

  currentProposalType = proposalType === 'client' ? 'client' : 'internal';
  const projects = loadProjects();
  currentProject = projects.find((project) => project.number === projectNumber);
  if (!currentProject) {
    window.location.href = 'dashboard.html';
    return;
  }
  currentProject.images = loadProjectImages(currentProject.number) || [];

  renderProposal();

  const backToDetailButton = document.getElementById('backToDetail');
  if (backToDetailButton) {
    backToDetailButton.addEventListener('click', () => {
      window.location.href = `project.html?project=${encodeURIComponent(currentProject.number)}`;
    });
  }

  const printButton = document.getElementById('printProposalBtn');
  if (printButton) {
    printButton.addEventListener('click', () => window.print());
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

initProposalPage();
