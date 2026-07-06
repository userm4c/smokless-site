// ── Fase 2 (fundação): auth de clientes + preços/stock protegidos por RLS ──
window.PRICING = {};
window.CATALOG_UNLOCKED = false; // catálogo só aparece para clientes approved (ver refreshAuthState)

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
    await refreshAuthState(null);
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

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    errEl.textContent = 'Email ou senha incorrectos.';
    errEl.style.display = 'block';
    return;
  }
  closeAuthModal();
  loginForm.reset();
  // Não depende só do onAuthStateChange (pode disparar com atraso) — actualiza já com a sessão que voltou do login.
  await refreshAuthState(data.session);
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

  const { data, error } = await supabaseClient.auth.signUp({
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
  // Com "Confirm email" desactivado, o signUp já devolve sessão activa — actualiza o gate (fica "pending").
  if (data.session) await refreshAuthState(data.session);
});

// ── Gate do catálogo (produtos só aparecem para clientes approved) ──
function showGate(text, withCta, variant = 'info') {
  pendingBanner.className = `account-banner ${variant}`;
  pendingBanner.innerHTML = withCta
    ? `<p>${text}</p><button type="button" class="btn btn-green" id="catalog-gate-btn">Entrar / Criar Conta</button>`
    : `<p>${text}</p>`;
  pendingBanner.style.display = 'block';
  const ctaBtn = document.getElementById('catalog-gate-btn');
  if (ctaBtn) ctaBtn.addEventListener('click', () => openAuthModal('registo'));
}

function hideGate() {
  pendingBanner.style.display = 'none';
  pendingBanner.innerHTML = '';
}

// ── Estado de sessão / clientes / preços ──
async function refreshAuthState(session) {
  currentSession = session;

  if (!session) {
    window.PRICING = {};
    window.CATALOG_UNLOCKED = false;
    navAccountBtn.textContent = 'Entrar';
    showGate('Cria uma conta e aguarda a aprovação da loja para ver o catálogo completo.', true);
    window.dispatchEvent(new CustomEvent('smokless:auth-change', { detail: { status: null, pricing: window.PRICING, unlocked: false } }));
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
    window.CATALOG_UNLOCKED = true;
    hideGate();
    const { data: pricing } = await supabaseClient.from('product_pricing').select('*');
    window.PRICING = {};
    (pricing || []).forEach((row) => { window.PRICING[row.product_id] = row; });
  } else {
    window.PRICING = {};
    window.CATALOG_UNLOCKED = false;
    if (status === 'blocked') {
      showGate('A tua conta foi bloqueada — contacta a loja para mais informação.', false, 'blocked');
    } else {
      showGate('Conta em aprovação — o acesso ao catálogo fica disponível depois da confirmação da loja.', false);
    }
  }

  window.dispatchEvent(new CustomEvent('smokless:auth-change', { detail: { status, pricing: window.PRICING, unlocked: window.CATALOG_UNLOCKED } }));
}

supabaseClient.auth.onAuthStateChange((_event, session) => { refreshAuthState(session); });
supabaseClient.auth.getSession().then(({ data }) => refreshAuthState(data.session));
