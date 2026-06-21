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
    const offset = 72;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// ── Produtos ──
async function loadProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  let products = [];
  try {
    const res = await fetch('products.json');
    products = await res.json();
  } catch {
    grid.innerHTML = '<p style="color:var(--muted)">Não foi possível carregar os produtos.</p>';
    return;
  }

  grid.innerHTML = products.map((p) => `
    <article class="product-card" data-id="${p.id}" role="button" tabindex="0" aria-label="Ver detalhes de ${p.nome}">
      <div class="product-img-wrap">
        ${p.imagem
          ? `<img src="${p.imagem}" alt="${p.nome}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=\\'product-img-placeholder\\'>○</span>'" />`
          : '<span class="product-img-placeholder">○</span>'}
      </div>
      <div class="product-body">
        <span class="product-tipo">${p.tipo}</span>
        <h3 class="product-nome">${p.nome}</h3>
        <p class="product-desc">${p.descricao}</p>
        <span class="product-link">→ Ver Detalhes</span>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.product-card').forEach((card) => {
    const open = () => openModal(products.find((p) => p.id === Number(card.dataset.id)));
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}

// ── Modal ──
const overlay = document.getElementById('modal-overlay');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

function openModal(p) {
  if (!p) return;
  modalBody.innerHTML = `
    ${p.imagem
      ? `<img class="modal-img" src="${p.imagem}" alt="${p.nome}" onerror="this.outerHTML='<div class=\\'modal-img-placeholder\\'>○</div>'" />`
      : '<div class="modal-img-placeholder">○</div>'}
    <div class="modal-info">
      <span class="modal-tipo">${p.tipo}</span>
      <h2 class="modal-nome" id="modal-title">${p.nome}</h2>
      <p class="modal-desc">${p.descricao}</p>
      <div class="modal-cta">
        <a href="https://wa.me/351999999999?text=${encodeURIComponent(`Olá! Tenho interesse no produto: ${p.nome}`)}"
           target="_blank" rel="noopener" class="btn btn-green">
          Perguntar pelo WhatsApp
        </a>
      </div>
    </div>
  `;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  modalClose.focus();
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
