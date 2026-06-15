// public/js/pages/register.js

Pages.register = function(el) {
  el.innerHTML = `
    <div class="page">
      <div class="card">
        <span class="emoji-icon">✏️</span>
        <div class="stack-sm title-center" style="margin-bottom:28px">
          <h1 style="text-align:center;font-size:1.7rem">Create Account</h1>
          <p class="subtitle" style="text-align:center">Join MathGameApp today</p>
        </div>
        <div class="stack">
          <div>
            <label for="reg-fullname">Full Name</label>
            <input type="text" id="reg-fullname" placeholder="Your full name" />
          </div>
          <div>
            <label for="reg-username">Username</label>
            <input type="text" id="reg-username" placeholder="Choose a username" autocomplete="username" />
          </div>
          <div>
            <label for="reg-email">Email (optional)</label>
            <input type="email" id="reg-email" placeholder="your@email.com" />
          </div>
          <div>
            <label for="reg-password">Password</label>
            <input type="password" id="reg-password" placeholder="Choose a password" autocomplete="new-password" />
          </div>
          <div>
            <label for="reg-confirm">Confirm Password</label>
            <input type="password" id="reg-confirm" placeholder="Repeat your password" autocomplete="new-password" />
          </div>
          <p class="error-msg" id="reg-error"></p>
          <p class="success-msg" id="reg-success" style="display:none"></p>
          <button class="btn btn-primary" id="reg-btn">Create Account</button>
          <div class="sep"></div>
          <button class="btn btn-secondary" id="back-login">Back to Login</button>
        </div>
      </div>
    </div>`;

  const errorEl   = el.querySelector('#reg-error');
  const successEl = el.querySelector('#reg-success');
  const regBtn    = el.querySelector('#reg-btn');

  async function doRegister() {
    const fullName = el.querySelector('#reg-fullname').value.trim();
    const username = el.querySelector('#reg-username').value.trim();
    const email    = el.querySelector('#reg-email').value.trim();
    const password = el.querySelector('#reg-password').value;
    const confirm  = el.querySelector('#reg-confirm').value;

    errorEl.textContent = '';
    if (!fullName || !username || !password) { errorEl.textContent = 'Full name, username and password are required.'; return; }
    if (password !== confirm) { errorEl.textContent = 'Passwords do not match.'; return; }
    if (password.length < 4)  { errorEl.textContent = 'Password must be at least 4 characters.'; return; }

    regBtn.disabled = true; regBtn.textContent = 'Creating account…';
    try {
      await API.register({ fullName, username, email, password });
      successEl.textContent = '✅ Account created! Redirecting to login…';
      successEl.style.display = 'block';
      setTimeout(() => App.showPage('login'), 1500);
    } catch (e) {
      errorEl.textContent = e.message;
      regBtn.disabled = false; regBtn.textContent = 'Create Account';
    }
  }

  regBtn.addEventListener('click', doRegister);
  el.querySelector('#back-login').addEventListener('click', () => App.showPage('login'));
};
