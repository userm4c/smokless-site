// ── Carrinho (localStorage) + checkout + Meus Pedidos ──
const CART_KEY = 'smokless_cart';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
  catch { return {}; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(id, qty = 1) {
  const cart = getCart();
  cart[id] = (cart[id] || 0) + qty;
  saveCart(cart);
}

function setCartQty(id, qty) {
  const cart = getCart();
  if (qty <= 0) delete cart[id];
  else cart[id] = qty;
  saveCart(cart);
  renderCartItems();
}

function removeFromCart(id) { setCartQty(id, 0); }

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function cartCount() {
  return Object.values(getCart()).reduce((a, b) => a + b, 0);
}

function findProduct(id) {
  return (window.allProducts || []).find((p) => p.id === Number(id));
}

function cartButtonHtml(p) {
  const pr = (window.PRICING || {})[p.id];
  if (!pr || pr.stock === 'esgotado') return '';
  return `<button type="button" class="btn btn-outline btn-cart-add" onclick="event.stopPropagation(); addToCart(${p.id})">+ Carrinho</button>`;
}

// ── Visibilidade (carrinho/pedidos só para quem vê o catálogo, mesma flag dos preços) ──
function updateCartUI() {
  const cartBtn   = document.getElementById('nav-cart-btn');
  const ordersBtn = document.getElementById('nav-orders-btn');
  const show = !!window.CATALOG_UNLOCKED;
  if (cartBtn) cartBtn.style.display = show ? '' : 'none';
  if (ordersBtn) ordersBtn.style.display = show ? '' : 'none';
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const count = cartCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? '' : 'none';
}

window.addEventListener('smokless:auth-change', updateCartUI);

// ── Drawer do carrinho ──
const cartOverlay = document.getElementById('cart-overlay');
const cartClose    = document.getElementById('cart-close');

function openCart() {
  renderCartItems();
  cartOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  cartOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

function renderCartItems() {
  const cart = getCart();
  const wrap = document.getElementById('cart-items');
  document.getElementById('cart-error').style.display = 'none';
  const ids = Object.keys(cart);

  if (!ids.length) {
    wrap.innerHTML = '<p style="color:var(--muted);font-size:.875rem;">O carrinho está vazio.</p>';
    document.getElementById('cart-total').textContent = '';
    return;
  }

  let total = 0;
  wrap.innerHTML = ids.map((id) => {
    const p = findProduct(id);
    const pr = (window.PRICING || {})[id];
    const preco = pr?.preco != null ? Number(pr.preco) : 0;
    const qty = cart[id];
    total += preco * qty;
    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <span class="cart-item-nome">${p ? p.nome : 'Produto #' + id}</span>
          <span class="cart-item-preco">€${preco.toFixed(2)} cada</span>
        </div>
        <div class="cart-item-qty">
          <button type="button" onclick="setCartQty(${id}, ${qty - 1})">−</button>
          <span>${qty}</span>
          <button type="button" onclick="setCartQty(${id}, ${qty + 1})">+</button>
        </div>
        <button type="button" class="cart-item-remove" onclick="removeFromCart(${id})" aria-label="Remover">×</button>
      </div>`;
  }).join('');

  document.getElementById('cart-total').textContent = `Total: €${total.toFixed(2)}`;
}

async function checkout() {
  const cart = getCart();
  const ids = Object.keys(cart);
  const errEl = document.getElementById('cart-error');
  errEl.style.display = 'none';
  if (!ids.length) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    errEl.textContent = 'Precisas de estar autenticado para finalizar o pedido.';
    errEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('cart-checkout-btn');
  btn.disabled = true;
  btn.textContent = 'A enviar...';

  const notas = document.getElementById('cart-notas').value.trim();

  const { data: order, error: orderErr } = await supabaseClient
    .from('orders')
    .insert({ customer_id: session.user.id, notas: notas || null })
    .select()
    .single();

  if (orderErr || !order) {
    btn.disabled = false;
    btn.textContent = 'Finalizar Pedido';
    errEl.textContent = 'Não foi possível criar o pedido. Tenta novamente.';
    errEl.style.display = 'block';
    return;
  }

  const items = ids.map((id) => {
    const p = findProduct(id);
    const pr = (window.PRICING || {})[id];
    return {
      order_id: order.id,
      product_id: Number(id),
      produto_nome: p ? p.nome : `Produto #${id}`,
      quantidade: cart[id],
      preco_unitario: pr?.preco ?? null,
    };
  });

  const { error: itemsErr } = await supabaseClient.from('order_items').insert(items);

  btn.disabled = false;
  btn.textContent = 'Finalizar Pedido';

  if (itemsErr) {
    errEl.textContent = 'Pedido criado, mas houve um erro ao guardar os itens. Contacta a loja.';
    errEl.style.display = 'block';
    return;
  }

  clearCart();
  document.getElementById('cart-notas').value = '';
  closeCart();
  alert('Pedido enviado! Podes acompanhar o estado em "Meus Pedidos".');
}

// ── Meus Pedidos ──
const ordersOverlay = document.getElementById('orders-overlay');
const ordersClose   = document.getElementById('orders-close');

function statusLabel(status) {
  return {
    pendente: 'Pendente', confirmado: 'Confirmado', pronto: 'Pronto para levantamento',
    entregue: 'Entregue', cancelado: 'Cancelado',
  }[status] || status;
}

async function openOrders() {
  ordersOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  const wrap = document.getElementById('orders-list');
  wrap.innerHTML = '<p style="color:var(--muted);font-size:.875rem;">A carregar...</p>';

  const { data: orders } = await supabaseClient
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });

  if (!orders || !orders.length) {
    wrap.innerHTML = '<p style="color:var(--muted);font-size:.875rem;">Ainda não tens pedidos.</p>';
    return;
  }

  wrap.innerHTML = orders.map((o) => {
    const total = (o.order_items || []).reduce((sum, it) => sum + (it.preco_unitario || 0) * it.quantidade, 0);
    const itemsHtml = (o.order_items || []).map((it) => `<div class="order-item-line">${it.quantidade}× ${it.produto_nome}</div>`).join('');
    return `
      <div class="order-card">
        <div class="order-card-header">
          <span class="order-status order-status-${o.status}">${statusLabel(o.status)}</span>
          <span class="order-date">${new Date(o.created_at).toLocaleDateString('pt-PT')}</span>
        </div>
        ${itemsHtml}
        ${o.notas ? `<p class="form-hint">Nota: ${o.notas}</p>` : ''}
        <div class="order-card-footer">
          <span class="order-total">Total: €${total.toFixed(2)}</span>
          ${o.status === 'pendente' ? `<button type="button" class="btn btn-danger btn-sm" onclick="cancelOrder('${o.id}')">Cancelar</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

function closeOrders() {
  ordersOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

async function cancelOrder(id) {
  await supabaseClient.from('orders').update({ status: 'cancelado' }).eq('id', id);
  openOrders();
}

// ── Events ──
document.getElementById('nav-cart-btn').addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', (e) => { if (e.target === cartOverlay) closeCart(); });
document.getElementById('cart-checkout-btn').addEventListener('click', checkout);

document.getElementById('nav-orders-btn').addEventListener('click', openOrders);
ordersClose.addEventListener('click', closeOrders);
ordersOverlay.addEventListener('click', (e) => { if (e.target === ordersOverlay) closeOrders(); });

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (cartOverlay.classList.contains('open')) closeCart();
  if (ordersOverlay.classList.contains('open')) closeOrders();
});

updateCartUI();
