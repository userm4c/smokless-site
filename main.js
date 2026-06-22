// ── Navbar scroll ──
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── Burger / mobile menu ──
const burger = document.getElementById('burger');
const navLinks = document.getElementById('nav-links');

burger.addEventListener('click', () => {
  const open = burger.classList.toggle('open');
  navLinks.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open);
});

navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    burger.classList.remove('open');
    navLinks.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  });
});

// ── Smooth scroll para âncoras ──
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// ── Auto-descoberta de imagens por pasta ──
function pastaBase(p) {
  return `assets/produtos/${p.pasta}/`;
}

function imgPrincipal(p) {
  return `${pastaBase(p)}principal.png`;
}

function probeImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const EXTS = ['png', 'webp', 'jpg', 'jpeg', 'jfif'];

async function probeAny(base, name) {
  for (const ext of EXTS) {
    const src = await probeImage(`${base}${name}.${ext}`);
    if (src) return src;
  }
  return null;
}

function discoverImages(p) {
  if (!p.pasta) return p.imagem ? [p.imagem] : [];
  const base = pastaBase(p);
  if (p.imagens && p.imagens.length) {
    return p.imagens.map((f) => base + f);
  }
  return [`${base}principal.png`];
}

// ── Produtos ──
async function loadProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const products = window.PRODUCTS || [];
  if (!products.length) {
    grid.innerHTML = '<p style="color:var(--muted)">Sem produtos disponíveis.</p>';
    return;
  }

  grid.innerHTML = products.map((p) => {
    const src = p.pasta ? imgPrincipal(p) : (p.imagem || '');
    return `
      <article class="product-card" data-id="${p.id}" role="button" tabindex="0" aria-label="Ver detalhes de ${p.nome}">
        <div class="product-img-wrap">
          ${src
            ? `<img src="${src}" alt="${p.nome}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=\\'product-img-placeholder\\'>○</span>'" />`
            : '<span class="product-img-placeholder">○</span>'}
        </div>
        <div class="product-body">
          <span class="product-tipo">${p.tipo}</span>
          <h3 class="product-nome">${p.nome}</h3>
          <p class="product-desc">${p.descricao}</p>
          <span class="product-link">→ Ver Detalhes</span>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('.product-card').forEach((card) => {
    const open = () => openModal(products.find((p) => p.id === Number(card.dataset.id)));
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}

// ── Modal ──
const overlay  = document.getElementById('modal-overlay');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

function openModal(p) {
  if (!p) return;

  const allImages = discoverImages(p);
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  modalClose.focus();
  let activeIdx = 0;

  function setActive(idx) {
    activeIdx = idx;
    document.getElementById('modal-main-img').src = allImages[idx];
    modalBody.querySelectorAll('.modal-thumb').forEach((b) =>
      b.classList.toggle('active', Number(b.dataset.idx) === idx)
    );
  }

  modalBody.innerHTML = `
    ${allImages.length ? `
      <div class="modal-gallery">
        <div class="modal-gallery-main">
          <img id="modal-main-img" src="${allImages[0]}" alt="${p.nome}" />
        </div>
        ${allImages.length > 1 ? `
        <div class="modal-gallery-thumbs">
          ${allImages.map((src, i) => `
            <button class="modal-thumb ${i === 0 ? 'active' : ''}" data-idx="${i}" aria-label="Imagem ${i + 1}">
              <img src="${src}" alt="${p.nome} — imagem ${i + 1}" />
            </button>
          `).join('')}
        </div>` : ''}
      </div>
    ` : '<div class="modal-img-placeholder">○</div>'}
    <div class="modal-info">
      <span class="modal-tipo">${p.tipo}</span>
      <h2 class="modal-nome" id="modal-title">${p.nome}</h2>
      <p class="modal-desc">${p.descricao}</p>
      ${p.descricao_detalhada ? `<p class="modal-desc-detail">${p.descricao_detalhada}</p>` : ''}
      ${p.caracteristicas?.length ? `
        <div class="modal-specs">
          <p class="modal-specs-title">Características</p>
          <ul class="modal-specs-list">
            ${p.caracteristicas.map((c) => `<li>${c}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      <div class="modal-cta">
        <a href="https://wa.me/${(window.CONTENT?.contacto?.whatsapp) || '351999999999'}?text=${encodeURIComponent(`Olá! Tenho interesse no produto: ${p.nome}`)}"
           target="_blank" rel="noopener" class="btn btn-green">
          Perguntar pelo WhatsApp
        </a>
      </div>
    </div>
  `;

  modalBody.querySelectorAll('.modal-thumb').forEach((btn) => {
    btn.addEventListener('click', () => setActive(Number(btn.dataset.idx)));
  });
}

function closeModal() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// ── Init ──
// ── Conteúdo do site ──
function loadContent() {
  const c = window.CONTENT;
  if (!c) return;

  const sobreEl = document.getElementById('sobre-paragrafos');
  if (sobreEl && c.sobre?.paragrafos) {
    sobreEl.innerHTML = c.sobre.paragrafos.map(p => `<p>${p}</p>`).join('');
  }

  const statsEl = document.getElementById('sobre-stats');
  if (statsEl && c.sobre?.stats) {
    statsEl.innerHTML = c.sobre.stats.map(s => `
      <div class="stat-card">
        <span class="stat-value">${s.valor}</span>
        <span class="stat-label">${s.label}</span>
      </div>`).join('');
  }

  const contactEl = document.getElementById('contact-grid');
  if (contactEl && c.contacto) {
    const { instagram, whatsapp, morada } = c.contacto;
    const moradaHtml = (morada || '').replace(/\n/g, '<br />');
    contactEl.innerHTML = `
      <a href="https://www.instagram.com/${instagram}" target="_blank" rel="noopener" class="contact-card">
        <div class="contact-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></div>
        <span class="contact-type">Instagram</span>
        <span class="contact-value">@${instagram}</span>
      </a>
      <div class="contact-card">
        <div class="contact-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
        <span class="contact-type">Morada</span>
        <address class="contact-value">${moradaHtml}</address>
      </div>
      <a href="https://wa.me/${whatsapp}" target="_blank" rel="noopener" class="contact-card">
        <div class="contact-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></div>
        <span class="contact-type">WhatsApp</span>
        <span class="contact-value">+${whatsapp}</span>
      </a>`;
  }
}

loadContent();
loadProducts();
