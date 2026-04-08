// public/js/api.js — thin fetch wrapper for all API calls

const API = {
  async _req(method, url, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
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
  getHistory:   () => API.get('/api/game/history'),
};
