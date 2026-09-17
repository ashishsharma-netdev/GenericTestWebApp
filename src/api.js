const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7000/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('testprep_access_token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...options
  });
  if (!response.ok) throw new Error((await response.text()) || `API request failed: ${response.status}`);
  return response.status === 204 ? null : response.json();
}

export const api = {
  health: () => request('/health'),
  categories: () => request('/exams/categories'),
  tests: c => request(`/exams/${encodeURIComponent(c)}/tests`),
  test: id => request(`/tests/${id}`),
  questions: id => request(`/tests/${id}/questions`),
  submit: (id, answers, timeTakenSeconds) => request(`/tests/${id}/submit`, { method: 'POST', body: JSON.stringify({ answers, timeTakenSeconds }) }),
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
    createOrder: planId => request('/subscriptions/create-order', { method: 'POST', body: JSON.stringify({ planId }) }),
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
    deleteQuestion: id => request(`/admin/questions/${id}`, { method: 'DELETE' })
  }
};

export { API_BASE_URL };
