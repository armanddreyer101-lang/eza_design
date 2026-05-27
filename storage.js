const STORAGE_KEY = 'ezaDesignProjects';
const IMAGE_STORAGE_KEY = 'ezaDesignImages';

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
    products: [
      {
        id: 1,
        name: 'Stand and Plant Kit',
        components: [
          { name: 'Stand', cost: 10 },
          { name: 'Tube', cost: 8 },
          { name: 'Plant', cost: 7 },
        ],
        sellPrice: 0,
      },
    ],
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
    products: [
      {
        id: 1,
        name: 'Paper Cup',
        components: [],
        sellPrice: 0,
      },
    ],
    poDate: '',
    manufacturingDeadline: '',
    shippingDeadline: '',
    deliveryDate: '',
  },
];

function parseStoredData(key) {
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.warn(`Invalid JSON in ${key}:`, error);
    return null;
  }
}

function createProjectCopy(project) {
  const { images, ...rest } = project;
  return { ...rest };
}

function loadAllProjectImages() {
  const imageMap = parseStoredData(IMAGE_STORAGE_KEY);
  return imageMap && typeof imageMap === 'object' ? imageMap : {};
}

export function loadProjects() {
  const stored = parseStoredData(STORAGE_KEY);
  if (!Array.isArray(stored)) {
    const initialProjects = defaultProjects.map((project) => ({ ...project }));
    saveProjects(initialProjects);
    return initialProjects.map((project) => ({ ...project, images: [] }));
  }

  const imageMap = loadAllProjectImages();
  return stored.map((project) => ({ ...project, images: imageMap[project.number] || [] }));
}

export function saveProjects(projects) {
  const projectsToSave = projects.map(createProjectCopy);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projectsToSave));
  } catch (error) {
    console.error('Unable to save project data:', error);
  }
}

export function loadProjectImages(projectNumber) {
  const imageMap = loadAllProjectImages();
  return imageMap[projectNumber] || [];
}

export function saveProjectImages(projectNumber, images) {
  const imageMap = loadAllProjectImages();
  imageMap[projectNumber] = images || [];
  try {
    localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(imageMap));
  } catch (error) {
    console.error('Unable to save project images:', error);
  }
}

export function removeProjectImages(projectNumber) {
  const imageMap = loadAllProjectImages();
  delete imageMap[projectNumber];
  localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(imageMap));
}
