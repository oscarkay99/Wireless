/* ─────────────────────────────────────────────────────────
   Wireless Auth — localStorage layer
   All functions use the same interface Supabase will expose,
   so migration = swap the bodies, not the callers.
───────────────────────────────────────────────────────── */

const KEYS = {
  users:   'wireless_users',
  session: 'wireless_session',
};

function _getUsers() {
  try { return JSON.parse(localStorage.getItem(KEYS.users) || '[]'); }
  catch { return []; }
}
function _saveUsers(u) { localStorage.setItem(KEYS.users, JSON.stringify(u)); }
function _toSession(u) {
  return { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone };
}

/* ── Public API ── */

export function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem(KEYS.session)); }
  catch { return null; }
}

export function isLoggedIn() { return !!getCurrentUser(); }

export function getAllLeads() {
  return _getUsers().map(({ password, ...u }) => u);
}

export function signup({ firstName, lastName, email, phone, password }) {
  const users = _getUsers();
  if (users.find(u => u.email === email.trim().toLowerCase()))
    return { error: 'An account with this email already exists.' };

  const user = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    firstName: firstName.trim(),
    lastName:  lastName.trim(),
    email:     email.trim().toLowerCase(),
    phone:     phone.trim(),
    password:  btoa(password),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  _saveUsers(users);
  localStorage.setItem(KEYS.session, JSON.stringify(_toSession(user)));
  return { user: _toSession(user) };
}

export function login(email, password) {
  const user = _getUsers().find(u => u.email === email.trim().toLowerCase());
  if (!user)                      return { error: 'No account found with this email.' };
  if (user.password !== btoa(password)) return { error: 'Incorrect password.' };
  localStorage.setItem(KEYS.session, JSON.stringify(_toSession(user)));
  return { user: _toSession(user) };
}

export function logout() {
  localStorage.removeItem(KEYS.session);
  window.location.href = './index.html';
}

/* ── Seed default account if it doesn't exist ── */
function _seedDefault() {
  const users = _getUsers();
  if (!users.find(u => u.email === 'admin@admin.com')) {
    users.push({
      id: 'default-admin',
      firstName: 'Admin',
      lastName: 'Wireless',
      email: 'admin@admin.com',
      phone: '(555) 123-4567',
      password: btoa('admin123'),
      createdAt: new Date().toISOString(),
    });
    _saveUsers(users);
  }
}

/* ── DOM layer — called once per page from main.js ── */

export function initAuth() {
  _seedDefault();
  const user = getCurrentUser();
  _desktopHeader(user);
  _mobileMenu(user);
  _signupBanner(user);
  _gateBookingLinks(user);
  _handleContactPage(user);
}

/* Desktop header: replace "Book a Repair" btn with auth UI */
function _desktopHeader(user) {
  const btn = document.getElementById('header-book-btn');
  if (!btn) return;

  if (user) {
    const pill = document.createElement('div');
    pill.style.cssText = 'position:relative;';
    pill.innerHTML = `
      <button id="_hpill" style="display:flex;align-items:center;gap:0.45rem;background:rgba(255,255,255,0.09);border:1px solid rgba(255,255,255,0.13);border-radius:9999px;padding:0.28rem 0.75rem 0.28rem 0.3rem;cursor:pointer;color:#fff;font-size:0.82rem;font-weight:500;line-height:1;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.14)'" onmouseout="this.style.background='rgba(255,255,255,0.09)'">
        <span style="width:26px;height:26px;border-radius:50%;background:oklch(var(--primary-500));display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:700;flex-shrink:0;">${user.firstName[0].toUpperCase()}</span>
        <span>${user.firstName}</span>
        <i class="ph ph-caret-down" style="opacity:0.6;font-size:0.9rem;"></i>
      </button>
      <div id="_hdrop" style="display:none;position:absolute;top:calc(100% + 10px);right:0;background:#0d0d0d;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:0.4rem;min-width:200px;box-shadow:0 8px 32px rgba(0,0,0,0.55);z-index:300;">
        <div style="padding:0.55rem 0.8rem;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:0.3rem;">
          <div style="font-size:0.83rem;font-weight:600;color:#fff;">${user.firstName} ${user.lastName}</div>
          <div style="font-size:0.72rem;color:rgba(255,255,255,0.4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${user.email}</div>
        </div>
        <a href="./contact.html" style="display:flex;align-items:center;gap:0.55rem;padding:0.48rem 0.8rem;color:rgba(255,255,255,0.85);font-size:0.82rem;border-radius:7px;text-decoration:none;" onmouseover="this.style.background='rgba(255,255,255,0.07)'" onmouseout="this.style.background=''">
          <i class="ph ph-wrench" style="color:oklch(var(--primary-500));font-size:0.88rem;"></i>Book a Repair
        </a>
        <button id="_hlogout" style="display:flex;align-items:center;gap:0.55rem;padding:0.48rem 0.8rem;color:rgba(255,255,255,0.85);font-size:0.82rem;border-radius:7px;width:100%;background:none;border:none;cursor:pointer;text-align:left;" onmouseover="this.style.background='rgba(255,255,255,0.07)'" onmouseout="this.style.background=''">
          <i class="ph ph-sign-out" style="color:oklch(var(--primary-500));font-size:0.88rem;"></i>Sign Out
        </button>
      </div>`;
    btn.replaceWith(pill);

    pill.querySelector('#_hpill').addEventListener('click', e => {
      e.stopPropagation();
      const d = pill.querySelector('#_hdrop');
      d.style.display = d.style.display === 'none' ? 'block' : 'none';
    });
    pill.querySelector('#_hlogout').addEventListener('click', logout);
    document.addEventListener('click', () => {
      const d = document.getElementById('_hdrop');
      if (d) d.style.display = 'none';
    });

  } else {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:0.65rem;';
    wrap.innerHTML = `
      <a href="./login.html" style="font-size:0.875rem;font-weight:500;color:rgba(255,255,255,0.75);text-decoration:none;white-space:nowrap;" onmouseover="this.style.color='oklch(var(--primary-500))'" onmouseout="this.style.color='rgba(255,255,255,0.75)'">Login</a>
      <a href="./signup.html" style="background:oklch(var(--primary-500));color:#fff;font-size:0.875rem;font-weight:600;padding:0.5rem 1.25rem;border-radius:0.375rem;text-decoration:none;white-space:nowrap;transition:background 0.15s;" onmouseover="this.style.background='oklch(var(--primary-700))'" onmouseout="this.style.background='oklch(var(--primary-500))'">Sign Up Free</a>`;
    btn.replaceWith(wrap);
  }
}

/* Mobile menu: update the "Book a Repair" CTA */
function _mobileMenu(user) {
  const mBtn = document.getElementById('mobile-book-btn');
  if (!mBtn) return;
  if (user) {
    mBtn.textContent = `Book a Repair`;
    mBtn.href = './contact.html';
  } else {
    mBtn.textContent = 'Create Account — It\'s Free';
    mBtn.href = './signup.html';
  }
}

/* Red banner below header nudging guests to sign up */
function _signupBanner(user) {
  if (user) return;
  const page = (location.pathname.split('/').pop() || 'index.html');
  if (['signup.html', 'login.html', 'admin.html'].includes(page)) return;
  if (sessionStorage.getItem('wl_banner')) return;

  const header = document.querySelector('header');
  if (!header) return;
  const b = document.createElement('div');
  b.id = 'auth-signup-banner';
  b.style.cssText = `background:oklch(var(--primary-500));color:#fff;display:flex;align-items:center;justify-content:center;gap:0.6rem;padding:0.45rem 1rem;font-size:0.8rem;font-weight:500;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,0.12);`;
  b.innerHTML = `
    <i class="ph ph-user-circle" style="flex-shrink:0;font-size:1rem;"></i>
    <span>Create a free account to book, track your repair live &amp; get member deals.</span>
    <a href="./signup.html" style="color:#fff;font-weight:700;text-decoration:underline;white-space:nowrap;flex-shrink:0;">Join Free →</a>
    <button id="_bx" aria-label="Dismiss" style="background:none;border:none;color:#fff;cursor:pointer;margin-left:auto;padding:0 0.2rem;font-size:1.1rem;opacity:0.8;flex-shrink:0;"><i class="ph ph-x"></i></button>`;
  header.appendChild(b);
  b.querySelector('#_bx').onclick = () => {
    b.remove();
    sessionStorage.setItem('wl_banner', '1');
  };
}

/* Intercept booking CTA clicks → send guests to signup */
function _gateBookingLinks(user) {
  if (user) return;
  document.querySelectorAll('a[href*="contact.html"]').forEach(link => {
    if (/book|diagnostic|repair|schedule|get started/i.test(link.textContent)) {
      link.addEventListener('click', e => {
        e.preventDefault();
        sessionStorage.setItem('wl_next', './contact.html');
        location.href = './signup.html?next=booking';
      });
    }
  });
}

/* On contact.html: lock form for guests, pre-fill for members */
function _handleContactPage(user) {
  const page = (location.pathname.split('/').pop() || '');
  if (page !== 'contact.html') return;

  const form = document.getElementById('wireless-book-form');
  if (!form) return;

  const subtitle = document.getElementById('form-subtitle');
  if (subtitle) {
    subtitle.textContent = user
      ? 'Fill in the details below and your repair is booked instantly. No waiting, no back-and-forth.'
      : 'Sign in or create a free account, then book your repair instantly, any time.';
  }

  if (!user) {
    form.style.cssText += ';position:relative;overflow:hidden;border-radius:0.75rem;';
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;inset:0;background:rgba(255,255,255,0.94);backdrop-filter:blur(4px);z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:1.1rem;padding:2.5rem 2rem 2rem;';
    overlay.innerHTML = `
      <div style="width:60px;height:60px;border-radius:50%;background:oklch(var(--primary-500));display:flex;align-items:center;justify-content:center;font-size:1.6rem;color:#fff;"><i class="ph ph-lock"></i></div>
      <div style="text-align:center;max-width:300px;">
        <div style="font-size:1.05rem;font-weight:700;color:#0a0a0a;margin-bottom:0.4rem;">Sign in to book online</div>
        <div style="font-size:0.84rem;color:#555;line-height:1.55;">Create your free Wireless account to access online booking, live repair tracking, and exclusive member pricing.</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.6rem;width:100%;max-width:280px;">
        <a href="./signup.html?next=booking" style="background:oklch(var(--primary-500));color:#fff;font-weight:600;padding:0.75rem 1rem;border-radius:0.375rem;text-decoration:none;text-align:center;font-size:0.9rem;transition:background 0.15s;" onmouseover="this.style.background='oklch(var(--primary-700))'" onmouseout="this.style.background='oklch(var(--primary-500))'">Create Free Account</a>
        <a href="./login.html?next=booking" style="background:#0a0a0a;color:#fff;font-weight:500;padding:0.75rem 1rem;border-radius:0.375rem;text-decoration:none;text-align:center;font-size:0.9rem;transition:background 0.15s;" onmouseover="this.style.background='#222'" onmouseout="this.style.background='#0a0a0a'">I already have an account</a>
      </div>`;
    form.appendChild(overlay);

  } else {
    // Pre-fill known fields
    const byAttr = s => form.querySelector(s);
    const nameF  = byAttr('input[name="name"]') || byAttr('input[placeholder*="name" i]');
    const emailF = byAttr('input[type="email"]');
    const phoneF = byAttr('input[type="tel"]') || byAttr('input[placeholder*="phone" i]');
    if (nameF  && !nameF.value)  nameF.value  = `${user.firstName} ${user.lastName}`;
    if (emailF && !emailF.value) emailF.value = user.email;
    if (phoneF && !phoneF.value) phoneF.value = user.phone;
  }
}
