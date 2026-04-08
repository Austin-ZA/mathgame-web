// public/js/pages/login.js

const Pages = window.Pages || {};

Pages.login = function(el) {
  el.innerHTML = `
    <div class="page">
      <div class="card">
        <span class="emoji-icon">📐</span>
        <div class="stack-sm title-center" style="margin-bottom:28px">
          <h1 style="text-align:center;font-size:1.7rem">MathGameApp</h1>
          <p class="subtitle" style="text-align:center">Sign in to continue</p>
        </div>
        <div class="stack">
          <div>
            <label for="username">Username</label>
            <input type="text" id="username" placeholder="Enter your username" autocomplete="username" />
          </div>
          <div>
            <label for="password">Password</label>
            <input type="password" id="password" placeholder="Enter your password" autocomplete="current-password" />
          </div>
          <p class="error-msg" id="login-error"></p>
          <button class="btn btn-primary" id="login-btn">Login</button>
          <div class="sep"></div>
          <button class="btn btn-secondary" id="register-link">Create an Account</button>
        </div>
      </div>
    </div>`;

  const usernameEl = el.querySelector('#username');
  const passwordEl = el.querySelector('#password');
  const errorEl    = el.querySelector('#login-error');
  const loginBtn   = el.querySelector('#login-btn');

  async function doLogin() {
    const username = usernameEl.value.trim();
    const password = passwordEl.value;
    if (!username || !password) { errorEl.textContent = 'Please enter both fields.'; return; }
    loginBtn.disabled = true; loginBtn.textContent = 'Signing in…';
    try {
      const { user } = await API.login({ username, password });
      App.user = user;
      App.showPage('landing');
    } catch (e) {
      errorEl.textContent = e.message;
      loginBtn.disabled = false; loginBtn.textContent = 'Login';
      passwordEl.value = '';
    }
  }

  loginBtn.addEventListener('click', doLogin);
  [usernameEl, passwordEl].forEach(i => i.addEventListener('keydown', e => e.key === 'Enter' && doLogin()));
  el.querySelector('#register-link').addEventListener('click', () => App.showPage('register'));
};

window.Pages = Pages;
