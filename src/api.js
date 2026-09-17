const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7000/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `API request failed: ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}

export const api = {
  health: () => request('/health'),
  categories: () => request('/exams/categories'),
  tests: (category) => request(`/exams/${encodeURIComponent(category)}/tests`),
  test: (testId) => request(`/tests/${testId}`),
  questions: (testId) => request(`/tests/${testId}/questions`),
  submit: (testId, answers, timeTakenSeconds) => request(`/tests/${testId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers, timeTakenSeconds }),
  }),
};

export { API_BASE_URL };
