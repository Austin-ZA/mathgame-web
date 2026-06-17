// public/js/pages/login.js

const Pages = window.Pages || {};

Pages.login = function(el) {
  el.innerHTML = `
    <div class="page">
      <div class="card">
        <span class="app-logo"></span>
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
          <p style="text-align:center;margin:10px 0">
            <a href="#" id="forgot-link" style="color:var(--primary-light);text-decoration:none">Forgot password?</a>
          </p>
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
      App.routeByRole();
    } catch (e) {
      errorEl.textContent = e.message;
      loginBtn.disabled = false; loginBtn.textContent = 'Login';
      passwordEl.value = '';
    }
  }

  loginBtn.addEventListener('click', doLogin);
  [usernameEl, passwordEl].forEach(i => i.addEventListener('keydown', e => e.key === 'Enter' && doLogin()));
  el.querySelector('#register-link').addEventListener('click', () => App.showPage('register'));
  el.querySelector('#forgot-link').addEventListener('click', e => {
    e.preventDefault();
    App.showPage('forgotPassword');
  });
};

Pages.forgotPassword = function(el) {
  el.innerHTML = `
    <div class="page">
      <div class="card">
        <span class="app-logo">F</span>
        <div class="stack-sm title-center" style="margin-bottom:28px">
          <h1 style="text-align:center;font-size:1.7rem">Forgot Password</h1>
          <p class="subtitle" style="text-align:center">Reset your password using your account details.</p>
        </div>
        <div class="stack">
          <div>
            <label for="fp-username">Username</label>
            <input type="text" id="fp-username" placeholder="Enter your username" autocomplete="username" />
          </div>
          <div>
            <label for="fp-email">Email (if available)</label>
            <input type="email" id="fp-email" placeholder="your@email.com" />
          </div>
          <div>
            <label for="fp-password">New Password</label>
            <input type="password" id="fp-password" placeholder="New password" autocomplete="new-password" />
          </div>
          <div>
            <label for="fp-confirm">Confirm Password</label>
            <input type="password" id="fp-confirm" placeholder="Confirm new password" autocomplete="new-password" />
          </div>
          <p class="error-msg" id="fp-error"></p>
          <p class="success-msg" id="fp-success" style="display:none"></p>
          <button class="btn btn-primary" id="fp-btn">Reset Password</button>
          <div class="sep"></div>
          <button class="btn btn-secondary" id="fp-back">Back to Login</button>
        </div>
      </div>
    </div>`;

  const errorEl   = el.querySelector('#fp-error');
  const successEl = el.querySelector('#fp-success');
  const fpBtn     = el.querySelector('#fp-btn');

  async function doReset() {
    errorEl.textContent = '';
    successEl.style.display = 'none';
    const username = el.querySelector('#fp-username').value.trim();
    const email    = el.querySelector('#fp-email').value.trim();
    const password = el.querySelector('#fp-password').value;
    const confirm  = el.querySelector('#fp-confirm').value;
    if (!username || !password) {
      errorEl.textContent = 'Please provide your username and a new password.';
      return;
    }
    if (password !== confirm) {
      errorEl.textContent = 'Passwords do not match.';
      return;
    }
    if (password.length < 4) {
      errorEl.textContent = 'Password must be at least 4 characters.';
      return;
    }

    fpBtn.disabled = true;
    fpBtn.textContent = 'Resetting…';
    try {
      await API.forgotPassword({ username, email, newPassword: password });
      successEl.textContent = 'Password reset successful. Redirecting to login...';
      successEl.style.display = 'block';
      setTimeout(() => App.showPage('login'), 1400);
    } catch (e) {
      errorEl.textContent = e.message;
      fpBtn.disabled = false;
      fpBtn.textContent = 'Reset Password';
    }
  }

  fpBtn.addEventListener('click', doReset);
  el.querySelector('#fp-back').addEventListener('click', () => App.showPage('login'));
};

window.Pages = Pages;
