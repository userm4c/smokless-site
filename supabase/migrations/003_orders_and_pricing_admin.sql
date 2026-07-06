-- Smokless Site — Preços/stock geridos pelo admin + sistema de pedidos
-- Corre depois de 002_admin_customers.sql. Cola e corre completo no SQL Editor do Supabase.

-- ── Admin passa a gerir preços/stock (antes só existia SELECT para clientes approved) ──
create policy "admin manages pricing" on public.product_pricing
  for all using (public.is_admin()) with check (public.is_admin());

-- ── Pedidos ──
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente','confirmado','pronto','entregue','cancelado')),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;

create policy "customer inserts own order" on public.orders
  for insert with check (
    customer_id = auth.uid()
    and exists (select 1 from public.customers c where c.id = auth.uid() and c.status = 'approved')
  );

create policy "customer selects own orders" on public.orders
  for select using (customer_id = auth.uid());

-- única transição que o cliente pode fazer sozinho: cancelar enquanto pendente
create policy "customer cancels own pending order" on public.orders
  for update using (customer_id = auth.uid() and status = 'pendente')
  with check (status = 'cancelado');

create policy "admin selects all orders" on public.orders
  for select using (public.is_admin());

create policy "admin updates all orders" on public.orders
  for update using (public.is_admin());

-- ── Itens do pedido — nome e preço são snapshot (produto pode mudar de preço/ser removido depois) ──
create table public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id integer not null,
  produto_nome text not null,
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10,2)
);
alter table public.order_items enable row level security;

create policy "customer inserts items into own order" on public.order_items
  for insert with check (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));

create policy "customer selects own order items" on public.order_items
  for select using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));

create policy "admin selects all order items" on public.order_items
  for select using (public.is_admin());
