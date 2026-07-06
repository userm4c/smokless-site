// ── Navbar scroll ──
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── Burger / mobile menu ──
const burger   = document.getElementById('burger');
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

// ── Smooth scroll ──
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// ── Image helpers ──
function pastaBase(p) { return `assets/produtos/${p.pasta}/`; }
function imgPrincipal(p) { return `${pastaBase(p)}principal.png`; }

function discoverImages(p) {
  if (!p.pasta) return p.imagem ? [p.imagem] : [];
  const base = pastaBase(p);
  if (p.imagens && p.imagens.length) return p.imagens.map((f) => base + f);
  return [`${base}principal.png`];
}

// ── Animações de scroll ──
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('visible'); fadeObserver.unobserve(e.target); }
  });
}, { threshold: 0.07 });

function observeAnimated() {
  document.querySelectorAll('.fade-up:not(.visible)').forEach((el) => fadeObserver.observe(el));
}

// ── Produtos ──
let allProducts  = [];
let activeFilter = 'Todos';

// ── Preço/stock (Fase 2 — só visível para clientes aprovados, ver auth.js) ──
function pricingHtml(p) {
  const pr = (window.PRICING || {})[p.id];
  if (!pr) return '';
  const precoTxt = pr.preco != null ? `€${Number(pr.preco).toFixed(2)}` : 'Preço a definir';
  const stockClass = pr.stock === 'disponível' ? 'stock-ok' : pr.stock === 'esgotado' ? 'stock-out' : 'stock-order';
  return `<div class="product-pricing"><span class="product-preco">${precoTxt}</span><span class="product-stock ${stockClass}">${pr.stock}</span></div>`;
}

function renderProductGrid(products) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  if (!products.length) {
    grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1">Sem produtos nesta categoria.</p>';
    return;
  }
  grid.innerHTML = products.map((p, i) => {
    const src   = p.pasta ? imgPrincipal(p) : (p.imagem || '');
    const delay = Math.min(i, 5) * 70;
    return `
      <article class="product-card fade-up" style="transition-delay:${delay}ms" data-id="${p.id}" role="button" tabindex="0" aria-label="Ver detalhes de ${p.nome}">
        <div class="product-img-wrap">
          ${src
            ? `<img src="${src}" alt="${p.nome}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=\\'product-img-placeholder\\'>○</span>'" />`
            : '<span class="product-img-placeholder">○</span>'}
        </div>
        <div class="product-body">
          <span class="product-tipo">${p.tipo}</span>
          <h3 class="product-nome">${p.nome}</h3>
          <p class="product-desc">${p.descricao}</p>
          ${pricingHtml(p)}
          <span class="product-link">→ Ver Detalhes</span>
        </div>
      </article>`;
  }).join('');
  grid.querySelectorAll('.product-card').forEach((card) => {
    const open = () => openModal(allProducts.find((p) => p.id === Number(card.dataset.id)));
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
  observeAnimated();
}

function renderFilterBar(products) {
  const bar = document.getElementById('filter-bar');
  if (!bar) return;
  const tipos = ['Todos', ...new Set(products.map((p) => p.tipo).filter(Boolean).sort())];
  bar.innerHTML = tipos.map((t) =>
    `<button class="filter-chip ${t === activeFilter ? 'active' : ''}" data-tipo="${t}">${t}</button>`
  ).join('');
  bar.querySelectorAll('.filter-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.tipo;
      bar.querySelectorAll('.filter-chip').forEach((b) => b.classList.toggle('active', b === btn));
      const filtered = activeFilter === 'Todos' ? allProducts : allProducts.filter((p) => p.tipo === activeFilter);
      renderProductGrid(filtered);
    });
  });
}

function renderDestaques(products) {
  const section = document.getElementById('destaques');
  const scroll  = document.getElementById('destaques-scroll');
  if (!section || !scroll || !products.length) return;
  section.style.display = '';

  const cardHtml = products.map((p) => {
    const src = p.pasta ? imgPrincipal(p) : (p.imagem || '');
    return `
      <article class="destaque-card" data-id="${p.id}" role="button" tabindex="0" aria-label="Ver ${p.nome}">
        <div class="destaque-img">
          ${src ? `<img src="${src}" alt="${p.nome}" loading="lazy" onerror="this.style.display='none'" />` : ''}
        </div>
        <div class="destaque-info">
          <span class="product-tipo">${p.tipo}</span>
          <h3 class="destaque-nome">${p.nome}</h3>
          ${pricingHtml(p)}
          <span class="product-link">→ Ver Detalhes</span>
        </div>
      </article>`;
  }).join('');

  const duration = products.length * 5;
  scroll.innerHTML = `<div class="destaques-track" style="animation-duration:${duration}s">${cardHtml}${cardHtml}</div>`;

  scroll.querySelectorAll('.destaque-card').forEach((card) => {
    const p    = products.find((x) => x.id === Number(card.dataset.id));
    if (!p) return;
    const open = () => openModal(p);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}

function loadProducts() {
  allProducts = window.PRODUCTS || [];
  if (!allProducts.length) return;
  renderDestaques(allProducts.filter((p) => p.destaque));
  renderFilterBar(allProducts);
  renderProductGrid(allProducts);
}

// ── Modal ──
const overlay   = document.getElementById('modal-overlay');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

function openModal(p) {
  if (!p) return;
  const allImages = discoverImages(p);
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  modalClose.focus();

  function setActive(idx) {
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
            </button>`).join('')}
        </div>` : ''}
      </div>
    ` : '<div class="modal-img-placeholder">○</div>'}
    <div class="modal-info">
      <span class="modal-tipo">${p.tipo}</span>
      <h2 class="modal-nome" id="modal-title">${p.nome}</h2>
      ${pricingHtml(p)}
      <p class="modal-desc">${p.descricao}</p>
      ${p.descricao_detalhada ? `<p class="modal-desc-detail">${p.descricao_detalhada}</p>` : ''}
      ${p.caracteristicas?.length ? `
        <div class="modal-specs">
          <p class="modal-specs-title">Características</p>
          <ul class="modal-specs-list">
            ${p.caracteristicas.map((c) => `<li>${c}</li>`).join('')}
          </ul>
        </div>` : ''}
      <div class="modal-cta">
        <a href="https://wa.me/${(window.CONTENT?.contacto?.whatsapp) || '351999999999'}?text=${encodeURIComponent(`Olá! Tenho interesse no produto: ${p.nome}`)}"
           target="_blank" rel="noopener" class="btn btn-green">
          Perguntar pelo WhatsApp
        </a>
      </div>
    </div>`;

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

// ── Conteúdo do site ──
function loadContent() {
  const c = window.CONTENT;
  if (!c) return;

  // Sobre
  const sobreEl = document.getElementById('sobre-paragrafos');
  if (sobreEl && c.sobre?.paragrafos) {
    sobreEl.innerHTML = c.sobre.paragrafos.map((p) => `<p>${p}</p>`).join('');
  }
  const statsEl = document.getElementById('sobre-stats');
  if (statsEl && c.sobre?.stats) {
    statsEl.innerHTML = c.sobre.stats.map((s, i) => `
      <div class="stat-card fade-up" style="transition-delay:${i * 80}ms">
        <span class="stat-value">${s.valor}</span>
        <span class="stat-label">${s.label}</span>
      </div>`).join('');
  }

  // Marcas
  const marcasTrack = document.getElementById('marcas-track');
  const marcasStrip = document.getElementById('marcas-strip');
  if (marcasTrack && c.marcas?.length) {
    marcasTrack.innerHTML = c.marcas.map((m) => `<span class="marca-pill">${m}</span>`).join('');
    if (marcasStrip) marcasStrip.style.display = '';
  }

  // Contacto + Horário
  const ct = c.contacto || {};
  const contactEl = document.getElementById('contact-grid');
  if (contactEl) {
    const mapsUrl   = `https://maps.google.com/?q=${encodeURIComponent((ct.morada || '').replace(/\n/g, ', '))}`;
    const moradaHtml = (ct.morada || '').replace(/\n/g, '<br />');
    const h = c.horario;
    contactEl.innerHTML = `
      <a href="https://www.instagram.com/${ct.instagram}" target="_blank" rel="noopener" class="contact-card fade-up">
        <div class="contact-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></div>
        <span class="contact-type">Instagram</span>
        <span class="contact-value">@${ct.instagram}</span>
      </a>
      <a href="${mapsUrl}" target="_blank" rel="noopener" class="contact-card fade-up" style="transition-delay:80ms">
        <div class="contact-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
        <span class="contact-type">Morada</span>
        <address class="contact-value">${moradaHtml}</address>
      </a>
      <a href="https://wa.me/${ct.whatsapp}" target="_blank" rel="noopener" class="contact-card fade-up" style="transition-delay:160ms">
        <div class="contact-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></div>
        <span class="contact-type">WhatsApp</span>
        <span class="contact-value">+${ct.whatsapp}</span>
      </a>
      ${h ? `
      <div class="contact-card fade-up" style="transition-delay:240ms">
        <div class="contact-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <span class="contact-type">Horário</span>
        <span class="contact-value">${h.dias}<br />${Array.isArray(h.horas) ? h.horas.join('<br />') : h.horas}</span>
        ${h.nota ? `<span class="contact-nota">${h.nota}</span>` : ''}
      </div>` : ''}`;
  }

  // WhatsApp FAB
  const fab = document.getElementById('whatsapp-fab');
  if (fab && ct.whatsapp) fab.href = `https://wa.me/${ct.whatsapp}`;

  observeAnimated();
}

loadContent();
loadProducts();

// ── Reage a login/logout/aprovação (ver auth.js) sem recarregar a página ──
window.addEventListener('smokless:auth-change', () => {
  if (!allProducts.length) return;
  renderDestaques(allProducts.filter((p) => p.destaque));
  renderProductGrid(activeFilter === 'Todos' ? allProducts : allProducts.filter((p) => p.tipo === activeFilter));
});
