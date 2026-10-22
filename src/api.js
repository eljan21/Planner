import { getLang } from './i18n';

let lastWrite = 0;
/** when this browser last changed something — a background refresh right after could undo an optimistic update */
export const lastWriteAt = () => lastWrite;

async function request(method, url, body) {
  if (method !== 'GET') lastWrite = Date.now();
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch', 'X-Lang': getLang() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.code = (await res.json().catch(() => ({}))).error; // e.g. 'not_found', 'already_friends'
    throw err;
  }
  return res.json();
}

export const api = {
  config: () => request('GET', '/api/config'),
  me: () => request('GET', '/api/auth/me'),
  googleLogin: (credential) => request('POST', '/api/auth/google', { credential }),
  devLogin: (n = 1) => request('POST', '/api/auth/dev', { n }),
  logout: () => request('POST', '/api/auth/logout', {}),
  register: (data) => request('POST', '/api/auth/register', data),
  confirmTotp: (challenge, code) => request('POST', '/api/auth/totp/confirm', { challenge, code }),
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  verifyLogin: (challenge, code) => request('POST', '/api/auth/login/verify', { challenge, code }),
  security: () => request('GET', '/api/auth/security'),
  changePassword: (current, next) => request('POST', '/api/auth/password', { current, next }),
  newRecoveryCodes: (code) => request('POST', '/api/auth/recovery', { code }),
  forgetDevices: () => request('POST', '/api/auth/forget-devices', {}),

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

  profile: () => request('GET', '/api/me/profile'),
  uploadAvatar: (dataUrl) => request('PUT', '/api/me/avatar', { dataUrl }),
  deleteAvatar: () => request('DELETE', '/api/me/avatar'),
  friends: () => request('GET', '/api/friends'),
  addFriend: (query) => request('POST', '/api/friends', { query }),
  acceptFriend: (requestId) => request('POST', `/api/friends/requests/${requestId}/accept`, {}),
  dropRequest: (requestId) => request('DELETE', `/api/friends/requests/${requestId}`),
  removeFriend: (userId) => request('DELETE', `/api/friends/${userId}`),

  invite: (code) => request('GET', `/api/invite/${encodeURIComponent(code)}`),
  acceptInvite: (code) => request('POST', '/api/friends/invite', { code }),
  pushKey: () => request('GET', '/api/push/key'),
  pushSubscribe: (subscription) => request('POST', '/api/push/subscribe', { subscription }),
  pushUnsubscribe: (endpoint) => request('DELETE', '/api/push/subscribe', { endpoint }),
  pushTest: () => request('POST', '/api/push/test', {}),

  telegram: () => request('GET', '/api/telegram'),
  telegramLink: () => request('POST', '/api/telegram/link', {}),
  telegramUnlink: () => request('DELETE', '/api/telegram'),
  telegramTest: () => request('POST', '/api/telegram/test', {}),

  reportUrl: (params) =>
    `/api/reports/export?${new URLSearchParams({ ...params, tz: new Date().getTimezoneOffset(), lang: getLang() })}`,
};
