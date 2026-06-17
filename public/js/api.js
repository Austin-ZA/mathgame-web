// public/js/api.js — thin fetch wrapper for all API calls

const API = {
  async _req(method, url, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.detail || 'Request failed');
    return data;
  },
  get:  (url)       => API._req('GET', url),
  post: (url, body) => API._req('POST', url, body),

  // Auth
  login:    b => API.post('/api/auth/login', b),
  register: b => API.post('/api/auth/register', b),
  logout:   () => API.post('/api/auth/logout'),
  me:       () => API.get('/api/auth/me'),

  // Game
  startSession: b  => API.post('/api/game/start', b),
  getQuestion:  (mode, level) => API.get(`/api/game/question?mode=${mode}&level=${level}`),
  saveAnswer:   b  => API.post('/api/game/answer', b),
  finishSession:b  => API.post('/api/game/finish', b),
  getHistory:   (days = 7) => API.get(`/api/game/history?days=${days}`),
  getSession:    (id) => API.get(`/api/game/session/${id}`),

  // Admin
  adminGetStats:        () => API.get('/api/admin/stats'),
  adminGetRecentUsers:  (n) => API.get(`/api/admin/users/recent?limit=${n}`),
  adminGetAllUsers:     () => API.get('/api/admin/users'),
  adminGetActivityLog:  () => API.get('/api/admin/activity'),
  adminGetAccuracyByMode: () => API.get('/api/admin/accuracy-by-mode'),
  adminGetAllSessions:  (n) => API.get(`/api/admin/sessions?limit=${n}`),
  adminUpdateRole:      (uid, role) => API.post('/api/admin/users/role', { userId: uid, role }),
  adminDeleteUser:      (uid) => API.post('/api/admin/users/delete', { userId: uid }),
  adminGetQuestions:    (mode, level) => API.get(`/api/admin/questions?mode=${mode}&level=${level}`),
  adminAddQuestion:     (b) => API.post('/api/admin/questions', b),
  forgotPassword:      (b) => API.post('/api/auth/forgot-password', b),
  adminDeleteQuestion:  (qid) => API.post('/api/admin/questions/delete', { questionId: qid }),

  // Educator
  eduGetStats:          () => API.get('/api/educator/stats'),
  eduGetStudents:       () => API.get('/api/educator/students'),
  eduGetRecentSessions: (n) => API.get(`/api/educator/sessions?limit=${n}`),

  // AI Coach
  coachGetData:   ()  => API.get('/api/coach/data'),
  coachAnalyse:   (q) => API.post('/api/coach/analyse', { question: q }),
};
