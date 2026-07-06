// Cliente Supabase — chave anon/publishable é segura para expor no frontend, quem protege os dados é o RLS.
const SUPABASE_URL = 'https://wpntduwkcrcjpnabqxye.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yEtqftuMoVjQsQuPzFtW8A_diuxQB5s';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
