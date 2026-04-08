// public/js/app.js — SPA router / state manager

const App = {
  user: null,
  gameState: null,  // { mode, level, sessionId, questions answered, score }

  async init() {
    try {
      App.user = await API.me();
      App.showPage('landing');
    } catch {
      App.showPage('login');
    }
  },

  showPage(name, params = {}) {
    const el = document.getElementById('app');
    el.innerHTML = '';
    switch (name) {
      case 'login':     Pages.login(el);              break;
      case 'register':  Pages.register(el);            break;
      case 'landing':   Pages.landing(el, App.user);   break;
      case 'modeSelect':Pages.modeSelect(el);          break;
      case 'game':      Pages.game(el, params);        break;
      case 'summary':   Pages.summary(el, params);     break;
      default:          Pages.login(el);
    }
  },

  async logout() {
    await API.logout();
    App.user = null;
    App.showPage('login');
  }
};

document.addEventListener('DOMContentLoaded', App.init);
