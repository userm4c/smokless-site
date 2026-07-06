# Supabase — Fase 2 (fundação)

Auth de clientes + preços/stock protegidos por RLS. Site continua estático, sem build step — Supabase entra via CDN (`@supabase/supabase-js@2`).

## O que existe

| Ficheiro | Função |
|---|---|
| `schema.sql` | Tabelas `customers` e `product_pricing`, RLS, trigger de auto-criação de perfil, seed dos 17 produtos |
| `migrations/002_admin_customers.sql` | Tabela `admins` + `is_admin()` + policies de admin sobre `customers` + coluna `email` |
| `../supabase-client.js` | Inicializa o cliente Supabase (URL + anon key — seguros para expor no frontend, o RLS é quem protege) |
| `../auth.js` | Registo, login, logout, gate de aprovação, busca de preços para clientes aprovados |
| `../admin/index.html` (aba **Clientes**) | Login Supabase do admin + lista de clientes + Aprovar/Bloquear |

## Modelo de dados

- **`customers`** — 1:1 com `auth.users`. Criada automaticamente por trigger no signup (`nome`/`telefone`/`email`). `status`: `pending` (default) → `approved` → ou `blocked`.
- **`product_pricing`** — 1 linha por produto (`product_id` corresponde ao `id` em `products.js`). Só clientes com `status = approved` conseguem ler (`SELECT`), via RLS. **Preço/stock nunca vivem em `products.js`** — esse ficheiro é público, protegê-lo no frontend não protegeria nada.
- **`admins`** — `id` referencia `auth.users`; não tem relação com `customers` (uma conta pode ser só admin, só cliente, ou as duas coisas). `is_admin()` é uma função `security definer` usada dentro de outras policies para liberar acesso total a quem estiver nesta tabela.

## Setup manual (feito uma vez, no painel Supabase)

1. **SQL Editor** → colar e correr `schema.sql`, depois `migrations/002_admin_customers.sql`, na ordem.
2. **Authentication → Providers** → confirmar Email/Password activo.
3. **Authentication → URL Configuration** → Site URL = `https://userm4c.github.io/smokless-site/` (necessário para o link de "esqueci a senha").
4. **Authentication → Settings** → "Confirm email" desactivado — a aprovação manual do admin já é o gate real; exigir confirmação de email por cima seria fricção dupla.
5. **Promover uma conta a admin** (depois de essa conta se registar normalmente pelo site): SQL Editor →
   ```sql
   insert into public.admins (id) select id from auth.users where email = 'EMAIL_ESCOLHIDO';
   ```
   Essa conta passa a poder entrar na aba **Clientes** do `/admin/` com o mesmo email/senha do registo no site.

## Como aprovar/bloquear um cliente

Painel `/admin/` → aba **Clientes** → login com a conta admin → botões **Aprovar** / **Bloquear** por linha. (Alternativa manual: Table Editor → `customers` → editar `status` directamente.)

## Como definir preços

Table Editor → `product_pricing` → editar `preco` (numeric) e `stock` (`disponível` | `esgotado` | `encomenda`) por `product_id`. A UI de admin para isto também entra numa próxima sessão — por agora os preços ficam `null` ("Preço a definir") até serem preenchidos aqui.

## Verificado (2026-07-06)

Fluxo completo testado via API REST (mesmos endpoints que `auth.js` chama):
registo → trigger cria `customers` com `status=pending` → `product_pricing` vazio (RLS bloqueia) → aprovação manual → `product_pricing` retorna as 17 linhas → logout/anónimo volta a ver tudo vazio.

## Próxima sessão (Fase 2, continuação)

Carrinho + checkout, histórico de pedidos do cliente, área de admin para gerir clientes/pedidos, notificações por email. Ver `Vault\Projetos\Smokless\Site Tasks.md`.
