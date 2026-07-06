// ── Fase 2 (fundação): auth de clientes + preços/stock protegidos por RLS ──
window.PRICING = {};

const navAccountBtn   = document.getElementById('nav-account-btn');
const authOverlay     = document.getElementById('auth-modal-overlay');
const authModalClose  = document.getElementById('auth-modal-close');
const pendingBanner   = document.getElementById('account-pending-banner');

const authTabs   = document.querySelectorAll('.auth-tab');
const loginForm  = document.getElementById('auth-form-login');
const registoForm = document.getElementById('auth-form-registo');

let currentSession = null;

function openAuthModal(tab = 'login') {
  setAuthTab(tab);
  authOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
  authOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

function setAuthTab(tab) {
  authTabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
  loginForm.classList.toggle('active', tab === 'login');
  registoForm.classList.toggle('active', tab === 'registo');
}

authTabs.forEach((btn) => btn.addEventListener('click', () => setAuthTab(btn.dataset.tab)));
authModalClose.addEventListener('click', closeAuthModal);
authOverlay.addEventListener('click', (e) => { if (e.target === authOverlay) closeAuthModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && authOverlay.classList.contains('open')) closeAuthModal(); });

navAccountBtn.addEventListener('click', async () => {
  if (currentSession) {
    await supabaseClient.auth.signOut();
  } else {
    openAuthModal('login');
  }
});

// ── Login ──
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    errEl.textContent = 'Email ou senha incorrectos.';
    errEl.style.display = 'block';
    return;
  }
  closeAuthModal();
  loginForm.reset();
});

document.getElementById('auth-forgot-btn').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const errEl = document.getElementById('login-error');
  if (!email) {
    errEl.textContent = 'Escreve o teu email primeiro, depois clica em "Esqueci a senha".';
    errEl.style.display = 'block';
    return;
  }
  await supabaseClient.auth.resetPasswordForEmail(email);
  errEl.style.display = 'none';
  alert('Se esse email tiver conta, foi enviado um link para repor a senha.');
});

// ── Registo ──
registoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('registo-nome').value.trim();
  const email = document.getElementById('registo-email').value.trim();
  const telefone = document.getElementById('registo-telefone').value.trim();
  const password = document.getElementById('registo-password').value;
  const errEl = document.getElementById('registo-error');
  const okEl = document.getElementById('registo-success');
  errEl.style.display = 'none';
  okEl.style.display = 'none';

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { nome, telefone } },
  });

  if (error) {
    errEl.textContent = error.message.includes('already registered')
      ? 'Já existe uma conta com este email.'
      : 'Não foi possível criar a conta. Tenta novamente.';
    errEl.style.display = 'block';
    return;
  }

  okEl.style.display = 'block';
  registoForm.reset();
});

// ── Estado de sessão / clientes / preços ──
async function refreshAuthState(session) {
  currentSession = session;

  if (!session) {
    window.PRICING = {};
    navAccountBtn.textContent = 'Entrar';
    pendingBanner.style.display = 'none';
    window.dispatchEvent(new CustomEvent('smokless:auth-change', { detail: { status: null, pricing: window.PRICING } }));
    return;
  }

  const { data: customer } = await supabaseClient
    .from('customers')
    .select('nome, status')
    .eq('id', session.user.id)
    .single();

  const status = customer?.status || 'pending';
  navAccountBtn.textContent = `Sair (${customer?.nome || 'Conta'})`;

  if (status === 'approved') {
    pendingBanner.style.display = 'none';
    const { data: pricing } = await supabaseClient.from('product_pricing').select('*');
    window.PRICING = {};
    (pricing || []).forEach((row) => { window.PRICING[row.product_id] = row; });
  } else {
    window.PRICING = {};
    if (status === 'blocked') {
      pendingBanner.textContent = 'A tua conta foi bloqueada — contacta a loja para mais informação.';
      pendingBanner.style.display = 'block';
    } else {
      pendingBanner.textContent = 'Conta em aprovação — o acesso a preços fica disponível depois da confirmação da loja.';
      pendingBanner.style.display = 'block';
    }
  }

  window.dispatchEvent(new CustomEvent('smokless:auth-change', { detail: { status, pricing: window.PRICING } }));
}

supabaseClient.auth.onAuthStateChange((_event, session) => { refreshAuthState(session); });
supabaseClient.auth.getSession().then(({ data }) => refreshAuthState(data.session));
