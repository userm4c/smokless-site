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

  const products = window.PRODUCTS || [];
  if (!products.length) {
    grid.innerHTML = '<p style="color:var(--muted)">Sem produtos disponíveis.</p>';
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

  const allImages = [p.imagem, ...(p.imagens || [])].filter(Boolean);
  let activeIdx = 0;

  function galleryHTML() {
    if (!allImages.length) return '<div class="modal-img-placeholder">○</div>';
    return `
      <div class="modal-gallery">
        <div class="modal-gallery-main">
          <img id="modal-main-img" src="${allImages[0]}" alt="${p.nome}"
            onerror="this.src=''; this.parentElement.innerHTML='<div class=\\'modal-img-placeholder\\'>○</div>'" />
        </div>
        ${allImages.length > 1 ? `
        <div class="modal-gallery-thumbs">
          ${allImages.map((src, i) => `
            <button class="modal-thumb ${i === 0 ? 'active' : ''}" data-idx="${i}" aria-label="Imagem ${i + 1}">
              <img src="${src}" alt="${p.nome} — imagem ${i + 1}"
                onerror="this.parentElement.style.display='none'" />
            </button>
          `).join('')}
        </div>` : ''}
      </div>
    `;
  }

  modalBody.innerHTML = `
    ${galleryHTML()}
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

  // Galeria — troca de imagem ao clicar na thumbnail
  modalBody.querySelectorAll('.modal-thumb').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeIdx = Number(btn.dataset.idx);
      document.getElementById('modal-main-img').src = allImages[activeIdx];
      modalBody.querySelectorAll('.modal-thumb').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

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
