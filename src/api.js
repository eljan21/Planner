async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  config: () => request('GET', '/api/config'),
  me: () => request('GET', '/api/auth/me'),
  googleLogin: (credential) => request('POST', '/api/auth/google', { credential }),
  devLogin: () => request('POST', '/api/auth/dev', {}),
  logout: () => request('POST', '/api/auth/logout', {}),

  tasks: () => request('GET', '/api/tasks'),
  doneTasks: () => request('GET', '/api/tasks/done'),
  create: (task) => request('POST', '/api/tasks', task),
  update: (id, patch) => request('PATCH', `/api/tasks/${id}`, patch),
  remove: (id) => request('DELETE', `/api/tasks/${id}`),
  reorder: (date, ids) => request('PUT', '/api/tasks/reorder', { date, ids }),
  moveOverdue: (today) => request('POST', '/api/tasks/move-overdue', { today }),

  saveSettings: (patch) => request('PUT', '/api/settings', patch),

  recurrences: () => request('GET', '/api/recurrences'),
  makeRecurring: (taskId, rule) => request('POST', '/api/recurrences', { taskId, ...rule }),
  applyRecurring: (ruleId, taskId) => request('POST', `/api/recurrences/${ruleId}/apply`, { taskId }),
  stopRecurring: (ruleId, after) => request('DELETE', `/api/recurrences/${ruleId}?after=${after}`),

  reorderCategories: (ids) => request('PUT', '/api/categories/reorder', { ids }),
  categories: () => request('GET', '/api/categories'),
  createCategory: (c) => request('POST', '/api/categories', c),
  updateCategory: (id, patch) => request('PATCH', `/api/categories/${id}`, patch),
  removeCategory: (id) => request('DELETE', `/api/categories/${id}`),

  notes: () => request('GET', '/api/notes'),
  createNote: (note) => request('POST', '/api/notes', note),
  updateNote: (id, patch) => request('PATCH', `/api/notes/${id}`, patch),
  removeNote: (id) => request('DELETE', `/api/notes/${id}`),
  noteToTask: (id, data) => request('POST', `/api/notes/${id}/task`, data),

  reportUrl: (params) =>
    `/api/reports/export?${new URLSearchParams({ ...params, tz: new Date().getTimezoneOffset() })}`,
};
