import { loadProjects, saveProjects } from './storage.js';
import { redirectIfNotAuthenticated, updateTopbarUserInfo, logout } from './auth.js';

let projects = [];
let saveTimeout = null;
const SAVE_INDICATOR_DELAY = 1400;

const stageClass = {
  Concept: 'badge--concept',
  'Proposal Sent': 'badge--proposal',
  Samples: 'badge--samples',
  'Order Placed': 'badge--order',
  'Recurring Order': 'badge--recurring',
};

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

function calculateMargin(cost, sell) {
  const totalCost = Number(cost) || 0;
  const totalSell = Number(sell) || 0;
  if (!totalSell) return 0;
  return Math.max(0, Math.round(((totalSell - totalCost) / totalSell) * 100));
}

function getProjectSellPrice(project) {
  return (project.products || []).reduce((sum, p) => sum + Number(p.sellPrice || 0), 0);
}

function getProjectTotalCost(project) {
  return (project.products || []).reduce((sum, p) => {
    return sum + (p.components || []).reduce((s, c) => s + Number(c.cost || 0), 0);
  }, 0);
}

function renderSummary() {
  const activeCount = projects.length;
  const overdueCount = projects.filter((project) => project.overdue).length;
  const pipelineValue = projects.reduce((sum, project) => sum + getProjectSellPrice(project), 0);
  document.getElementById('activeCount').textContent = activeCount;
  document.getElementById('overdueCount').textContent = overdueCount;
  document.getElementById('pipelineValue').textContent = formatCurrency(pipelineValue);
}

function openProject(projectNumber) {
  window.location.href = `project.html?project=${encodeURIComponent(projectNumber)}`;
}

function renderProjects() {
  const rows = document.getElementById('projectRows');
  rows.innerHTML = '';
  projects.forEach((project) => {
    const sellPrice = getProjectSellPrice(project);
    const totalCost = getProjectTotalCost(project);
    const margin = calculateMargin(totalCost, sellPrice);
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
      <td>${formatCurrency(totalCost)}</td>
      <td>${formatCurrency(sellPrice)}</td>
      <td>${margin}%</td>
      <td class="${project.overdue ? 'overdue' : ''}">${project.deadline || '-'}</td>
    `;
    rows.appendChild(row);
  });
}

function calculateNextProjectNumber() {
  const numbers = projects.map((project) => Number(project.number.replace('P-', '')) || 0);
  const nextNumber = Math.max(...numbers, 0) + 1;
  return `P-${String(nextNumber).padStart(3, '0')}`;
}

function openAddProjectForm() {
  document.getElementById('addProjectForm').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeAddProjectForm() {
  document.getElementById('addProjectForm').classList.add('hidden');
  document.getElementById('newProjectForm').reset();
}

async function handleNewProjectSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('newProjectName').value.trim();
  const category = document.getElementById('newProjectCategory').value;
  const targetCost = Number(document.getElementById('newProjectTargetCost').value) || 0;
  const quantity = Number(document.getElementById('newProjectQuantity').value) || 0;
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
    quantity,
    deadline,
    overdue: false,
    notes: '',
    valueAdd: '',
    products: [],
    poDate: '',
    manufacturingDeadline: '',
    shippingDeadline: '',
    deliveryDate: '',
    images: [],
  };
  projects.push(newProject);
  await saveProjects(projects);
  showSavedIndicator();
  renderProjects();
  renderSummary();
  closeAddProjectForm();
}

function wireDashboardEvents() {
  document.getElementById('addProjectBtn').addEventListener('click', openAddProjectForm);
  document.getElementById('cancelNewProjectBtn').addEventListener('click', closeAddProjectForm);
  document.getElementById('newProjectForm').addEventListener('submit', handleNewProjectSubmit);
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

async function initDashboard() {
  if (!redirectIfNotAuthenticated()) return;
  updateTopbarUserInfo();
  projects = await loadProjects();
  renderSummary();
  renderProjects();
  wireDashboardEvents();
}

initDashboard();
