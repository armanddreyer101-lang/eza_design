import { loadProjects, saveProject, loadProjectImages, saveProjectImages } from './storage.js';
import { redirectIfNotAuthenticated, updateTopbarUserInfo, logout } from './auth.js';

let projects = [];
let currentProject = null;
let editSnapshot = null;
let isEditMode = false;

// ─── UTILS ───

function formatCurrency(value) {
  return `R ${Number(value).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function parseQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function getProjectByNumber(number) {
  return projects.find((p) => p.number === number);
}

function redirectToDashboard() {
  window.location.href = 'dashboard.html';
}

function calculateMargin(cost, sell) {
  const c = Number(cost) || 0;
  const s = Number(sell) || 0;
  if (!s) return 0;
  return Math.max(0, Math.round(((s - c) / s) * 100));
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateForInput(date) {
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(str) {
  const d = parseDate(str);
  if (!d) return 'Not set';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function addDays(date, days) {
  const r = new Date(date);
  r.setDate(r.getDate() + days);
  return r;
}

function daysFromToday(str) {
  const d = parseDate(str);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
}

function showSavedIndicator() {
  const el = document.getElementById('saveIndicator');
  if (!el) return;
  el.classList.remove('hidden');
  el.classList.add('visible');
  setTimeout(() => { el.classList.remove('visible'); el.classList.add('hidden'); }, 1400);
}

// ─── EDIT MODE ───

function enterEditMode() {
  editSnapshot = deepClone(currentProject);
  isEditMode = true;
  renderPage();
}

function cancelEdit() {
  currentProject = deepClone(editSnapshot);
  // restore images (not in snapshot)
  currentProject.images = loadProjectImages(currentProject.number) || [];
  isEditMode = false;
  renderPage();
}

async function saveEdit() {
  await saveProject(currentProject);
  showSavedIndicator();
  isEditMode = false;
  renderPage();
}

// ─── EDIT BAR ───

function renderEditBar() {
  const title = document.getElementById('editBarTitle');
  const meta = document.getElementById('editBarMeta');
  const editBtn = document.getElementById('editBtn');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  if (title) title.textContent = currentProject.name;
  if (meta) meta.textContent = `${currentProject.number} · ${currentProject.category}`;

  if (isEditMode) {
    editBtn.classList.add('hidden');
    saveBtn.classList.remove('hidden');
    cancelBtn.classList.remove('hidden');
  } else {
    editBtn.classList.remove('hidden');
    saveBtn.classList.add('hidden');
    cancelBtn.classList.add('hidden');
  }
}

// ─── STAGE ───

const stageClass = {
  Concept: 'badge--concept',
  'Proposal Sent': 'badge--proposal',
  Samples: 'badge--samples',
  'Order Placed': 'badge--order',
  'Recurring Order': 'badge--recurring',
};

const stageOrder = ['Concept', 'Proposal Sent', 'Samples', 'Order Placed', 'Recurring Order'];

// ─── RENDER PAGE ───

function renderPage() {
  renderEditBar();
  const content = document.getElementById('projectContent');
  if (!content) return;

  if (isEditMode) {
    content.innerHTML = buildEditHTML();
    wireEditEvents();
  } else {
    content.innerHTML = buildViewHTML();
    wireViewEvents();
  }
}

// ─── VIEW MODE HTML ───

function buildViewHTML() {
  const p = currentProject;
  const products = p.products || [];
  const totalCost = products.reduce((sum, prod) => sum + (prod.components || []).reduce((s, c) => s + Number(c.cost || 0), 0), 0);
  const totalSell = products.reduce((sum, prod) => sum + Number(prod.sellPrice || 0), 0);
  const margin = calculateMargin(totalCost, totalSell);

  const productRows = products.map((prod) => {
    const prodCost = (prod.components || []).reduce((s, c) => s + Number(c.cost || 0), 0);
    const prodMargin = calculateMargin(prodCost, prod.sellPrice || 0);
    const compList = (prod.components || []).map((c) => `<li>${c.name} — ${formatCurrency(c.cost)}</li>`).join('');
    return `
      <div class="product-view-block">
        <div class="product-view-name">${prod.name}</div>
        <ul class="product-view-components">${compList || '<li>No components</li>'}</ul>
        <div class="product-view-footer">
          <span>Cost: <strong>${formatCurrency(prodCost)}</strong></span>
          <span>Sell: <strong>${formatCurrency(prod.sellPrice || 0)}</strong></span>
          <span>Margin: <strong>${prodMargin}%</strong></span>
        </div>
      </div>
    `;
  }).join('');

  const images = (p.images || []).length
    ? p.images.map((src) => `<div class="image-preview"><img src="${src}" alt="Product image" /></div>`).join('')
    : '<p class="text-muted">No images uploaded.</p>';

  const timelineHTML = buildTimelineViewHTML();
  const recurringHTML = buildRecurringViewHTML();

  return `
    <div class="detail-grid">
      <div class="detail-column">

        <div class="card detail-card">
          <div class="detail-row">
            <div><p class="card__label">Project</p><h3>${p.number}</h3></div>
            <div><p class="card__label">Stage</p><span class="badge ${stageClass[p.stage] || ''}">${p.stage}</span></div>
          </div>
          <div class="detail-row">
            <div><p class="card__label">Category</p><p>${p.category}</p></div>
            <div><p class="card__label">Target cost</p><p>${formatCurrency(totalCost)}</p></div>
          </div>
          <div class="detail-row">
            <div><p class="card__label">Quantity</p><p>${p.quantity || '—'}</p></div>
            <div><p class="card__label">Deadline</p><p>${formatDisplayDate(p.deadline)}</p></div>
          </div>
        </div>

        <div class="card detail-card">
          <div class="section-subtitle">Product photos</div>
          <div class="image-preview-grid">${images}</div>
        </div>

        <div class="card detail-card">
          <div class="section-subtitle">Concept notes</div>
          <p>${p.notes || '<span class="text-muted">No notes added.</span>'}</p>
        </div>

        <div class="card detail-card">
          <div class="section-subtitle">Value add description</div>
          <p>${p.valueAdd || '<span class="text-muted">No description added.</span>'}</p>
        </div>

      </div>
      <div class="detail-column">

        <div class="card detail-card">
          <div class="section-subtitle">Products</div>
          ${productRows || '<p class="text-muted">No products added yet.</p>'}
          <div class="detail-summary-row" style="margin-top:1rem;">
            <span>Total cost</span><strong>${formatCurrency(totalCost)}</strong>
          </div>
          <div class="detail-summary-row">
            <span>Total sell price</span><strong>${formatCurrency(totalSell)}</strong>
          </div>
          <div class="detail-summary-row">
            <span>Overall margin</span><strong>${margin}%</strong>
          </div>
        </div>

        ${timelineHTML}

        <div class="card detail-card">
          <div class="section-subtitle">Project progress</div>
          <p class="text-muted">Current stage: <strong>${p.stage}</strong></p>
          ${p.stage !== 'Recurring Order' ? '<button class="btn btn-primary" id="advanceStageBtn">Advance to next stage</button>' : '<p class="text-muted">Project is at final stage.</p>'}
        </div>

        <div class="card detail-card">
          <div class="section-subtitle">Proposal</div>
          <p class="text-muted">Create a professional proposal for Shoprite Checkers.</p>
          <div class="detail-actions">
            <button class="btn btn-secondary" id="generateProposalBtn">Internal Proposal</button>
            <button class="btn btn-primary" id="sendClientProposalBtn">Send to Client</button>
          </div>
        </div>

        ${recurringHTML}

      </div>
    </div>
  `;
}

function buildTimelineViewHTML() {
  const p = currentProject;
  const steps = [
    { label: 'Manufacturing', date: p.manufacturingDeadline },
    { label: 'Shipping', date: p.shippingDeadline },
    { label: 'Delivery', date: p.deliveryDate },
  ];

  const stepRows = steps.map((s) => {
    const days = daysFromToday(s.date);
    let status = 'Not set';
    let cls = '';
    if (days !== null) {
      if (days === 0) status = 'Today';
      else if (days > 0) status = `${days} day${days === 1 ? '' : 's'} remaining`;
      else { status = `${Math.abs(days)} day${days === -1 ? '' : 's'} overdue`; cls = 'overdue'; }
    }
    return `
      <div class="timeline-item">
        <label>${s.label}</label>
        <span>${formatDisplayDate(s.date)}</span>
        <span class="timeline-status ${cls}">${status}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="card detail-card">
      <div class="section-subtitle">Timeline tracker</div>
      <div class="detail-row"><p class="card__label">PO Date</p><p>${formatDisplayDate(p.poDate)}</p></div>
      <div class="timeline-row timeline-row--details">${stepRows}</div>
    </div>
  `;
}

function buildRecurringViewHTML() {
  const p = currentProject;
  const eligible = p.stage === 'Order Placed' || p.stage === 'Recurring Order';
  if (!eligible) return '';

  if (!p.recurring) {
    return `
      <div class="card detail-card">
        <div class="section-subtitle">Recurring orders</div>
        <p class="text-muted">Convert this project into a recurring order.</p>
        <button class="btn btn-primary" id="convertToRecurringBtn">Convert to Recurring Order</button>
      </div>
    `;
  }

  const r = p.recurring;
  const history = (r.orderHistory || []).map((entry) => `
    <li><strong>${formatDisplayDate(entry.date)}</strong> — Qty: ${entry.quantity} — Total: ${formatCurrency(entry.total)}</li>
  `).join('');

  return `
    <div class="card detail-card">
      <div class="section-subtitle">Recurring orders</div>
      <div class="recurring-grid">
        <div class="order-summary-item"><p><strong>Frequency</strong></p><p>${r.frequency}</p></div>
        <div class="order-summary-item"><p><strong>Qty per cycle</strong></p><p>${r.quantity}</p></div>
        <div class="order-summary-item"><p><strong>Unit cost</strong></p><p>${formatCurrency(r.unitCost)}</p></div>
        <div class="order-summary-item"><p><strong>Total value</strong></p><p>${formatCurrency(r.quantity * r.unitCost)}</p></div>
        <div class="order-summary-item"><p><strong>Next due</strong></p><p>${formatDisplayDate(r.nextDueDate)}</p></div>
      </div>
      <button class="btn btn-primary" id="placeNextOrderBtn">Place Next Order</button>
      <h3 style="margin-top:1rem;">Order history</h3>
      <ul class="recurring-history">${history || '<li>No orders placed yet.</li>'}</ul>
    </div>
  `;
}

// ─── EDIT MODE HTML ───

function buildEditHTML() {
  const p = currentProject;
  const products = p.products || [];

  const productCards = products.map((prod, pi) => {
    const prodCost = (prod.components || []).reduce((s, c) => s + Number(c.cost || 0), 0);
    const marginRand = Math.max(0, Number(prod.sellPrice || 0) - prodCost);
    const marginPercent = calculateMargin(prodCost, prod.sellPrice || 0);

    const compRows = (prod.components || []).map((c, ci) => `
      <tr>
        <td><input type="text" class="comp-name" data-pi="${pi}" data-ci="${ci}" value="${c.name || ''}" /></td>
        <td><input type="number" class="comp-cost" data-pi="${pi}" data-ci="${ci}" min="0" value="${c.cost || 0}" /></td>
        <td><button type="button" class="icon-btn remove-comp-btn" data-pi="${pi}" data-ci="${ci}">Remove</button></td>
      </tr>
    `).join('');

    return `
      <div class="card detail-card product-card" data-pi="${pi}">
        <div class="product-header">
          <input type="text" class="product-name-input" data-pi="${pi}" value="${prod.name || ''}" placeholder="Product name" />
          <button type="button" class="btn btn-danger btn-small remove-product-btn" data-pi="${pi}">Remove product</button>
        </div>
        <div class="section-subtitle">Components</div>
        <div class="components-table-wrapper">
          <table class="components-table">
            <thead><tr><th>Component</th><th>Cost (R)</th><th></th></tr></thead>
            <tbody class="comp-tbody" data-pi="${pi}">${compRows}</tbody>
          </table>
        </div>
        <button type="button" class="btn btn-primary btn-small add-comp-btn" data-pi="${pi}">Add component</button>
        <div class="detail-summary-row">
          <span>Total component cost</span>
          <strong class="prod-total-cost" data-pi="${pi}">${formatCurrency(prodCost)}</strong>
        </div>
        <div class="section-subtitle" style="margin-top:1rem;">Sell price</div>
        <div class="price-option">
          <input type="number" class="product-sell-price" data-pi="${pi}" min="0" value="${prod.sellPrice || 0}" />
          <div class="price-margin">
            <span class="margin-rand" data-pi="${pi}">${formatCurrency(marginRand)}</span>
            <span class="margin-percent" data-pi="${pi}">${marginPercent}%</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const timelineEditHTML = buildTimelineEditHTML();

  return `
    <div class="detail-grid">
      <div class="detail-column">

        <div class="card detail-card">
          <div class="detail-row">
            <div><p class="card__label">Project</p><h3>${p.number}</h3></div>
            <div>
              <p class="card__label">Stage</p>
              <select id="detailStageSelect" class="stage-dropdown">
                ${stageOrder.map((s) => `<option value="${s}" ${p.stage === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="detail-row">
            <div><p class="card__label">Category</p><p>${p.category}</p></div>
            <div><p class="card__label">Target cost</p><p id="detailTargetCost">${formatCurrency(p.targetCost || 0)}</p></div>
          </div>
          <div class="detail-row">
            <div>
              <p class="card__label">Project name</p>
              <input type="text" id="detailProjectName" value="${p.name || ''}" />
            </div>
          </div>
          <div class="detail-row">
            <div>
              <p class="card__label">Quantity</p>
              <input type="number" id="detailQuantity" min="0" step="1" value="${p.quantity || ''}" />
            </div>
            <div>
              <p class="card__label">Deadline</p>
              <input type="date" id="detailDeadline" value="${p.deadline || ''}" />
            </div>
          </div>
        </div>

        <div class="card detail-card">
          <div class="section-subtitle">Product photos</div>
          <p class="text-muted">Upload multiple images.</p>
          <label class="file-upload">
            <input type="file" id="imageUpload" accept="image/*" multiple />
            Choose images
          </label>
          <div class="image-preview-grid" id="imagePreviews"></div>
        </div>

        <div class="card detail-card">
          <div class="section-subtitle">Concept notes</div>
          <textarea id="conceptNotesInput" placeholder="Type the idea, inspiration and product purpose...">${p.notes || ''}</textarea>
        </div>

        <div class="card detail-card">
          <div class="section-subtitle">Value add description</div>
          <textarea id="valueAddInput" placeholder="Describe the customer benefit...">${p.valueAdd || ''}</textarea>
        </div>

      </div>
      <div class="detail-column">

        <div class="card detail-card">
          <div class="section-subtitle">Products</div>
          <p class="text-muted">Manage products, components and pricing.</p>
          <div id="productsContainer">${productCards}</div>
          <button type="button" class="btn btn-primary" id="addProductBtn">+ Add product</button>
        </div>

        ${timelineEditHTML}

      </div>
    </div>
  `;
}

function buildTimelineEditHTML() {
  const p = currentProject;
  return `
    <div class="card detail-card">
      <div class="section-subtitle">Timeline tracker</div>
      <p class="text-muted">Enter the PO date to auto-calculate deadlines.</p>
      <div class="timeline-row">
        <label>PO date</label>
        <input type="date" id="poDate" value="${p.poDate || ''}" />
      </div>
      <div class="timeline-row timeline-row--details">
        <div class="timeline-item">
          <label>Manufacturing deadline</label>
          <input type="date" id="manufacturingDeadline" value="${p.manufacturingDeadline || ''}" />
        </div>
        <div class="timeline-item">
          <label>Shipping deadline</label>
          <input type="date" id="shippingDeadline" value="${p.shippingDeadline || ''}" />
        </div>
        <div class="timeline-item">
          <label>Delivery date</label>
          <input type="date" id="deliveryDate" value="${p.deliveryDate || ''}" />
        </div>
      </div>
    </div>
  `;
}

// ─── WIRE VIEW EVENTS ───

function wireViewEvents() {
  const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };

  on('editBtn', 'click', enterEditMode);
  on('backToDashboard', 'click', () => { window.location.href = 'dashboard.html'; });
  on('prevProjectBtn', 'click', () => showAdjacentProject('prev'));
  on('nextProjectBtn', 'click', () => showAdjacentProject('next'));
  on('generateProposalBtn', 'click', () => openProposal('internal'));
  on('sendClientProposalBtn', 'click', () => openProposal('client'));
  on('logoutBtn', 'click', logout);

  on('advanceStageBtn', 'click', async () => {
    const idx = stageOrder.indexOf(currentProject.stage);
    if (idx < stageOrder.length - 1) {
      currentProject.stage = stageOrder[idx + 1];
      await saveProject(currentProject);
      showSavedIndicator();
      renderPage();
    }
  });

  on('convertToRecurringBtn', 'click', convertToRecurring);
  on('placeNextOrderBtn', 'click', placeNextOrder);
}

// ─── WIRE EDIT EVENTS ───

function wireEditEvents() {
  const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };

  on('saveBtn', 'click', saveEdit);
  on('cancelBtn', 'click', cancelEdit);
  on('backToDashboard', 'click', () => {
    if (confirm('You have unsaved changes. Leave without saving?')) window.location.href = 'dashboard.html';
  });
  on('prevProjectBtn', 'click', () => {
    if (confirm('You have unsaved changes. Leave without saving?')) showAdjacentProject('prev');
  });
  on('nextProjectBtn', 'click', () => {
    if (confirm('You have unsaved changes. Leave without saving?')) showAdjacentProject('next');
  });
  on('logoutBtn', 'click', logout);

  // Basic fields
  on('detailProjectName', 'input', (e) => { currentProject.name = e.target.value; document.getElementById('editBarTitle').textContent = e.target.value; });
  on('detailQuantity', 'input', (e) => { currentProject.quantity = Number(e.target.value) || 0; });
  on('detailDeadline', 'change', (e) => { currentProject.deadline = e.target.value; currentProject.deliveryDate = e.target.value; });
  on('conceptNotesInput', 'input', (e) => { currentProject.notes = e.target.value; });
  on('valueAddInput', 'input', (e) => { currentProject.valueAdd = e.target.value; });
  on('detailStageSelect', 'change', (e) => { currentProject.stage = e.target.value; });

  // Timeline
  on('poDate', 'change', (e) => {
    const poDate = parseDate(e.target.value);
    if (!poDate) return;
    currentProject.poDate = formatDateForInput(poDate);
    const mfg = addDays(poDate, 45);
    const shp = addDays(mfg, 30);
    const dlv = addDays(shp, 15);
    currentProject.manufacturingDeadline = formatDateForInput(mfg);
    currentProject.shippingDeadline = formatDateForInput(shp);
    currentProject.deliveryDate = formatDateForInput(dlv);
    currentProject.deadline = currentProject.deliveryDate;
    // update inputs
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('manufacturingDeadline', currentProject.manufacturingDeadline);
    setVal('shippingDeadline', currentProject.shippingDeadline);
    setVal('deliveryDate', currentProject.deliveryDate);
  });
  on('manufacturingDeadline', 'change', (e) => { currentProject.manufacturingDeadline = e.target.value; });
  on('shippingDeadline', 'change', (e) => { currentProject.shippingDeadline = e.target.value; });
  on('deliveryDate', 'change', (e) => { currentProject.deliveryDate = e.target.value; currentProject.deadline = e.target.value; });

  // Image upload
  on('imageUpload', 'change', (e) => { updateImageFiles(e.target.files); e.target.value = ''; });

  // Add product
  on('addProductBtn', 'click', () => {
    currentProject.products = currentProject.products || [];
    currentProject.products.push({ id: Date.now(), name: 'New Product', components: [], sellPrice: 0 });
    renderPage();
  });

  // Product events (delegated)
  const container = document.getElementById('productsContainer');
  if (container) {
    container.addEventListener('input', handleProductInput);
    container.addEventListener('click', handleProductClick);
  }

  // Render image previews
  renderImagePreviewsInEdit();
}

function handleProductInput(e) {
  const pi = parseInt(e.target.dataset.pi);
  const ci = parseInt(e.target.dataset.ci);

  if (e.target.classList.contains('product-name-input')) {
    currentProject.products[pi].name = e.target.value;
  }
  if (e.target.classList.contains('comp-name')) {
    currentProject.products[pi].components[ci].name = e.target.value;
  }
  if (e.target.classList.contains('comp-cost')) {
    currentProject.products[pi].components[ci].cost = Number(e.target.value) || 0;
    refreshProductTotalsInEdit(pi);
  }
  if (e.target.classList.contains('product-sell-price')) {
    currentProject.products[pi].sellPrice = Number(e.target.value) || 0;
    refreshProductTotalsInEdit(pi);
  }
}

function handleProductClick(e) {
  const pi = parseInt(e.target.dataset.pi);
  const ci = parseInt(e.target.dataset.ci);

  if (e.target.classList.contains('remove-product-btn')) {
    if (confirm('Remove this product and all its components?')) {
      currentProject.products.splice(pi, 1);
      renderPage();
    }
  }

  if (e.target.classList.contains('add-comp-btn')) {
    currentProject.products[pi].components = currentProject.products[pi].components || [];
    currentProject.products[pi].components.push({ name: 'New component', cost: 0 });
    renderPage();
  }

  if (e.target.classList.contains('remove-comp-btn')) {
    if (confirm('Remove this component?')) {
      currentProject.products[pi].components.splice(ci, 1);
      renderPage();
    }
  }
}

function refreshProductTotalsInEdit(pi) {
  const prod = currentProject.products[pi];
  const totalCost = (prod.components || []).reduce((s, c) => s + Number(c.cost || 0), 0);
  const marginRand = Math.max(0, Number(prod.sellPrice || 0) - totalCost);
  const marginPercent = calculateMargin(totalCost, prod.sellPrice || 0);

  const totalEl = document.querySelector(`.prod-total-cost[data-pi="${pi}"]`);
  const randEl = document.querySelector(`.margin-rand[data-pi="${pi}"]`);
  const pctEl = document.querySelector(`.margin-percent[data-pi="${pi}"]`);

  if (totalEl) totalEl.textContent = formatCurrency(totalCost);
  if (randEl) randEl.textContent = formatCurrency(marginRand);
  if (pctEl) pctEl.textContent = `${marginPercent}%`;

  updateOverallTargetCost();
}

function updateOverallTargetCost() {
  const overall = (currentProject.products || []).reduce((sum, prod) => {
    return sum + (prod.components || []).reduce((s, c) => s + Number(c.cost || 0), 0);
  }, 0);
  currentProject.targetCost = overall;
  const el = document.getElementById('detailTargetCost');
  if (el) el.textContent = formatCurrency(overall);
}

function renderImagePreviewsInEdit() {
  const area = document.getElementById('imagePreviews');
  if (!area) return;
  area.innerHTML = '';
  (currentProject.images || []).forEach((src, idx) => {
    const item = document.createElement('div');
    item.className = 'image-preview';
    item.innerHTML = `
      <img src="${src}" alt="Product image" />
      <button type="button" class="remove-image-btn btn btn-danger btn-small" data-idx="${idx}">✕</button>
    `;
    item.querySelector('.remove-image-btn').addEventListener('click', () => {
      if (confirm('Remove this image?')) {
        currentProject.images.splice(idx, 1);
        saveProjectImages(currentProject.number, currentProject.images);
        renderImagePreviewsInEdit();
      }
    });
    area.appendChild(item);
  });
}

function updateImageFiles(files) {
  const fileList = Array.from(files || []);
  const MAX_IMAGES = 10;
  const toAdd = fileList.slice(0, MAX_IMAGES - (currentProject.images?.length || 0));
  toAdd.forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1200;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          currentProject.images = currentProject.images || [];
          currentProject.images.push(dataUrl);
        } catch {
          currentProject.images = currentProject.images || [];
          currentProject.images.push(reader.result);
        }
        saveProjectImages(currentProject.number, currentProject.images);
        renderImagePreviewsInEdit();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── RECURRING ───

async function convertToRecurring() {
  if (!currentProject) return;
  const freq = prompt('Choose order frequency: Monthly or Yearly');
  if (!freq) return;
  const frequency = freq.trim().toLowerCase();
  if (frequency !== 'monthly' && frequency !== 'yearly') { alert('Please enter Monthly or Yearly'); return; }
  const qty = Number(prompt('Enter order quantity per cycle', '1'));
  if (!qty || qty <= 0) { alert('Quantity must be greater than zero.'); return; }
  const uc = Number(prompt('Enter unit cost (R)', String(currentProject.targetCost || 0)));
  if (!uc || uc <= 0) { alert('Unit cost must be greater than zero.'); return; }
  currentProject.recurring = { frequency, quantity: qty, unitCost: uc, nextDueDate: formatDateForInput(addDays(new Date(), frequency === 'monthly' ? 30 : 365)), orderHistory: [] };
  currentProject.stage = 'Recurring Order';
  await saveProject(currentProject);
  showSavedIndicator();
  renderPage();
}

async function placeNextOrder() {
  if (!currentProject?.recurring) return;
  const r = currentProject.recurring;
  r.orderHistory.unshift({ date: formatDateForInput(new Date()), quantity: r.quantity, unitCost: r.unitCost, total: r.quantity * r.unitCost });
  r.nextDueDate = formatDateForInput(addDays(parseDate(r.nextDueDate) || new Date(), r.frequency === 'monthly' ? 30 : 365));
  await saveProject(currentProject);
  showSavedIndicator();
  renderPage();
}

// ─── PROPOSAL ───

function openProposal(type = 'internal') {
  if (!currentProject) return;
  window.location.href = `proposal.html?project=${encodeURIComponent(currentProject.number)}&type=${encodeURIComponent(type)}`;
}

// ─── NAVIGATION ───

function showAdjacentProject(direction) {
  const idx = projects.findIndex((p) => p.number === currentProject.number);
  if (idx === -1) return;
  const nextIdx = direction === 'next' ? idx + 1 : idx - 1;
  if (nextIdx < 0 || nextIdx >= projects.length) return;
  window.location.href = `project.html?project=${encodeURIComponent(projects[nextIdx].number)}`;
}

// ─── INIT ───

async function initDetailPage() {
  if (!redirectIfNotAuthenticated()) return;
  updateTopbarUserInfo();

  projects = await loadProjects();
  const projectNumber = parseQueryParam('project');
  if (!projectNumber) { redirectToDashboard(); return; }

  currentProject = getProjectByNumber(projectNumber);
  if (!currentProject) { redirectToDashboard(); return; }

  currentProject.images = loadProjectImages(currentProject.number) || [];

  // Migrate old data structure
  if (!currentProject.products && currentProject.components) {
    currentProject.products = [{
      id: Date.now(),
      name: currentProject.name || 'Product',
      components: currentProject.components || [],
      sellPrice: (currentProject.sellOptions && currentProject.sellOptions[0]) || 0,
    }];
  }
  if (!currentProject.products) currentProject.products = [];

  renderPage();
}

initDetailPage();
