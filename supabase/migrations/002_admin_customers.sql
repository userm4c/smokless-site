-- Smokless Site — Admin: aprovar/bloquear clientes pelo painel (/admin/)
-- Corre depois de schema.sql. Cola e corre completo no SQL Editor do Supabase.

-- ── Tabela de admins — separada de customers para não misturar semântica ──
create table public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create policy "admin sees own admin row" on public.admins
  for select using (auth.uid() = id);

-- ── Helper usado dentro de outras policies (security definer ignora a RLS de admins ao consultar) ──
create function public.is_admin() returns boolean as $$
  select exists (select 1 from public.admins where id = auth.uid());
$$ language sql security definer stable set search_path = public;

-- ── Admin passa a ver/actualizar todos os clientes ──
-- (a policy "customer selects own row" já existente continua válida — RLS soma policies com OR)
create policy "admin selects all customers" on public.customers
  for select using (public.is_admin());

create policy "admin updates all customers" on public.customers
  for update using (public.is_admin());

-- ── customers precisa do email para a lista do admin (auth.users não é acessível via API pública) ──
alter table public.customers add column email text;
update public.customers c set email = u.email from auth.users u where u.id = c.id;

create or replace function public.handle_new_customer() returns trigger as $$
begin
  insert into public.customers (id, nome, telefone, email)
  values (new.id, new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'telefone', new.email);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ── Passo manual (correr depois de registar a conta de admin pelo site) ──
-- insert into public.admins (id) select id from auth.users where email = 'EMAIL_ESCOLHIDO';
