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

function getStoredAuth() {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.warn('Invalid auth session in storage:', error);
    return null;
  }
}

export function authenticate(username, password) {
  return authUsers.find(
    (user) => user.username === username.trim().toLowerCase() && user.password === password,
  );
}

export function saveAuthSession(user) {
  if (!user) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ username: user.username }));
}

export function loadAuthSession() {
  const auth = getStoredAuth();
  if (!auth?.username) return null;
  return authUsers.find((user) => user.username === auth.username) || null;
}

export function isAuthenticated() {
  return Boolean(loadAuthSession());
}

export function redirectToLogin() {
  window.location.href = 'index.html';
}

export function redirectToDashboard() {
  window.location.href = 'dashboard.html';
}

export function redirectIfNotAuthenticated() {
  if (!isAuthenticated()) {
    redirectToLogin();
    return false;
  }
  return true;
}

export function logout() {
  saveAuthSession(null);
  redirectToLogin();
}

export function updateTopbarUserInfo() {
  const user = loadAuthSession();
  const userName = document.getElementById('topbarUserName');
  const userRole = document.getElementById('topbarUserRole');
  const logoutBtn = document.getElementById('logoutBtn');

  if (!user) {
    if (userName) userName.textContent = 'Guest';
    if (userRole) userRole.textContent = 'Please sign in';
    if (logoutBtn) logoutBtn.classList.add('hidden');
    return;
  }

  if (userName) userName.textContent = user.name;
  if (userRole) userRole.textContent = user.role;
  if (logoutBtn) logoutBtn.classList.remove('hidden');
}

export function handleLoginForm(formId, errorId) {
  const form = document.getElementById(formId);
  const errorElement = document.getElementById(errorId);
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const user = authenticate(username, password);

    if (!user) {
      if (errorElement) {
        errorElement.textContent = 'Invalid username or password. Please try again.';
        errorElement.classList.remove('hidden');
      }
      return;
    }

    saveAuthSession(user);
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.classList.add('hidden');
    }
    redirectToDashboard();
  });
}

if (document.getElementById('loginForm')) {
  if (isAuthenticated()) {
    redirectToDashboard();
  } else {
    handleLoginForm('loginForm', 'loginError');
  }
}
