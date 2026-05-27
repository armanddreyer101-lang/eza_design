import { loadProjects, saveProjects, loadProjectImages, saveProjectImages } from './storage.js';
import { redirectIfNotAuthenticated, updateTopbarUserInfo, logout } from './auth.js';

let projects = [];
let currentProject = null;
let saveTimeout = null;
const SAVE_INDICATOR_DELAY = 1400;

function formatCurrency(value) {
  return `R ${Number(value).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function showSavedIndicator() {
  const indicator = document.getElementById('saveIndicator');
  if (!indicator) return;
  indicator.classList.remove('hidden');
  indicator.classList.add('visible');
  window.clearTimeout(saveTimeout);
  saveTimeout = window.setTimeout(() => {
    indicator.classList.remove('visible');
    indicator.classList.add('hidden');
  }, SAVE_INDICATOR_DELAY);
}

function parseQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function getProjectByNumber(number) {
  return projects.find((project) => project.number === number);
}

function redirectToDashboard() {
  window.location.href = 'dashboard.html';
}

function renderImagePreviews() {
  const previewArea = document.getElementById('imagePreviews');
  if (!previewArea) return;
  previewArea.innerHTML = '';
  (currentProject.images || []).forEach((src) => {
    const item = document.createElement('div');
    item.className = 'image-preview';
    item.innerHTML = `<img src="${src}" alt="Project image" />`;
    previewArea.appendChild(item);
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
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          currentProject.images = currentProject.images || [];
          currentProject.images.push(dataUrl);
          renderImagePreviews();
          saveProjectImages(currentProject.number, currentProject.images);
          saveProjects(projects);
          showSavedIndicator();
        } catch (error) {
          currentProject.images = currentProject.images || [];
          currentProject.images.push(reader.result);
          renderImagePreviews();
          saveProjectImages(currentProject.number, currentProject.images);
          saveProjects(projects);
          showSavedIndicator();
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function calculateMargin(cost, sell) {
  const totalCost = Number(cost) || 0;
  const totalSell = Number(sell) || 0;
  if (!totalSell) return 0;
  return Math.max(0, Math.round(((totalSell - totalCost) / totalSell) * 100));
}

// ─── PRODUCTS (replaces renderComponentsTable, populateSellOptions, updateSellMargins) ───

function renderProducts() {
  const container = document.getElementById('productsContainer');
  if (!container) return;
  container.innerHTML = '';

  if (!currentProject.products || currentProject.products.length === 0) {
    currentProject.products = [];
  }

  currentProject.products.forEach((product, productIndex) => {
    const totalCost = (product.components || []).reduce((sum, c) => sum + Number(c.cost || 0), 0);
    const marginRand = Math.max(0, Number(product.sellPrice || 0) - totalCost);
    const marginPercent = calculateMargin(totalCost, product.sellPrice || 0);

    const productCard = document.createElement('div');
    productCard.className = 'card detail-card product-card';
    productCard.innerHTML = `
      <div class="product-header">
        <input type="text" class="product-name-input" value="${product.name || ''}" placeholder="Product name" />
        <button type="button" class="btn btn-danger btn-small remove-product-btn">Remove product</button>
      </div>

      <div class="section-subtitle">Components</div>
      <div class="components-table-wrapper">
        <table class="components-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Cost (R)</th>
              <th></th>
            </tr>
          </thead>
          <tbody class="product-components-body"></tbody>
        </table>
      </div>
      <button type="button" class="btn btn-primary btn-small add-component-btn">Add component</button>
      <div class="detail-summary-row">
        <span>Total component cost</span>
        <strong class="product-total-cost">${formatCurrency(totalCost)}</strong>
      </div>

      <div class="section-subtitle" style="margin-top:1rem;">Sell price</div>
      <div class="price-option">
        <input type="number" class="product-sell-price" min="0" value="${product.sellPrice || 0}" placeholder="0" />
        <div class="price-margin">
          <span class="margin-rand">${formatCurrency(marginRand)}</span>
          <span class="margin-percent">${marginPercent}%</span>
        </div>
      </div>
    `;

    // Render component rows
    const tbody = productCard.querySelector('.product-components-body');
    renderComponentRows(tbody, product, productIndex);

    // Product name change
    const nameInput = productCard.querySelector('.product-name-input');
    nameInput.addEventListener('input', (e) => {
      currentProject.products[productIndex].name = e.target.value;
      saveProjects(projects);
      showSavedIndicator();
    });

    // Sell price change
    const sellInput = productCard.querySelector('.product-sell-price');
    sellInput.addEventListener('input', (e) => {
      currentProject.products[productIndex].sellPrice = Number(e.target.value) || 0;
      refreshProductTotals(productCard, productIndex);
      saveProjects(projects);
      showSavedIndicator();
    });

    // Add component
    const addComponentBtn = productCard.querySelector('.add-component-btn');
    addComponentBtn.addEventListener('click', () => {
      currentProject.products[productIndex].components = currentProject.products[productIndex].components || [];
      currentProject.products[productIndex].components.push({ name: 'New component', cost: 0 });
      renderComponentRows(productCard.querySelector('.product-components-body'), currentProject.products[productIndex], productIndex);
      refreshProductTotals(productCard, productIndex);
      saveProjects(projects);
      showSavedIndicator();
    });

    // Remove product
    const removeProductBtn = productCard.querySelector('.remove-product-btn');
    removeProductBtn.addEventListener('click', () => {
      currentProject.products.splice(productIndex, 1);
      renderProducts();
      saveProjects(projects);
      showSavedIndicator();
    });

    container.appendChild(productCard);
  });

  // Add product button
  const addProductBtn = document.createElement('button');
  addProductBtn.type = 'button';
  addProductBtn.className = 'btn btn-primary';
  addProductBtn.textContent = '+ Add product';
  addProductBtn.addEventListener('click', () => {
    currentProject.products = currentProject.products || [];
    currentProject.products.push({
      id: Date.now(),
      name: 'New Product',
      components: [],
      sellPrice: 0,
    });
    renderProducts();
    saveProjects(projects);
    showSavedIndicator();
  });
  container.appendChild(addProductBtn);

  // Update overall target cost display
  updateOverallTargetCost();
}

function renderComponentRows(tbody, product, productIndex) {
  tbody.innerHTML = '';
  (product.components || []).forEach((component, compIndex) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="text" value="${component.name || ''}" /></td>
      <td><input type="number" min="0" value="${component.cost || 0}" /></td>
      <td><button type="button" class="icon-btn">Remove</button></td>
    `;

    const nameInput = row.querySelector('input[type="text"]');
    const costInput = row.querySelector('input[type="number"]');
    const removeBtn = row.querySelector('button');

    nameInput.addEventListener('input', (e) => {
      currentProject.products[productIndex].components[compIndex].name = e.target.value;
      saveProjects(projects);
      showSavedIndicator();
    });

    costInput.addEventListener('input', (e) => {
      currentProject.products[productIndex].components[compIndex].cost = Number(e.target.value) || 0;
      const productCard = tbody.closest('.product-card');
      refreshProductTotals(productCard, productIndex);
      saveProjects(projects);
      showSavedIndicator();
    });

    removeBtn.addEventListener('click', () => {
      currentProject.products[productIndex].components.splice(compIndex, 1);
      renderComponentRows(tbody, currentProject.products[productIndex], productIndex);
      const productCard = tbody.closest('.product-card');
      refreshProductTotals(productCard, productIndex);
      saveProjects(projects);
      showSavedIndicator();
    });

    tbody.appendChild(row);
  });
}

function refreshProductTotals(productCard, productIndex) {
  const product = currentProject.products[productIndex];
  const totalCost = (product.components || []).reduce((sum, c) => sum + Number(c.cost || 0), 0);
  const marginRand = Math.max(0, Number(product.sellPrice || 0) - totalCost);
  const marginPercent = calculateMargin(totalCost, product.sellPrice || 0);

  const totalCostEl = productCard.querySelector('.product-total-cost');
  const marginRandEl = productCard.querySelector('.margin-rand');
  const marginPercentEl = productCard.querySelector('.margin-percent');

  if (totalCostEl) totalCostEl.textContent = formatCurrency(totalCost);
  if (marginRandEl) marginRandEl.textContent = formatCurrency(marginRand);
  if (marginPercentEl) marginPercentEl.textContent = `${marginPercent}%`;

  updateOverallTargetCost();
}

function updateOverallTargetCost() {
  // Overall target cost = sum of all product total component costs
  const overall = (currentProject.products || []).reduce((sum, product) => {
    return sum + (product.components || []).reduce((s, c) => s + Number(c.cost || 0), 0);
  }, 0);
  currentProject.targetCost = overall;
  const detailTargetCost = document.getElementById('detailTargetCost');
  if (detailTargetCost) detailTargetCost.textContent = formatCurrency(overall);
}

// ─── TIMELINE ───

function parseDate(dateString) {
  if (!dateString) return null;
  const value = new Date(dateString);
  return Number.isNaN(value.getTime()) ? null : value;
}

function formatDateForInput(date) {
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysFromToday(dateString) {
  const date = parseDate(dateString);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date - today) / (1000 * 60 * 60 * 24));
}

function updateTimelineFromPO(poValue) {
  const poDate = parseDate(poValue);
  if (!poDate) return;
  currentProject.poDate = formatDateForInput(poDate);
  const manufacturing = addDays(poDate, 45);
  const shipping = addDays(manufacturing, 30);
  const delivery = addDays(shipping, 15);
  currentProject.manufacturingDeadline = formatDateForInput(manufacturing);
  currentProject.shippingDeadline = formatDateForInput(shipping);
  currentProject.deliveryDate = formatDateForInput(delivery);
  currentProject.deadline = currentProject.deliveryDate;
}

function renderTimeline() {
  const poInput = document.getElementById('poDate');
  const manufacturingInput = document.getElementById('manufacturingDeadline');
  const shippingInput = document.getElementById('shippingDeadline');
  const deliveryInput = document.getElementById('deliveryDate');
  const detailDeadline = document.getElementById('detailDeadline');

  if (poInput) poInput.value = currentProject.poDate || '';
  if (manufacturingInput) manufacturingInput.value = currentProject.manufacturingDeadline || '';
  if (shippingInput) shippingInput.value = currentProject.shippingDeadline || '';
  if (deliveryInput) deliveryInput.value = currentProject.deliveryDate || '';
  if (detailDeadline) detailDeadline.value = currentProject.deadline || '';

  renderTimelineStatus('manufacturingDeadline', 'manufacturingStatus');
  renderTimelineStatus('shippingDeadline', 'shippingStatus');
  renderTimelineStatus('deliveryDate', 'deliveryStatus');
  renderTimelineSteps();
}

function setTimelineStep(stepId, status) {
  const step = document.getElementById(stepId);
  if (!step) return;
  step.classList.remove('active', 'completed', 'pending');
  step.classList.add(status);
}

function renderTimelineStatus(dateKey, statusId) {
  const dateValue = currentProject[dateKey];
  const statusEl = document.getElementById(statusId);
  const inputEl = document.getElementById(dateKey);
  if (inputEl) inputEl.classList.remove('timeline-input-overdue');
  if (statusEl) statusEl.classList.remove('overdue');
  if (!dateValue) {
    if (statusEl) statusEl.textContent = 'Not set';
    return;
  }
  const days = daysFromToday(dateValue);
  if (!statusEl) return;
  if (days === 0) {
    statusEl.textContent = 'Today';
  } else if (days > 0) {
    statusEl.textContent = `${days} day${days === 1 ? '' : 's'} remaining`;
  } else {
    statusEl.textContent = `${Math.abs(days)} day${days === -1 ? '' : 's'} overdue`;
    statusEl.classList.add('overdue');
    if (inputEl) inputEl.classList.add('timeline-input-overdue');
  }
}

function renderTimelineSteps() {
  const manufacturingDate = parseDate(currentProject.manufacturingDeadline);
  const shippingDate = parseDate(currentProject.shippingDeadline);
  const deliveryDate = parseDate(currentProject.deliveryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  setTimelineStep('stepManufacturing', 'pending');
  setTimelineStep('stepShipping', 'pending');
  setTimelineStep('stepDelivery', 'pending');

  if (deliveryDate && today > deliveryDate) {
    setTimelineStep('stepManufacturing', 'completed');
    setTimelineStep('stepShipping', 'completed');
    setTimelineStep('stepDelivery', 'active');
  } else if (shippingDate && today > shippingDate) {
    setTimelineStep('stepManufacturing', 'completed');
    setTimelineStep('stepShipping', 'active');
  } else {
    setTimelineStep('stepManufacturing', 'active');
  }
}

// ─── RECURRING ───

function renderRecurringSection() {
  const section = document.getElementById('recurringSection');
  const details = document.getElementById('recurringDetails');
  const empty = document.getElementById('recurringEmpty');
  if (!section) return;
  if (!currentProject) { section.classList.add('hidden'); return; }

  const eligible = currentProject.stage === 'Order Placed' || currentProject.stage === 'Recurring Order';
  if (!eligible) { section.classList.add('hidden'); return; }

  section.classList.remove('hidden');
  const recurring = currentProject.recurring || null;
  if (!recurring) {
    if (details) details.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  if (details) details.classList.remove('hidden');

  const recurringFrequency = document.getElementById('recurringFrequency');
  const recurringQuantity = document.getElementById('recurringQuantity');
  const recurringUnitCost = document.getElementById('recurringUnitCost');
  const recurringTotalValue = document.getElementById('recurringTotalValue');
  const recurringNextDue = document.getElementById('recurringNextDue');

  if (recurringFrequency) recurringFrequency.textContent = recurring.frequency || '-';
  if (recurringQuantity) recurringQuantity.textContent = recurring.quantity || '-';
  if (recurringUnitCost) recurringUnitCost.textContent = formatCurrency(recurring.unitCost || 0);
  if (recurringTotalValue) recurringTotalValue.textContent = formatCurrency((recurring.quantity || 0) * (recurring.unitCost || 0));
  if (recurringNextDue) recurringNextDue.textContent = formatDisplayDate(recurring.nextDueDate);
  renderRecurringHistory();
}

function renderRecurringHistory() {
  const historyList = document.getElementById('recurringHistoryList');
  if (!historyList) return;
  const recurring = currentProject.recurring || { orderHistory: [] };
  historyList.innerHTML = '';
  if (!recurring.orderHistory || recurring.orderHistory.length === 0) {
    historyList.innerHTML = '<li>No orders placed yet.</li>';
    return;
  }
  recurring.orderHistory.forEach((entry) => {
    const item = document.createElement('li');
    item.innerHTML = `<strong>${formatDisplayDate(entry.date)}</strong><span>Quantity: ${entry.quantity}</span><span>Total: ${formatCurrency(entry.total)}</span>`;
    historyList.appendChild(item);
  });
}

function convertToRecurring() {
  if (!currentProject) return;
  const frequencyInput = prompt('Choose order frequency: Monthly or Yearly');
  if (!frequencyInput) return;
  const frequency = frequencyInput.trim().toLowerCase();
  if (frequency !== 'monthly' && frequency !== 'yearly') { alert('Please enter Monthly or Yearly'); return; }

  const quantityInput = prompt('Enter order quantity per cycle', '1');
  const quantity = Number(quantityInput);
  if (!quantity || quantity <= 0) { alert('Quantity must be a number greater than zero.'); return; }

  const unitCostInput = prompt('Enter unit cost (R)', String(currentProject.targetCost || 0));
  const unitCost = Number(unitCostInput);
  if (!unitCost || unitCost <= 0) { alert('Unit cost must be a number greater than zero.'); return; }

  const nextDueDate = formatDateForInput(addDays(new Date(), frequency === 'monthly' ? 30 : 365));
  currentProject.recurring = { frequency, quantity, unitCost, nextDueDate, orderHistory: [] };
  currentProject.stage = 'Recurring Order';
  renderRecurringSection();
  saveProjects(projects);
  showSavedIndicator();
}

function placeNextOrder() {
  if (!currentProject || !currentProject.recurring) return;
  const recurring = currentProject.recurring;
  const orderDate = formatDateForInput(new Date());
  const orderTotal = recurring.quantity * recurring.unitCost;
  recurring.orderHistory.unshift({ date: orderDate, quantity: recurring.quantity, unitCost: recurring.unitCost, total: orderTotal });
  const nextDue = addDays(parseDate(recurring.nextDueDate) || new Date(), recurring.frequency === 'monthly' ? 30 : 365);
  recurring.nextDueDate = formatDateForInput(nextDue);
  renderRecurringSection();
  saveProjects(projects);
  showSavedIndicator();
}

function formatDisplayDate(dateString) {
  const date = parseDate(dateString);
  if (!date) return 'Not set';
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function openProposal(type = 'internal') {
  if (!currentProject) return;
  window.location.href = `proposal.html?project=${encodeURIComponent(currentProject.number)}&type=${encodeURIComponent(type)}`;
}

// ─── STAGE ───

const stageClass = {
  Concept: 'badge--concept',
  'Proposal Sent': 'badge--proposal',
  Samples: 'badge--samples',
  'Order Placed': 'badge--order',
  'Recurring Order': 'badge--recurring',
};

function setProjectStage(stage) {
  if (!currentProject) return;
  const stageOrder = ['Concept', 'Proposal Sent', 'Samples', 'Order Placed', 'Recurring Order'];
  if (!stageOrder.includes(stage)) return;
  currentProject.stage = stage;
  const stageBadge = document.getElementById('detailStageBadge');
  const stageSelect = document.getElementById('detailStageSelect');
  if (stageBadge) {
    stageBadge.textContent = stage;
    stageBadge.className = `badge clickable ${stageClass[stage] || ''}`;
  }
  if (stageSelect) stageSelect.value = stage;
  saveProjects(projects);
  showSavedIndicator();
}

// ─── SHOW PROJECT ───

function showProjectDetails() {
  if (!currentProject) return;

  // Migrate old data structure if needed
  if (!currentProject.products && currentProject.components) {
    currentProject.products = [{
      id: Date.now(),
      name: currentProject.name || 'Product',
      components: currentProject.components || [],
      sellPrice: (currentProject.sellOptions && currentProject.sellOptions[0]) || 0,
    }];
  }
  if (!currentProject.products) currentProject.products = [];

  const detailNameInput = document.getElementById('detailProjectName');
  if (detailNameInput) detailNameInput.value = currentProject.name;
  const detailProjectMeta = document.getElementById('detailProjectMeta');
  if (detailProjectMeta) detailProjectMeta.textContent = `${currentProject.number} · ${currentProject.category}`;
  const detailNumber = document.getElementById('detailNumber');
  if (detailNumber) detailNumber.textContent = currentProject.number;
  const detailCategory = document.getElementById('detailCategory');
  if (detailCategory) detailCategory.textContent = currentProject.category;
  const detailDeadline = document.getElementById('detailDeadline');
  if (detailDeadline) detailDeadline.value = currentProject.deadline || '';
  const detailQty = document.getElementById('detailQuantity');
  if (detailQty) detailQty.value = currentProject.quantity || '';
  const stageBadge = document.getElementById('detailStageBadge');
  const stageSelect = document.getElementById('detailStageSelect');
  if (stageBadge) {
    stageBadge.textContent = currentProject.stage;
    stageBadge.className = `badge clickable ${stageClass[currentProject.stage] || ''}`;
  }
  if (stageSelect) stageSelect.value = currentProject.stage;
  const conceptNotesInput = document.getElementById('conceptNotesInput');
  if (conceptNotesInput) conceptNotesInput.value = currentProject.notes || '';
  const valueAddInput = document.getElementById('valueAddInput');
  if (valueAddInput) valueAddInput.value = currentProject.valueAdd || '';

  renderImagePreviews();
  renderProducts();
  renderTimeline();
  renderRecurringSection();
}

function showAdjacentProject(direction) {
  const currentIndex = projects.findIndex((project) => project.number === currentProject.number);
  if (currentIndex === -1) return;
  const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
  if (nextIndex < 0 || nextIndex >= projects.length) return;
  window.location.href = `project.html?project=${encodeURIComponent(projects[nextIndex].number)}`;
}

// ─── EVENTS ───

function wireDetailEvents() {
  const backToDashboard = document.getElementById('backToDashboard');
  if (backToDashboard) backToDashboard.addEventListener('click', () => { window.location.href = 'dashboard.html'; });

  const prevProjectBtn = document.getElementById('prevProjectBtn');
  if (prevProjectBtn) prevProjectBtn.addEventListener('click', () => showAdjacentProject('prev'));

  const nextProjectBtn = document.getElementById('nextProjectBtn');
  if (nextProjectBtn) nextProjectBtn.addEventListener('click', () => showAdjacentProject('next'));

  const generateProposalBtn = document.getElementById('generateProposalBtn');
  if (generateProposalBtn) generateProposalBtn.addEventListener('click', () => openProposal('internal'));

  const sendClientProposalBtn = document.getElementById('sendClientProposalBtn');
  if (sendClientProposalBtn) sendClientProposalBtn.addEventListener('click', () => openProposal('client'));

  const backToDetail = document.getElementById('backToDetail');
  if (backToDetail) backToDetail.addEventListener('click', () => {
    const query = new URLSearchParams(window.location.search);
    const project = query.get('project');
    if (project) window.location.href = `project.html?project=${encodeURIComponent(project)}`;
  });

  const printProposalBtn = document.getElementById('printProposalBtn');
  if (printProposalBtn) printProposalBtn.addEventListener('click', () => window.print());

  const imageUpload = document.getElementById('imageUpload');
  if (imageUpload) {
    imageUpload.addEventListener('change', (event) => {
      if (!currentProject) return;
      updateImageFiles(event.target.files);
      event.target.value = '';
    });
  }

  const detailNameInput = document.getElementById('detailProjectName');
  if (detailNameInput) {
    detailNameInput.addEventListener('input', (event) => {
      if (!currentProject) return;
      currentProject.name = event.target.value;
      const projectMeta = document.getElementById('detailProjectMeta');
      if (projectMeta) projectMeta.textContent = `${currentProject.number} · ${currentProject.category}`;
      saveProjects(projects);
      showSavedIndicator();
    });
  }

  const conceptNotesInput = document.getElementById('conceptNotesInput');
  if (conceptNotesInput) {
    conceptNotesInput.addEventListener('input', (event) => {
      if (!currentProject) return;
      currentProject.notes = event.target.value;
      saveProjects(projects);
      showSavedIndicator();
    });
  }

  const valueAddInput = document.getElementById('valueAddInput');
  if (valueAddInput) {
    valueAddInput.addEventListener('input', (event) => {
      if (!currentProject) return;
      currentProject.valueAdd = event.target.value;
      saveProjects(projects);
      showSavedIndicator();
    });
  }

  const detailQty = document.getElementById('detailQuantity');
  if (detailQty) {
    detailQty.addEventListener('input', (event) => {
      if (!currentProject) return;
      currentProject.quantity = Number(event.target.value) || 0;
      saveProjects(projects);
      showSavedIndicator();
    });
  }

  const detailDeadline = document.getElementById('detailDeadline');
  if (detailDeadline) {
    detailDeadline.addEventListener('change', (event) => {
      if (!currentProject) return;
      currentProject.deadline = event.target.value;
      currentProject.deliveryDate = event.target.value;
      renderTimeline();
      saveProjects(projects);
      showSavedIndicator();
    });
  }

  const convertToRecurringBtn = document.getElementById('convertToRecurringBtn');
  if (convertToRecurringBtn) convertToRecurringBtn.addEventListener('click', convertToRecurring);

  const placeNextOrderBtn = document.getElementById('placeNextOrderBtn');
  if (placeNextOrderBtn) placeNextOrderBtn.addEventListener('click', placeNextOrder);

  const poDate = document.getElementById('poDate');
  if (poDate) {
    poDate.addEventListener('change', (event) => {
      if (!currentProject) return;
      updateTimelineFromPO(event.target.value);
      renderTimeline();
      saveProjects(projects);
      showSavedIndicator();
    });
  }

  const detailStageBadge = document.getElementById('detailStageBadge');
  const detailStageSelect = document.getElementById('detailStageSelect');
  if (detailStageBadge && detailStageSelect) {
    detailStageBadge.addEventListener('click', () => {
      detailStageSelect.classList.toggle('hidden');
      if (!detailStageSelect.classList.contains('hidden')) detailStageSelect.focus();
    });
  }

  if (detailStageSelect) {
    detailStageSelect.addEventListener('change', (event) => {
      setProjectStage(event.target.value);
      detailStageSelect.classList.add('hidden');
      renderTimeline();
      renderRecurringSection();
      showSavedIndicator();
    });
    detailStageSelect.addEventListener('blur', () => {
      detailStageSelect.classList.add('hidden');
    });
  }

  const manufacturingDeadline = document.getElementById('manufacturingDeadline');
  if (manufacturingDeadline) {
    manufacturingDeadline.addEventListener('change', (event) => {
      if (!currentProject) return;
      currentProject.manufacturingDeadline = event.target.value;
      renderTimeline();
      saveProjects(projects);
      showSavedIndicator();
    });
  }

  const shippingDeadline = document.getElementById('shippingDeadline');
  if (shippingDeadline) {
    shippingDeadline.addEventListener('change', (event) => {
      if (!currentProject) return;
      currentProject.shippingDeadline = event.target.value;
      renderTimeline();
      saveProjects(projects);
      showSavedIndicator();
    });
  }

  const deliveryDate = document.getElementById('deliveryDate');
  if (deliveryDate) {
    deliveryDate.addEventListener('change', (event) => {
      if (!currentProject) return;
      currentProject.deliveryDate = event.target.value;
      currentProject.deadline = event.target.value;
      renderTimeline();
      saveProjects(projects);
      showSavedIndicator();
    });
  }

  const advanceStageBtn = document.getElementById('advanceStageBtn');
  if (advanceStageBtn) {
    advanceStageBtn.addEventListener('click', () => {
      const stageOrder = ['Concept', 'Proposal Sent', 'Samples', 'Order Placed', 'Recurring Order'];
      const currentIndex = stageOrder.indexOf(currentProject.stage);
      if (currentIndex < stageOrder.length - 1) {
        setProjectStage(stageOrder[currentIndex + 1]);
        renderRecurringSection();
      }
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

// ─── INIT ───

function initDetailPage() {
  if (!redirectIfNotAuthenticated()) return;
  updateTopbarUserInfo();

  projects = loadProjects();
  const projectNumber = parseQueryParam('project');
  if (!projectNumber) { redirectToDashboard(); return; }

  currentProject = getProjectByNumber(projectNumber);
  if (!currentProject) { redirectToDashboard(); return; }

  currentProject.images = loadProjectImages(currentProject.number) || [];
  showProjectDetails();
  wireDetailEvents();
}

initDetailPage();