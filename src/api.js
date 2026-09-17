const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7234/api';
const ACCESS_TOKEN_KEY = 'testprep_access_token';
const REFRESH_TOKEN_KEY = 'testprep_refresh_token';

function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function redirectToLogin() {
  const returnUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const target = returnUrl && returnUrl !== '/auth.html' ? `/auth.html?returnUrl=${encodeURIComponent(returnUrl)}` : '/auth.html';
  window.location.href = target;
}

async function request(path, options = {}, retry = true) {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (response.ok) return response.status === 204 ? null : response.json();
  const body = await response.text();
  const error = new Error(body || `API request failed: ${response.status}`);
  error.status = response.status;
  const isAuthEndpoint = path.startsWith('/auth/');
  if (response.status === 401 && retry && !isAuthEndpoint) {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
        if (refreshResponse.ok) {
          const refreshed = await refreshResponse.json();
          localStorage.setItem(ACCESS_TOKEN_KEY, refreshed.accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, refreshed.refreshToken);
          return request(path, options, false);
        }
      } catch { }
    }
    clearSession();
    redirectToLogin();
  }
  throw error;
}

async function requestTest(path, options = {}) {
  try { return await request(path, options); }
  catch (error) {
    if (error.status === 403) {
      try {
        const payload = JSON.parse(error.message);
        if (payload.requiresPremium) {
          window.location.href = `/premium.html?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          return new Promise(() => {});
        }
      } catch { }
    }
    throw error;
  }
}

export const api = {
  health: () => request('/health'),
  categories: () => request('/exams/categories'),
  tests: c => request(`/exams/${encodeURIComponent(c)}/tests`),
  test: id => requestTest(`/tests/${id}`),
  questions: id => requestTest(`/tests/${id}/questions`),
  submit: (id, answers, timeTakenSeconds) => requestTest(`/tests/${id}/submit`, { method: 'POST', body: JSON.stringify({ answers, timeTakenSeconds }) }),
  attempts: {
    active: () => request('/tests/attempts/active'),
    start: id => requestTest(`/tests/${id}/start`, { method: 'POST' }),
    get: id => request(`/tests/attempts/${id}`),
    saveAnswer: (id, body) => request(`/tests/attempts/${id}/answers`, { method: 'PUT', body: JSON.stringify(body) }),
    submit: (id, answers) => request(`/tests/attempts/${id}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }),
    result: id => request(`/tests/attempts/${id}/result`)
  },
  auth: {
    register: body => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: body => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    google: idToken => request('/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),
    refresh: body => request('/auth/refresh', { method: 'POST', body: JSON.stringify(body) }),
    logout: body => request('/auth/logout', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request('/auth/me'),
    history: () => request('/tests/history')
  },
  users: {
    me: () => request('/users/me'),
    updateMe: body => request('/users/me', { method: 'PUT', body: JSON.stringify(body) }),
    changePassword: body => request('/users/change-password', { method: 'POST', body: JSON.stringify(body) })
  },
  subscriptions: {
    plans: () => request('/subscriptions/plans'),
    me: () => request('/subscriptions/me'),
    history: () => request('/subscriptions/history'),
    payments: () => request('/subscriptions/payments'),
    createOrder: planId => request('/subscriptions/create-order', { method: 'POST', body: JSON.stringify({ planId })),
    verify: body => request('/subscriptions/verify', { method: 'POST', body: JSON.stringify(body) })
  },
  admin: {
    stats: () => request('/admin/stats'),
    categories: () => request('/admin/categories'),
    createCategory: body => request('/admin/categories', { method: 'POST', body: JSON.stringify(body) }),
    updateCategory: (id, body) => request(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    tests: () => request('/admin/tests'),
    createTest: body => request('/admin/tests', { method: 'POST', body: JSON.stringify(body) }),
    updateTest: (id, body) => request(`/admin/tests/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteTest: id => request(`/admin/tests/${id}`, { method: 'DELETE' }),
    questions: id => request(`/admin/tests/${id}/questions`),
    createQuestion: (id, body) => request(`/admin/tests/${id}/questions`, { method: 'POST', body: JSON.stringify(body) }),
    updateQuestion: (id, body) => request(`/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteQuestion: id => request(`/admin/questions/${id}`, { method: 'DELETE' }),
    subscriptionStats: () => request('/admin/subscriptions/stats'),
    subscriptions: (search = '', status = 'All') => request(`/admin/subscriptions?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`),
    payments: (search = '', status = 'All') => request(`/admin/subscriptions/payments?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`),
    plans: () => request('/admin/subscriptions/plans'),
    updatePlan: (id, body) => request(`/admin/subscriptions/plans/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    manualActivate: body => request('/admin/subscriptions/manual-activate', { method: 'POST', body: JSON.stringify(body) }),
    cancelSubscription: id => request(`/admin/subscriptions/${id}/cancel`, { method: 'POST' }),
    users: (search = '', status = 'All') => request(`/admin/users?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`),
    user: id => request(`/admin/users/${id}`),
    setUserStatus: (id, isActive) => request(`/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ isActive }) }),
    auditLogs: (search = '', action = 'All', page = 1, pageSize = 50) => request(`/admin/audit-logs?search=${encodeURIComponent(search)}&action=${encodeURIComponent(action)}&page=${page}&pageSize=${pageSize}`)
  }
};

export { API_BASE_URL, clearSession, redirectToLogin };
