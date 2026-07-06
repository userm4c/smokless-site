-- Smokless Site — Fase 2 (fundação): auth de clientes + preços/stock protegidos por RLS
-- Corre este ficheiro completo no SQL Editor do painel Supabase (projeto dedicado ao Smokless).

-- ── Perfil do cliente, 1:1 com auth.users ──
create table public.customers (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  telefone text not null,
  status text not null default 'pending' check (status in ('pending','approved','blocked')),
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;

create policy "customer selects own row" on public.customers
  for select using (auth.uid() = id);

-- ── Preço/stock por produto (product_id corresponde ao "id" em products.js) ──
create table public.product_pricing (
  product_id integer primary key,
  preco numeric(10,2),
  stock text not null default 'disponível' check (stock in ('disponível','esgotado','encomenda')),
  preco_visivel boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.product_pricing enable row level security;

create policy "approved customers read pricing" on public.product_pricing
  for select using (
    exists (
      select 1 from public.customers c
      where c.id = auth.uid() and c.status = 'approved'
    )
  );

-- ── Auto-cria a linha em customers quando alguém se regista ──
-- nome/telefone vêm do metadata passado em supabase.auth.signUp({ options: { data: { nome, telefone } } })
create function public.handle_new_customer() returns trigger as $$
begin
  insert into public.customers (id, nome, telefone)
  values (new.id, new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'telefone');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_customer();

-- ── Seed: uma linha por produto existente (17 produtos do catálogo actual) ──
-- Preço fica null até o admin preencher via Table Editor (a UI de admin entra na próxima sessão).
insert into public.product_pricing (product_id) select generate_series(1, 17);
