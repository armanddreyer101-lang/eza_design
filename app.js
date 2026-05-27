const STORAGE_KEY = 'ezaDesignProjects';
const SAVE_INDICATOR_DELAY = 1400;
let saveTimeout = null;

const defaultProjects = [
  {
    number: 'P-001',
    name: 'Checkers Stand and Plants',
    category: 'Plants',
    stage: 'Concept',
    targetCost: 25,
    quantity: 80000,
    deadline: '',
    overdue: false,
    notes: 'Live tube plants displayed in a branded Checkers stand. 24 plants per stand. No soil required, just water. Easy care indoor plants.',
    valueAdd: '',
    images: [],
    components: [
      { name: 'Stand', cost: 10 },
      { name: 'Tube', cost: 8 },
      { name: 'Plant', cost: 7 },
    ],
    sellOptions: [70, 80, 90],
    sellLabels: ['Option A', 'Option B', 'Option C'],
    poDate: '',
    manufacturingDeadline: '',
    shippingDeadline: '',
    deliveryDate: '',
  },
  {
    number: 'P-002',
    name: 'Paper Cup Packaging',
    category: 'Paper Cups',
    stage: 'Concept',
    targetCost: 0,
    quantity: 10000,
    deadline: '',
    overdue: false,
    notes: 'Branded Checkers paper cup pot covers for nursery plants. Sizes: 10cm, 12cm, 14cm, 16cm, 16.5cm, 17cm, 19cm and larger.',
    valueAdd: '',
    images: [],
    components: [],
    sellOptions: [0, 0, 0],
    sellLabels: ['Option A', 'Option B', 'Option C'],
    poDate: '',
    manufacturingDeadline: '',
    shippingDeadline: '',
    deliveryDate: '',
  },
];

function loadProjects() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const initialProjects = JSON.parse(JSON.stringify(defaultProjects));
    saveProjects(initialProjects, false);
    return initialProjects;
  }

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      parsed.forEach(updateProjectOverdueStatus);
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to load stored projects:', error);
  }
  const initialProjects = JSON.parse(JSON.stringify(defaultProjects));
  saveProjects(initialProjects, false);
  return initialProjects;

  const imageMap = JSON.parse(localStorage.getItem('ezaDesignImages') || '{}');
  parsed.forEach(p => { p.images = imageMap[p.number] || []; });
  
}

function saveProjects(data = projects, notify = true) {
  data.forEach(updateProjectOverdueStatus);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    const dataWithoutImages = data.map(p => ({ ...p, images: [] }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithoutImages));
      console.warn('Storage full — images cleared to save project data.');
    } catch (e2) {
      console.error('Save failed completely:', e2);
    }
  }
  if (notify) {
    showSavedIndicator();
  }
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

function updateProjectOverdueStatus(project) {
  if (!project || !project.deadline) {
    project.overdue = false;
    return;
  }
  const deadline = parseDate(project.deadline);
  if (!deadline) {
    project.overdue = false;
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  project.overdue = deadline < today;
}

let projects = loadProjects();

const stageClass = {
  Concept: 'badge--concept',
  'Proposal Sent': 'badge--proposal',
  Samples: 'badge--samples',
  'Order Placed': 'badge--order',
  'Recurring Order': 'badge--recurring',
};

const stageOrder = ['Concept', 'Proposal Sent', 'Samples', 'Order Placed', 'Recurring Order'];
let currentProject = null;
let currentProposalType = 'internal';
let currentUser = null;

const AUTH_STORAGE_KEY = 'ezaDesignAuth';
const authUsers = [
  {
    username: 'eza001',
    password: 'eza001pass',
    name: 'Admin001',
    role: 'Import and Admin',
  },
  {
    username: 'partner',
    password: 'shoprite2026',
    name: 'Shoprite Partner',
    role: 'Trading and Design Coordinator',
  },
];

function loadAuthSession() {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    if (!parsed?.username) return null;
    return authUsers.find((user) => user.username === parsed.username) || null;
  } catch (error) {
    console.warn('Failed to restore auth session:', error);
    return null;
  }
}

function saveAuthSession(user) {
  if (!user) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ username: user.username }));
}

function updateTopbarUserInfo(user) {
  const userName = document.getElementById('topbarUserName');
  const userRole = document.getElementById('topbarUserRole');
  const logoutBtn = document.getElementById('logoutBtn');

  if (!user) {
    userName.textContent = 'Guest';
    userRole.textContent = 'Please sign in';
    logoutBtn.classList.add('hidden');
    return;
  }

  userName.textContent = user.name;
  userRole.textContent = user.role;
  logoutBtn.classList.remove('hidden');
}

function showLoginView() {
  document.getElementById('loginView').classList.remove('hidden');
  document.getElementById('mainApp').classList.add('hidden');
}

function showAppView() {
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
}

function authenticate(username, password) {
  return authUsers.find(
    (user) => user.username === username.trim().toLowerCase() && user.password === password,
  );
}

function setLoginError(message = '') {
  const errorElement = document.getElementById('loginError');
  if (!errorElement) return;
  if (message) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  } else {
    errorElement.textContent = 'Invalid username or password.';
    errorElement.classList.add('hidden');
  }
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const user = authenticate(username, password);

  if (!user) {
    setLoginError('Invalid username or password. Please try again.');
    return;
  }

  currentUser = user;
  saveAuthSession(currentUser);
  updateTopbarUserInfo(currentUser);
  setLoginError('');
  showAppView();
  renderProjects();
  renderSummary();
}

function handleLogout() {
  currentUser = null;
  saveAuthSession(null);
  updateTopbarUserInfo(null);
  showLoginView();
}

function ensureAuthenticated() {
  const authUser = loadAuthSession();
  if (!authUser) {
    showLoginView();
    return false;
  }

  currentUser = authUser;
  updateTopbarUserInfo(currentUser);
  showAppView();
  return true;
}

function formatCurrency(value) {
  return `R ${Number(value).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function renderSummary() {
  projects.forEach(updateProjectOverdueStatus);
  const activeCount = projects.length;
  const overdueCount = projects.filter((project) => project.overdue).length;
  const pipelineValue = projects.reduce((sum, project) => sum + (project.sellOptions[2] || 0), 0);

  document.getElementById('activeCount').textContent = activeCount;
  document.getElementById('overdueCount').textContent = overdueCount;
  document.getElementById('pipelineValue').textContent = formatCurrency(pipelineValue);
}

function openProject(projectNumber) {
  currentProject = projects.find((project) => project.number === projectNumber);
  if (!currentProject) return;

  document.getElementById('dashboardView').classList.add('hidden');
  document.getElementById('detailView').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const detailNameInput = document.getElementById('detailProjectName');
  detailNameInput.value = currentProject.name;
  document.getElementById('detailProjectMeta').textContent = `${currentProject.number} · ${currentProject.category}`;
  document.getElementById('detailNumber').textContent = currentProject.number;
  document.getElementById('detailCategory').textContent = currentProject.category;
  document.getElementById('detailTargetCost').textContent = formatCurrency(currentProject.targetCost);
  document.getElementById('detailDeadline').value = currentProject.deadline;
  const detailQty = document.getElementById('detailQuantity');
  if (detailQty) detailQty.value = currentProject.quantity || '';
  const stageBadge = document.getElementById('detailStageBadge');
  const stageSelect = document.getElementById('detailStageSelect');
  stageBadge.textContent = currentProject.stage;
  stageBadge.className = `badge clickable ${stageClass[currentProject.stage] || ''}`;
  stageSelect.value = currentProject.stage;

  document.getElementById('conceptNotesInput').value = currentProject.notes;
  document.getElementById('valueAddInput').value = currentProject.valueAdd;

  renderImagePreviews();
  renderComponentsTable();
  populateSellOptions();
  renderTimeline();
  renderRecurringSection();
}

function showAdjacentProject(direction) {
  if (!currentProject) return;
  const currentIndex = getCurrentProjectIndex();
  if (currentIndex === -1) return;

  const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
  if (nextIndex < 0 || nextIndex >= projects.length) return;
  openProject(projects[nextIndex].number);
}

function getCurrentProjectIndex() {
  return projects.findIndex((project) => project.number === currentProject?.number);
}

function showAdjacentProject(direction) {
  if (!currentProject) return;
  const currentIndex = getCurrentProjectIndex();
  if (currentIndex === -1) return;

  const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
  if (nextIndex < 0 || nextIndex >= projects.length) return;
  openProject(projects[nextIndex].number);
}

function closeDetailView() {
  document.getElementById('detailView').classList.add('hidden');
  document.getElementById('dashboardView').classList.remove('hidden');
  currentProject = null;
}

function renderProjects() {
  const rows = document.getElementById('projectRows');
  rows.innerHTML = '';

  projects.forEach((project) => {
    const row = document.createElement('tr');
    row.classList.add('clickable-row');
    row.addEventListener('click', () => openProject(project.number));

    row.innerHTML = `
      <td>
        <div class="project-name">
          <strong>${project.number} — ${project.name}</strong>
          <span>${project.category}</span>
        </div>
      </td>
      <td>${project.quantity || 0}</td>
      <td>
        <span class="badge ${stageClass[project.stage] || ''}">${project.stage}</span>
        ${project.recurring ? '<span class="badge badge--recurring">Recurring</span>' : ''}
      </td>
      <td>${formatCurrency(project.targetCost)}</td>
      <td>${formatCurrency(project.sellOptions[2] || 0)}</td>
      <td>${calculateMargin(project.targetCost, project.sellOptions[2])}%</td>
      <td class="${project.overdue ? 'overdue' : ''}">${project.deadline}</td>
    `;

    rows.appendChild(row);
  });
}

function calculateNextProjectNumber() {
  const numbers = projects.map((project) => Number(project.number.replace('P-', '')) || 0);
  const nextNumber = Math.max(...numbers) + 1;
  return `P-${String(nextNumber).padStart(3, '0')}`;
}

function calculateMargin(cost, sell) {
  const totalCost = Number(cost) || 0;
  const totalSell = Number(sell) || 0;
  if (!totalSell) return 0;
  return Math.max(0, Math.round(((totalSell - totalCost) / totalSell) * 100));
}

function openAddProjectForm() {
  document.getElementById('addProjectForm').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeAddProjectForm() {
  document.getElementById('addProjectForm').classList.add('hidden');
  document.getElementById('newProjectForm').reset();
}

function handleNewProjectSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('newProjectName').value.trim();
  const category = document.getElementById('newProjectCategory').value;
  const targetCost = Number(document.getElementById('newProjectTargetCost').value) || 0;
  const deadline = document.getElementById('newProjectDeadline').value;

  if (!name || !category || !deadline) {
    alert('Please complete all fields before creating the project.');
    return;
  }

  const newProject = {
    number: calculateNextProjectNumber(),
    name,
    category,
    stage: 'Concept',
    targetCost,
    quantity: Number(document.getElementById('newProjectQuantity').value) || 0,
    deadline,
    overdue: false,
    notes: '',
    valueAdd: '',
    images: [],
    components: [],
    sellOptions: [70, 80, 90],
    sellLabels: ['Option A', 'Option B', 'Option C'],
    poDate: '',
    manufacturingDeadline: '',
    shippingDeadline: '',
    deliveryDate: '',
  };

  projects.push(newProject);
  saveProjects();
  renderProjects();
  renderSummary();
  closeAddProjectForm();
}

function renderImagePreviews() {
  const previewArea = document.getElementById('imagePreviews');
  previewArea.innerHTML = '';

  currentProject.images.forEach((src) => {
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
        // Resize large images to reduce localStorage usage
        const MAX_WIDTH = 1200;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Use JPEG at 0.75 quality to keep size small
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          currentProject.images = currentProject.images || [];
          currentProject.images.push(dataUrl);
          renderImagePreviews();
          saveImages();
          saveProjects();
        } catch (e) {
          // Fallback to original data if conversion fails
          currentProject.images = currentProject.images || [];
          currentProject.images.push(reader.result);
          renderImagePreviews();
          saveProjects();
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function saveImages() {
  const imageMap = {};
  projects.forEach(p => { imageMap[p.number] = p.images || []; });
  try {
    localStorage.setItem('ezaDesignImages', JSON.stringify(imageMap));
  } catch(e) {
    console.warn('Image storage full:', e);
  }
}loadProjects

function renderComponentsTable() {
  const body = document.getElementById('componentsBody');
  body.innerHTML = '';

  currentProject.components.forEach((component, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="text" value="${component.name}" /></td>
      <td><input type="number" min="0" value="${component.cost}" /></td>
      <td><button type="button" class="icon-btn">Remove</button></td>
    `;

    const nameInput = row.querySelector('input[type="text"]');
    const costInput = row.querySelector('input[type="number"]');
    const removeBtn = row.querySelector('button');

    nameInput.addEventListener('input', (event) => {
      currentProject.components[index].name = event.target.value;
      saveProjects();
    });

    costInput.addEventListener('input', (event) => {
      currentProject.components[index].cost = Number(event.target.value) || 0;
      updateTotals();
      saveProjects();
    });

    removeBtn.addEventListener('click', () => {
      currentProject.components.splice(index, 1);
      renderComponentsTable();
      saveProjects();
    });

    body.appendChild(row);
  });

  updateTotals();
}

function updateTotals() {
  const totalCost = currentProject.components.reduce((sum, component) => sum + Number(component.cost || 0), 0);
  document.getElementById('totalComponentCost').textContent = formatCurrency(totalCost);
  document.getElementById('detailTargetCost').textContent = formatCurrency(currentProject.targetCost);
  updateSellMargins(totalCost);
}

function populateSellOptions() {
  document.getElementById('sellLabel1').value = currentProject.sellLabels?.[0] || 'Option A';
  document.getElementById('sellLabel2').value = currentProject.sellLabels?.[1] || 'Option B';
  document.getElementById('sellLabel3').value = currentProject.sellLabels?.[2] || 'Option C';
  document.getElementById('sellOption1').value = currentProject.sellOptions[0];
  document.getElementById('sellOption2').value = currentProject.sellOptions[1];
  document.getElementById('sellOption3').value = currentProject.sellOptions[2];
  updateTotals();
}

function getBestMarginIndex(values) {
  return values.reduce((bestIndex, option, index) => {
    if (option.marginValue > values[bestIndex].marginValue) {
      return index;
    }
    return bestIndex;
  }, 0);
}

function updateSellMargins(totalCost) {
  const optionElements = [1, 2, 3].map((index) => ({
    row: document.getElementById(`priceOption${index}`),
    label: document.getElementById(`sellLabel${index}`),
    input: document.getElementById(`sellOption${index}`),
    output: document.getElementById(`sellMargin${index}`),
  }));

  const optionData = optionElements.map((elements, index) => {
    const sellValue = Number(elements.input.value) || 0;
    const labelValue = elements.label.value.trim() || `Option ${String.fromCharCode(65 + index)}`;
    const marginValue = Math.max(0, sellValue - totalCost);
    const marginPercent = calculateMargin(totalCost, sellValue);

    currentProject.sellOptions[index] = sellValue;
    currentProject.sellLabels = currentProject.sellLabels || ['Option A', 'Option B', 'Option C'];
    currentProject.sellLabels[index] = labelValue;

    elements.output.innerHTML = `<span class="margin-rand">${formatCurrency(marginValue)}</span><span class="margin-percent">${marginPercent}%</span>`;
    elements.label.value = labelValue;

    return { marginValue };
  });

  const bestIndex = getBestMarginIndex(optionData);
  optionElements.forEach((elements, index) => {
    elements.row.classList.toggle('best-margin', index === bestIndex);
  });
}

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
  const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
  return diff;
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

  poInput.value = currentProject.poDate || '';
  manufacturingInput.value = currentProject.manufacturingDeadline || '';
  shippingInput.value = currentProject.shippingDeadline || '';
  deliveryInput.value = currentProject.deliveryDate || '';
  document.getElementById('detailDeadline').value = currentProject.deadline || '';

  renderTimelineStatus('manufacturingDeadline', 'manufacturingStatus');
  renderTimelineStatus('shippingDeadline', 'shippingStatus');
  renderTimelineStatus('deliveryDate', 'deliveryStatus');
  renderTimelineSteps();
}

function setTimelineStep(stepId, status) {
  const step = document.getElementById(stepId);
  step.classList.remove('active', 'completed', 'pending');
  step.classList.add(status);
}

function renderTimelineStatus(dateKey, statusId) {
  const dateValue = currentProject[dateKey];
  const statusEl = document.getElementById(statusId);
  const inputEl = document.getElementById(dateKey);
  const days = daysFromToday(dateValue);

  inputEl.classList.remove('timeline-input-overdue');
  statusEl.classList.remove('overdue');

  if (!dateValue) {
    statusEl.textContent = 'Not set';
    return;
  }

  if (days === 0) {
    statusEl.textContent = 'Today';
  } else if (days > 0) {
    statusEl.textContent = `${days} day${days === 1 ? '' : 's'} remaining`;
  } else {
    statusEl.textContent = `${Math.abs(days)} day${days === -1 ? '' : 's'} overdue`;
    statusEl.classList.add('overdue');
    inputEl.classList.add('timeline-input-overdue');
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
  } else if (manufacturingDate && today > manufacturingDate) {
    setTimelineStep('stepManufacturing', 'active');
  } else {
    setTimelineStep('stepManufacturing', 'active');
  }
}

function renderRecurringSection() {
  const section = document.getElementById('recurringSection');
  const details = document.getElementById('recurringDetails');
  const empty = document.getElementById('recurringEmpty');
  if (!currentProject) {
    section.classList.add('hidden');
    return;
  }

  const eligible = currentProject.stage === 'Order Placed' || currentProject.stage === 'Recurring Order';
  if (!eligible) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  const recurring = currentProject.recurring || null;
  if (!recurring) {
    details.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  details.classList.remove('hidden');

  document.getElementById('recurringFrequency').textContent = recurring.frequency || '-';
  document.getElementById('recurringQuantity').textContent = recurring.quantity || '-';
  document.getElementById('recurringUnitCost').textContent = formatCurrency(recurring.unitCost || 0);
  document.getElementById('recurringTotalValue').textContent = formatCurrency((recurring.quantity || 0) * (recurring.unitCost || 0));
  document.getElementById('recurringNextDue').textContent = formatDisplayDate(recurring.nextDueDate);
  renderRecurringHistory();
}

function renderRecurringHistory() {
  const historyList = document.getElementById('recurringHistoryList');
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
  if (frequency !== 'monthly' && frequency !== 'yearly') {
    alert('Please enter Monthly or Yearly');
    return;
  }

  const quantityInput = prompt('Enter order quantity per cycle', '1');
  const quantity = Number(quantityInput);
  if (!quantity || quantity <= 0) {
    alert('Quantity must be a number greater than zero.');
    return;
  }

  const unitCostInput = prompt('Enter unit cost (R)', String(currentProject.targetCost || 0));
  const unitCost = Number(unitCostInput);
  if (!unitCost || unitCost <= 0) {
    alert('Unit cost must be a number greater than zero.');
    return;
  }

  const nextDueDate = formatDateForInput(addDays(new Date(), frequency === 'monthly' ? 30 : 365));
  currentProject.recurring = {
    frequency,
    quantity,
    unitCost,
    nextDueDate,
    orderHistory: [],
  };
  currentProject.stage = 'Recurring Order';
  renderRecurringSection();
  renderProjects();
  renderSummary();
}

function placeNextOrder() {
  if (!currentProject || !currentProject.recurring) return;
  const recurring = currentProject.recurring;
  const orderDate = formatDateForInput(new Date());
  const orderTotal = recurring.quantity * recurring.unitCost;

  recurring.orderHistory.unshift({
    date: orderDate,
    quantity: recurring.quantity,
    unitCost: recurring.unitCost,
    total: orderTotal,
  });

  const nextDue = addDays(parseDate(recurring.nextDueDate) || new Date(), recurring.frequency === 'monthly' ? 30 : 365);
  recurring.nextDueDate = formatDateForInput(nextDue);
  renderRecurringSection();
  renderProjects();
  renderSummary();
}

function formatDisplayDate(dateString) {
  const date = parseDate(dateString);
  if (!date) return 'Not set';
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function renderInternalProposal(proposalDate, conceptDescription, valueAddDescription, images, totalComponentCost) {
  const componentRows = currentProject.components.map((component) => `
      <tr>
        <td>${component.name}</td>
        <td>${formatCurrency(component.cost)}</td>
      </tr>
    `).join('');
  const sellRows = currentProject.sellOptions.map((price, index) => {
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
  const otherOptions = currentProject.sellOptions.map((price, index) => `
      <div class="client-price-row${index === bestOption.index ? ' best-client-option' : ''}">
        <span>${currentProject.sellLabels?.[index] || `Option ${String.fromCharCode(65 + index)}`}</span>
        <strong>${formatCurrency(price)}</strong>
      </div>
    `).join('');

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

function renderProposal() {
  const today = new Date();
  const proposalDate = today.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  const conceptDescription = currentProject.notes || 'No concept notes added yet.';
  const valueAddDescription = currentProject.valueAdd || 'No value-add description entered.';
  const images = currentProject.images.length
    ? currentProject.images.map((src) => `<div class="proposal-image"><img src="${src}" alt="${currentProject.name} photo" /></div>`).join('')
    : '<div class="proposal-image"><p style="padding:1rem;color:var(--muted);">No images uploaded yet.</p></div>';
  const totalComponentCost = currentProject.components.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  if (currentProposalType === 'client') {
    const bestOptionIndex = currentProject.sellOptions.reduce((bestIdx, price, idx) => {
      const currentMargin = price - totalComponentCost;
      const bestMargin = currentProject.sellOptions[bestIdx] - totalComponentCost;
      return currentMargin > bestMargin ? idx : bestIdx;
    }, 0);
    const bestOption = {
      index: bestOptionIndex,
      label: currentProject.sellLabels?.[bestOptionIndex] || `Option ${String.fromCharCode(65 + bestOptionIndex)}`,
      price: currentProject.sellOptions[bestOptionIndex],
    };
    document.getElementById('proposalContent').innerHTML = renderClientProposal(proposalDate, conceptDescription, valueAddDescription, images, bestOption);
  } else {
    document.getElementById('proposalContent').innerHTML = renderInternalProposal(proposalDate, conceptDescription, valueAddDescription, images, totalComponentCost);
  }
}

function openProposal(type = 'internal') {
  if (!currentProject) return;
  currentProposalType = type;
  document.getElementById('detailView').classList.add('hidden');
  document.getElementById('proposalView').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderProposal();
}

function closeProposal() {
  document.getElementById('proposalView').classList.add('hidden');
  document.getElementById('detailView').classList.remove('hidden');
}

function printProposal() {
  window.print();
}

function setProjectStage(stage) {
  if (!currentProject || !stageOrder.includes(stage)) return;
  currentProject.stage = stage;
  const badge = document.getElementById('detailStageBadge');
  const stageSelect = document.getElementById('detailStageSelect');
  badge.textContent = stage;
  badge.className = `badge clickable ${stageClass[stage] || ''}`;
  stageSelect.value = stage;
  renderRecurringSection();
  renderProjects();
  renderSummary();
  saveProjects();
}

function advanceStage() {
  const currentIndex = stageOrder.indexOf(currentProject.stage);
  if (currentIndex < stageOrder.length - 1) {
    setProjectStage(stageOrder[currentIndex + 1]);
  }
}

function wireDetailEvents() {
  document.getElementById('backToDashboard').addEventListener('click', closeDetailView);
  document.getElementById('prevProjectBtn').addEventListener('click', () => showAdjacentProject('prev'));
  document.getElementById('nextProjectBtn').addEventListener('click', () => showAdjacentProject('next'));
  document.getElementById('addProjectBtn').addEventListener('click', openAddProjectForm);
  document.getElementById('cancelNewProjectBtn').addEventListener('click', closeAddProjectForm);
  document.getElementById('newProjectForm').addEventListener('submit', handleNewProjectSubmit);

  document.getElementById('generateProposalBtn').addEventListener('click', () => openProposal('internal'));
  document.getElementById('sendClientProposalBtn').addEventListener('click', () => openProposal('client'));
  document.getElementById('backToDetail').addEventListener('click', closeProposal);
  document.getElementById('printProposalBtn').addEventListener('click', printProposal);

  document.getElementById('imageUpload').addEventListener('change', (event) => {
    if (!currentProject) return;
    updateImageFiles(event.target.files);
    event.target.value = '';
  });

  document.getElementById('detailProjectName').addEventListener('input', (event) => {
    if (!currentProject) return;
    currentProject.name = event.target.value;
    document.getElementById('detailProjectMeta').textContent = `${currentProject.number} · ${currentProject.category}`;
    renderProjects();
    saveProjects();
  });

  document.getElementById('conceptNotesInput').addEventListener('input', (event) => {
    if (!currentProject) return;
    currentProject.notes = event.target.value;
    saveProjects();
  });

  document.getElementById('valueAddInput').addEventListener('input', (event) => {
    if (!currentProject) return;
    currentProject.valueAdd = event.target.value;
    saveProjects();
  });

  const detailQty = document.getElementById('detailQuantity');
  if (detailQty) {
    detailQty.addEventListener('input', (event) => {
      if (!currentProject) return;
      currentProject.quantity = Number(event.target.value) || 0;
      renderProjects();
      saveProjects();
    });
  }

  document.getElementById('detailDeadline').addEventListener('change', (event) => {
    if (!currentProject) return;
    currentProject.deadline = event.target.value;
    currentProject.deliveryDate = event.target.value;
    renderTimeline();
    renderProjects();
    renderSummary();
    saveProjects();
  });

  document.getElementById('convertToRecurringBtn').addEventListener('click', () => {
    if (!currentProject) return;
    convertToRecurring();
    saveProjects();
  });
  document.getElementById('placeNextOrderBtn').addEventListener('click', () => {
    if (!currentProject) return;
    placeNextOrder();
    saveProjects();
  });

  document.getElementById('poDate').addEventListener('change', (event) => {
    if (!currentProject) return;
    updateTimelineFromPO(event.target.value);
    renderTimeline();
    renderProjects();
    renderSummary();
    saveProjects();
  });

  document.getElementById('detailStageBadge').addEventListener('click', () => {
    const select = document.getElementById('detailStageSelect');
    select.classList.toggle('hidden');
    if (!select.classList.contains('hidden')) {
      select.focus();
    }
  });

  document.getElementById('detailStageSelect').addEventListener('change', (event) => {
    setProjectStage(event.target.value);
    event.target.classList.add('hidden');
  });

  document.getElementById('detailStageSelect').addEventListener('blur', (event) => {
    event.target.classList.add('hidden');
  });

  document.getElementById('manufacturingDeadline').addEventListener('change', (event) => {
    if (!currentProject) return;
    currentProject.manufacturingDeadline = event.target.value;
    renderTimeline();
    saveProjects();
  });

  document.getElementById('shippingDeadline').addEventListener('change', (event) => {
    if (!currentProject) return;
    currentProject.shippingDeadline = event.target.value;
    renderTimeline();
    saveProjects();
  });

  document.getElementById('deliveryDate').addEventListener('change', (event) => {
    if (!currentProject) return;
    currentProject.deliveryDate = event.target.value;
    currentProject.deadline = event.target.value;
    renderTimeline();
    renderProjects();
    renderSummary();
    saveProjects();
  });

  document.getElementById('addComponentRow').addEventListener('click', () => {
    currentProject.components.push({ name: 'New component', cost: 0 });
    renderComponentsTable();
    saveProjects();
  });

  ['sellOption1', 'sellOption2', 'sellOption3'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (event) => {
        if (!currentProject) return;
        const idx = Number(id.replace('sellOption', '')) - 1;
        currentProject.sellOptions = currentProject.sellOptions || [0, 0, 0];
        currentProject.sellOptions[idx] = Number(event.target.value) || 0;
        updateTotals();
        saveProjects();
      });
    }
  });

  ['1', '2', '3'].forEach((num) => {
    document.getElementById(`sellLabel${num}`).addEventListener('input', (event) => {
      if (!currentProject) return;
      currentProject.sellLabels = currentProject.sellLabels || ['Option A', 'Option B', 'Option C'];
      currentProject.sellLabels[num - 1] = event.target.value;
      updateTotals();
      saveProjects();
    });
  });

  // Additional safeguard: ensure all sell inputs/labels are synced to the project
  function syncSellFields() {
    if (!currentProject) return;
    currentProject.sellOptions = currentProject.sellOptions || [0, 0, 0];
    currentProject.sellLabels = currentProject.sellLabels || ['Option A', 'Option B', 'Option C'];
    for (let i = 1; i <= 3; i++) {
      const valEl = document.getElementById(`sellOption${i}`);
      const labelEl = document.getElementById(`sellLabel${i}`);
      if (valEl) currentProject.sellOptions[i - 1] = Number(valEl.value) || 0;
      if (labelEl) currentProject.sellLabels[i - 1] = labelEl.value || currentProject.sellLabels[i - 1];
    }
    updateTotals();
    saveProjects();
  }

  ['sellOption1', 'sellOption2', 'sellOption3', 'sellLabel1', 'sellLabel2', 'sellLabel3'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', syncSellFields);
  });

  document.getElementById('advanceStageBtn').addEventListener('click', () => {
    if (!currentProject) return;
    advanceStage();
    saveProjects();
  });

  const loginForm = document.getElementById('loginForm');
  const logoutBtn = document.getElementById('logoutBtn');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

wireDetailEvents();
ensureAuthenticated();
renderSummary();
renderProjects();
