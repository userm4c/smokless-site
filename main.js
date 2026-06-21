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

const EXTS = ['png', 'webp', 'jpg', 'jpeg'];

async function probeAny(base, name) {
  for (const ext of EXTS) {
    const src = await probeImage(`${base}${name}.${ext}`);
    if (src) return src;
  }
  return null;
}

async function discoverImages(p) {
  if (!p.pasta) return p.imagem ? [p.imagem] : [];
  const base = pastaBase(p);
  const extras = (await Promise.all(
    Array.from({ length: 9 }, (_, i) => probeAny(base, i + 1))
  )).filter(Boolean);
  if (extras.length) return extras;
  const principal = await probeAny(base, 'principal');
  return [principal].filter(Boolean);
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

async function openModal(p) {
  if (!p) return;

  // Mostrar modal imediatamente com loader
  modalBody.innerHTML = `<div class="modal-loading">A carregar...</div>`;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  modalClose.focus();

  const allImages = await discoverImages(p);
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
        <a href="https://wa.me/351999999999?text=${encodeURIComponent(`Olá! Tenho interesse no produto: ${p.nome}`)}"
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
loadProducts();
