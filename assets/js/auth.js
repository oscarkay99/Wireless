import { isSupabaseConfigured, supabase } from './supabase-client.js';

const DIAGNOSIS_FEE = 200;
let repairSubscription = null;

function _hasConfirmedDiagnosisPayment(repair) {
  return (repair.payments || []).some(payment =>
    payment.type === 'diagnosis_fee' && payment.status === 'paid',
  ) || Boolean(repair.diagnosis_paid_at || repair.diagnosisPaidAt);
}

function _customerVisibleStatus(repair) {
  if (!_hasConfirmedDiagnosisPayment(repair)) return 'received';
  return repair.status;
}

function _statusMeta(status) {
  const map = {
    received: {
      label: 'Booking Received',
      description: 'Your booking is in the queue. Bring the device in for diagnosis payment and intake.',
      tone: 'slate',
    },
    diagnosis_paid: {
      label: 'Diagnosis Paid',
      description: 'Your GHS 200 diagnosis fee has been confirmed. A technician can now begin assessment.',
      tone: 'sky',
    },
    diagnosing: {
      label: 'Diagnosing',
      description: 'Your technician is inspecting the device and preparing a repair report.',
      tone: 'cyan',
    },
    awaiting_approval: {
      label: 'Awaiting Approval',
      description: 'Diagnosis is complete. Review your quote and decide whether to continue with repair.',
      tone: 'amber',
    },
    parts_pending: {
      label: 'Parts Pending',
      description: 'Repair approved. We are sourcing the required part before work resumes.',
      tone: 'amber',
    },
    in_progress: {
      label: 'Repair In Progress',
      description: 'Repair is actively underway. You will receive photo updates as milestones are completed.',
      tone: 'cyan',
    },
    ready: {
      label: 'Ready For Pickup',
      description: 'Your device is ready. Please visit the store to inspect and collect it.',
      tone: 'emerald',
    },
    completed: {
      label: 'Collected',
      description: 'This job has been completed and the device has been collected.',
      tone: 'emerald',
    },
    diagnosis_only_closed: {
      label: 'Diagnosis Completed Only',
      description: 'Diagnosis was completed and paid for, but repair was not continued.',
      tone: 'slate',
    },
    cancelled: {
      label: 'Cancelled',
      description: 'This repair request was cancelled.',
      tone: 'red',
    },
  };

  return map[status] || map.received;
}

function _formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function _formatDateOnly(value) {
  if (!value) return 'Walk in any business day';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function _normalizeUser(authUser, customer) {
  const nameFromMeta = authUser.user_metadata?.full_name || [
    authUser.user_metadata?.first_name,
    authUser.user_metadata?.last_name,
  ].filter(Boolean).join(' ');
  const [firstName = 'Wireless', ...rest] = (nameFromMeta || customer?.name || 'Wireless Customer').split(' ');
  return {
    id: authUser.id,
    firstName,
    lastName: rest.join(' '),
    email: authUser.email || customer?.email || '',
    phone: customer?.phone || authUser.user_metadata?.phone || '',
    fullName: customer?.name || nameFromMeta || firstName,
    customerId: customer?.id || null,
  };
}

function _normalizeRepair(repair, media = []) {
  const visibleStatus = _customerVisibleStatus(repair);
  return {
    ...repair,
    customerVisibleStatus: visibleStatus,
    customerVisibleMeta: _statusMeta(visibleStatus),
    diagnosisFee: repair.diagnosis_fee ?? DIAGNOSIS_FEE,
    diagnosisPaidAt: repair.diagnosis_paid_at ?? null,
    quoteAmount: repair.quote_amount ?? null,
    quoteStatus: repair.quote_status ?? 'not_sent',
    preferredDate: repair.preferred_date ?? '',
    createdAt: repair.created_at,
    payments: Array.isArray(repair.payments) ? repair.payments : [],
    media,
  };
}

async function _requireConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Wireless website Supabase config is missing. Add your project URL and publishable key first.');
  }
}

async function _getCustomerForUser(userId) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('website_auth_user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

async function _getCurrentAuthUser() {
  await _requireConfigured();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user || null;
}

async function _syncCurrentCustomerProfile(authUser, fallback = {}) {
  const existingCustomer = await _getCustomerForUser(authUser.id);
  if (existingCustomer) {
    const patch = {
      name: fallback.customerName || existingCustomer.name,
      email: fallback.customerEmail || authUser.email || existingCustomer.email,
      phone: fallback.customerPhone || authUser.user_metadata?.phone || existingCustomer.phone,
      has_website_account: true,
      source: existingCustomer.source === 'imported' ? 'imported' : 'website',
    };

    await supabase
      .from('customers')
      .update(patch)
      .eq('id', existingCustomer.id);

    return { ...existingCustomer, ...patch };
  }

  const customerId = `WEB-${authUser.id.replace(/-/g, '').toUpperCase()}`;
  const payload = {
    id: customerId,
    name: fallback.customerName || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Wireless Customer',
    phone: fallback.customerPhone || authUser.user_metadata?.phone || '',
    email: fallback.customerEmail || authUser.email || '',
    website_auth_user_id: authUser.id,
    has_website_account: true,
    source: 'website',
    segment: 'New',
    ltv: 'GHS 0',
    orders: 0,
    last_order: '—',
    avg_order: 'GHS 0',
    warranties: 0,
    repairs: 0,
    since: new Date().toLocaleDateString('en-GH', { month: 'short', year: 'numeric' }),
  };

  const { data, error } = await supabase.from('customers').insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function _fetchRepairsForCurrentUser() {
  const authUser = await _getCurrentAuthUser();
  if (!authUser) return [];

  const [{ data: repairs, error: repairsError }, { data: mediaRows, error: mediaError }] = await Promise.all([
    supabase.from('repairs').select('*').order('created_at', { ascending: false }),
    supabase.from('repair_media').select('*').order('created_at', { ascending: false }),
  ]);

  if (repairsError) throw repairsError;
  if (mediaError) throw mediaError;

  const mediaByRepairId = new Map();
  (mediaRows || []).forEach(item => {
    const existing = mediaByRepairId.get(item.repair_id) || [];
    existing.push(item);
    mediaByRepairId.set(item.repair_id, existing);
  });

  return (repairs || []).map(repair =>
    _normalizeRepair(repair, mediaByRepairId.get(repair.id) || []),
  );
}

async function _renderRepairDashboard(user) {
  const gate = document.getElementById('repairs-login-gate');
  const content = document.getElementById('repairs-dashboard');
  const list = document.getElementById('repairs-list');
  const empty = document.getElementById('repairs-empty');
  const customerName = document.getElementById('repairs-customer-name');
  const customerEmail = document.getElementById('repairs-customer-email');

  if (!gate || !content || !list || !empty) return;

  if (!user) {
    gate.style.display = 'block';
    content.style.display = 'none';
    if (repairSubscription) {
      await repairSubscription.unsubscribe();
      repairSubscription = null;
    }
    return;
  }

  gate.style.display = 'none';
  content.style.display = 'block';
  if (customerName) customerName.textContent = user.fullName;
  if (customerEmail) customerEmail.textContent = user.email;

  try {
    const repairs = await _fetchRepairsForCurrentUser();

    if (!repairs.length) {
      empty.style.display = 'block';
      list.innerHTML = '';
    } else {
      empty.style.display = 'none';
      list.innerHTML = repairs.map(repair => {
        const meta = repair.customerVisibleMeta;
        const timeline = [
          ['received', 'Booking Received'],
          ['diagnosis_paid', 'Diagnosis Paid'],
          ['diagnosing', 'Diagnosing'],
          ['awaiting_approval', 'Quote Ready'],
          ['in_progress', 'Repair In Progress'],
          ['ready', 'Ready'],
          ['completed', 'Collected'],
        ];
        const currentIndex = Math.max(
          timeline.findIndex(([status]) => status === repair.customerVisibleStatus),
          0,
        );
        const chips = {
          slate: 'background:rgba(148,163,184,0.12);color:#475569;border:1px solid rgba(148,163,184,0.2);',
          sky: 'background:rgba(14,165,233,0.12);color:#0369a1;border:1px solid rgba(14,165,233,0.2);',
          cyan: 'background:rgba(6,182,212,0.12);color:#0e7490;border:1px solid rgba(6,182,212,0.2);',
          amber: 'background:rgba(245,158,11,0.12);color:#b45309;border:1px solid rgba(245,158,11,0.2);',
          emerald: 'background:rgba(16,185,129,0.12);color:#047857;border:1px solid rgba(16,185,129,0.2);',
          red: 'background:rgba(239,68,68,0.12);color:#b91c1c;border:1px solid rgba(239,68,68,0.2);',
        };

        return `
          <article style="background:#fff;border:1px solid rgba(15,23,42,0.08);border-radius:20px;padding:1.25rem;box-shadow:0 12px 32px rgba(15,23,42,0.05);">
            <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;">
              <div>
                <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;">${repair.id}</div>
                <h3 style="font-size:1.15rem;font-weight:700;color:#0f172a;margin-top:0.3rem;">${repair.device}</h3>
                <p style="font-size:0.88rem;color:#475569;margin-top:0.3rem;">${repair.issue}</p>
              </div>
              <span style="display:inline-flex;align-items:center;padding:0.45rem 0.8rem;border-radius:9999px;font-size:0.78rem;font-weight:700;${chips[meta.tone] || chips.slate}">
                ${meta.label}
              </span>
            </div>
            <p style="font-size:0.86rem;line-height:1.6;color:#475569;margin-top:0.9rem;">${meta.description}</p>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0.75rem;margin-top:1rem;">
              <div style="padding:0.9rem;border-radius:16px;background:#f8fafc;">
                <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;">Diagnosis Fee</div>
                <div style="font-size:1rem;font-weight:700;color:#0f172a;margin-top:0.25rem;">GHS ${repair.diagnosisFee}</div>
                <div style="font-size:0.78rem;color:#64748b;margin-top:0.25rem;">${repair.diagnosisPaidAt ? `Paid ${_formatDate(repair.diagnosisPaidAt)}` : 'Pay at check-in before diagnosis begins'}</div>
              </div>
              <div style="padding:0.9rem;border-radius:16px;background:#f8fafc;">
                <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;">Quote</div>
                <div style="font-size:1rem;font-weight:700;color:#0f172a;margin-top:0.25rem;">${repair.quoteAmount ? `GHS ${repair.quoteAmount}` : 'Pending'}</div>
                <div style="font-size:0.78rem;color:#64748b;margin-top:0.25rem;">${String(repair.quoteStatus || 'not_sent').replace('_', ' ')}</div>
              </div>
              <div style="padding:0.9rem;border-radius:16px;background:#f8fafc;">
                <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;">Preferred Intake</div>
                <div style="font-size:1rem;font-weight:700;color:#0f172a;margin-top:0.25rem;">${_formatDateOnly(repair.preferredDate)}</div>
                <div style="font-size:0.78rem;color:#64748b;margin-top:0.25rem;">Booked ${_formatDate(repair.createdAt)}</div>
              </div>
            </div>
            <div style="margin-top:1rem;">
              <div style="display:flex;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.65rem;">
                ${timeline.map(([status, label], index) => {
                  const active = index <= currentIndex;
                  return `
                    <span style="display:inline-flex;align-items:center;gap:0.45rem;font-size:0.78rem;color:${active ? '#0f172a' : '#94a3b8'};font-weight:${active ? '700' : '600'};">
                      <span style="width:22px;height:22px;border-radius:9999px;display:inline-flex;align-items:center;justify-content:center;background:${active ? '#dc2626' : '#e2e8f0'};color:${active ? '#fff' : '#64748b'};font-size:0.72rem;">${index + 1}</span>
                      ${label}
                    </span>
                  `;
                }).join('')}
              </div>
            </div>
          </article>
        `;
      }).join('');
    }

    if (!repairSubscription) {
      repairSubscription = supabase
        .channel(`wireless-customer-repairs-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'repairs' }, async () => {
          await _renderRepairDashboard(user);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'repair_media' }, async () => {
          await _renderRepairDashboard(user);
        })
        .subscribe();
    }
  } catch (error) {
    empty.style.display = 'block';
    list.innerHTML = `<div style="padding:1rem;border:1px solid rgba(220,38,38,0.15);background:rgba(254,242,242,1);border-radius:16px;color:#991b1b;font-size:0.9rem;">${error.message || 'We could not load your repairs right now.'}</div>`;
  }
}

export async function getCurrentUser() {
  const authUser = await _getCurrentAuthUser();
  if (!authUser) return null;
  const customer = await _getCustomerForUser(authUser.id);
  return _normalizeUser(authUser, customer);
}

export async function isLoggedIn() {
  return Boolean(await getCurrentUser());
}

export async function getAllLeads() {
  await _requireConfigured();
  const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function signup({ firstName, lastName, email, phone, password }) {
  try {
    await _requireConfigured();
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          role: 'customer',
          full_name: fullName,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
        },
      },
    });

    if (error) throw error;

    if (data.user) {
      await _syncCurrentCustomerProfile(data.user, {
        customerName: fullName,
        customerEmail: email.trim().toLowerCase(),
        customerPhone: phone.trim(),
      });
    }

    return {
      user: data.user ? await getCurrentUser() : null,
      needsEmailConfirmation: !data.session,
    };
  } catch (error) {
    return { error: error.message || 'Unable to create account right now.' };
  }
}

export async function login(email, password) {
  try {
    await _requireConfigured();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    return { user: await getCurrentUser() };
  } catch (error) {
    return { error: error.message || 'Unable to sign in right now.' };
  }
}

export async function logout() {
  if (repairSubscription) {
    await repairSubscription.unsubscribe();
    repairSubscription = null;
  }
  await supabase.auth.signOut();
  window.location.href = './index.html';
}

export async function createRepairBooking(payload) {
  try {
    await _requireConfigured();
    const authUser = await _getCurrentAuthUser();
    if (!authUser) return { error: 'Please sign in before booking a repair.' };

    if (!payload.device || !payload.issueType || !payload.customerName || !payload.customerEmail || !payload.customerPhone) {
      return { error: 'Please complete all required booking fields.' };
    }

    const customer = await _syncCurrentCustomerProfile(authUser, payload);
    const now = new Date();
    const repairId = `WR-${Date.now().toString().slice(-8)}`;
    const preferredDate = payload.preferredDate || null;

    const { data, error } = await supabase
      .from('repairs')
      .insert({
        id: repairId,
        customer_id: customer.id,
        customer: payload.customerName.trim(),
        customer_email: payload.customerEmail.trim().toLowerCase(),
        customer_phone: payload.customerPhone.trim(),
        website_auth_user_id: authUser.id,
        device: payload.device.trim(),
        issue: payload.issueType.trim(),
        status: 'received',
        job_type: 'diagnosis_to_repair',
        service_stage: 'intake',
        quote_status: 'not_sent',
        diagnosis_fee: DIAGNOSIS_FEE,
        diagnosis_paid_at: null,
        quote_amount: null,
        technician: 'Unassigned',
        eta: preferredDate ? _formatDateOnly(preferredDate) : 'Pending after diagnosis',
        cost: 'Pending diagnosis',
        started: now.toISOString().split('T')[0],
        warranty: false,
        parts: [],
        notes: payload.message?.trim() ? [payload.message.trim()] : [],
        payments: [],
        preferred_date: preferredDate,
      })
      .select()
      .single();

    if (error) throw error;
    return { repair: _normalizeRepair(data, []) };
  } catch (error) {
    return { error: error.message || 'Unable to create this repair booking right now.' };
  }
}

export async function getCurrentUserRepairs() {
  return _fetchRepairsForCurrentUser();
}

export async function initAuth() {
  let user = null;
  try {
    if (isSupabaseConfigured) {
      user = await getCurrentUser();
    }
  } catch (error) {
    console.warn('Unable to initialise Wireless auth.', error);
  }

  _desktopHeader(user);
  _mobileMenu(user);
  _signupBanner(user);
  _gateBookingLinks(user);
  _handleContactPage(user);
  await _renderRepairDashboard(user);

  if (isSupabaseConfigured) {
    supabase.auth.onAuthStateChange(async () => {
      const refreshedUser = await getCurrentUser();
      _desktopHeader(refreshedUser);
      _mobileMenu(refreshedUser);
      _signupBanner(refreshedUser);
      _gateBookingLinks(refreshedUser);
      _handleContactPage(refreshedUser);
      await _renderRepairDashboard(refreshedUser);
    });
  }
}

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
      <div id="_hdrop" style="display:none;position:absolute;top:calc(100% + 10px);right:0;background:#0d0d0d;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:0.4rem;min-width:220px;box-shadow:0 8px 32px rgba(0,0,0,0.55);z-index:300;">
        <div style="padding:0.55rem 0.8rem;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:0.3rem;">
          <div style="font-size:0.83rem;font-weight:600;color:#fff;">${user.fullName}</div>
          <div style="font-size:0.72rem;color:rgba(255,255,255,0.4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${user.email}</div>
        </div>
        <a href="./my-repairs.html" style="display:flex;align-items:center;gap:0.55rem;padding:0.48rem 0.8rem;color:rgba(255,255,255,0.85);font-size:0.82rem;border-radius:7px;text-decoration:none;" onmouseover="this.style.background='rgba(255,255,255,0.07)'" onmouseout="this.style.background=''">
          <i class="ph ph-broadcast" style="color:oklch(var(--primary-500));font-size:0.88rem;"></i>My Repairs
        </a>
        <a href="./contact.html" style="display:flex;align-items:center;gap:0.55rem;padding:0.48rem 0.8rem;color:rgba(255,255,255,0.85);font-size:0.82rem;border-radius:7px;text-decoration:none;" onmouseover="this.style.background='rgba(255,255,255,0.07)'" onmouseout="this.style.background=''">
          <i class="ph ph-wrench" style="color:oklch(var(--primary-500));font-size:0.88rem;"></i>Book a Repair
        </a>
        <button id="_hlogout" style="display:flex;align-items:center;gap:0.55rem;padding:0.48rem 0.8rem;color:rgba(255,255,255,0.85);font-size:0.82rem;border-radius:7px;width:100%;background:none;border:none;cursor:pointer;text-align:left;" onmouseover="this.style.background='rgba(255,255,255,0.07)'" onmouseout="this.style.background=''">
          <i class="ph ph-sign-out" style="color:oklch(var(--primary-500));font-size:0.88rem;"></i>Sign Out
        </button>
      </div>`;

    btn.replaceWith(pill);

    pill.querySelector('#_hpill').addEventListener('click', event => {
      event.stopPropagation();
      const dropdown = pill.querySelector('#_hdrop');
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    pill.querySelector('#_hlogout').addEventListener('click', () => { void logout(); });
    document.addEventListener('click', () => {
      const dropdown = document.getElementById('_hdrop');
      if (dropdown) dropdown.style.display = 'none';
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

function _mobileMenu(user) {
  const mobileButton = document.getElementById('mobile-book-btn');
  if (!mobileButton) return;

  if (user) {
    mobileButton.textContent = 'My Repairs';
    mobileButton.href = './my-repairs.html';
  } else {
    mobileButton.textContent = 'Create Account — It\'s Free';
    mobileButton.href = './signup.html';
  }
}

function _signupBanner(user) {
  const existing = document.getElementById('auth-signup-banner');
  if (existing && user) existing.remove();
  if (user) return;
  const page = location.pathname.split('/').pop() || 'index.html';
  if (['signup.html', 'login.html', 'admin.html'].includes(page)) return;
  if (sessionStorage.getItem('wl_banner')) return;

  const header = document.querySelector('header');
  if (!header || existing) return;

  const banner = document.createElement('div');
  banner.id = 'auth-signup-banner';
  banner.style.cssText = 'background:oklch(var(--primary-500));color:#fff;display:flex;align-items:center;gap:0.5rem;padding:0.45rem 0.75rem;font-size:0.78rem;font-weight:500;border-top:1px solid rgba(255,255,255,0.12);';
  banner.innerHTML = `
    <i class="ph ph-user-circle" style="flex-shrink:0;font-size:1rem;"></i>
    <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Create a free account to book and track repairs.</span>
    <a href="./signup.html" style="color:#fff;font-weight:700;text-decoration:underline;white-space:nowrap;flex-shrink:0;">Join Free →</a>
    <button id="_bx" aria-label="Dismiss" style="background:none;border:none;color:#fff;cursor:pointer;padding:0 0.15rem;font-size:1rem;opacity:0.8;flex-shrink:0;"><i class="ph ph-x"></i></button>`;
  header.appendChild(banner);
  banner.querySelector('#_bx').onclick = () => {
    banner.remove();
    sessionStorage.setItem('wl_banner', '1');
  };
}

function _gateBookingLinks(user) {
  if (user) return;
  document.querySelectorAll('a[href*="contact.html"]').forEach(link => {
    if (/book|diagnostic|repair|schedule|get started/i.test(link.textContent || '')) {
      link.addEventListener('click', event => {
        event.preventDefault();
        sessionStorage.setItem('wl_next', './contact.html');
        location.href = './signup.html?next=booking';
      }, { once: true });
    }
  });
}

function _handleContactPage(user) {
  const page = location.pathname.split('/').pop() || '';
  if (page !== 'contact.html') return;

  const form = document.getElementById('wireless-book-form');
  if (!form) return;

  const subtitle = document.getElementById('form-subtitle');
  if (subtitle) {
    subtitle.textContent = user
      ? 'Book your intake now. Diagnosis begins only after the GHS 200 diagnostic fee is confirmed at check-in.'
      : 'Sign in or create a free account, then book your repair instantly and track its progress online.';
  }

  const existingOverlay = form.querySelector('[data-auth-overlay="true"]');

  if (!user) {
    form.style.cssText += ';position:relative;overflow:hidden;border-radius:0.75rem;';
    if (existingOverlay) return;
    const overlay = document.createElement('div');
    overlay.dataset.authOverlay = 'true';
    overlay.style.cssText = 'position:absolute;inset:0;background:rgba(255,255,255,0.94);backdrop-filter:blur(4px);z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:1.1rem;padding:2.5rem 2rem 2rem;';
    overlay.innerHTML = `
      <div style="width:60px;height:60px;border-radius:50%;background:oklch(var(--primary-500));display:flex;align-items:center;justify-content:center;font-size:1.6rem;color:#fff;"><i class="ph ph-lock"></i></div>
      <div style="text-align:center;max-width:300px;">
        <div style="font-size:1.05rem;font-weight:700;color:#0a0a0a;margin-bottom:0.4rem;">Sign in to book online</div>
        <div style="font-size:0.84rem;color:#555;line-height:1.55;">Create your free Wireless account to access diagnosis-first booking, repair tracking, and technician photo updates.</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.6rem;width:100%;max-width:280px;">
        <a href="./signup.html?next=booking" style="background:oklch(var(--primary-500));color:#fff;font-weight:600;padding:0.75rem 1rem;border-radius:0.375rem;text-decoration:none;text-align:center;font-size:0.9rem;transition:background 0.15s;" onmouseover="this.style.background='oklch(var(--primary-700))'" onmouseout="this.style.background='oklch(var(--primary-500))'">Create Free Account</a>
        <a href="./login.html?next=booking" style="background:#0a0a0a;color:#fff;font-weight:500;padding:0.75rem 1rem;border-radius:0.375rem;text-decoration:none;text-align:center;font-size:0.9rem;transition:background 0.15s;" onmouseover="this.style.background='#222'" onmouseout="this.style.background='#0a0a0a'">I already have an account</a>
      </div>`;
    form.appendChild(overlay);
    return;
  }

  if (existingOverlay) existingOverlay.remove();

  const bySelector = selector => form.querySelector(selector);
  const nameField = bySelector('input[name="customer_name"]');
  const emailField = bySelector('input[name="customer_email"]');
  const phoneField = bySelector('input[name="customer_phone"]');

  if (nameField && !nameField.value) nameField.value = user.fullName;
  if (emailField && !emailField.value) emailField.value = user.email;
  if (phoneField && !phoneField.value) phoneField.value = user.phone;
}

export { DIAGNOSIS_FEE, _customerVisibleStatus as getCustomerVisibleRepairStatus, _statusMeta as getRepairStatusMeta };
