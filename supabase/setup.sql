-- Unistock: restricao de cadastro da area da equipe (Supabase Auth).
-- Execute no SQL Editor do painel do Supabase. O script pode ser repetido sem erro.
-- Este arquivo nao contem e-mails reais; as excecoes sao inseridas pelo painel (ver LEIAME.md).

-- Lista de e-mails de excecao, alem do dominio institucional.
-- RLS ligada e nenhuma politica: a chave anonima nao enxerga nem altera a tabela.
create table if not exists public.acessos_extras (
  email text primary key
);
alter table public.acessos_extras enable row level security;
-- Defesa em profundidade: nenhum direito de tabela para os papeis da API.
revoke all on public.acessos_extras from anon, authenticated;

-- Garante e-mails de excecao sempre em minusculas (idempotente).
alter table public.acessos_extras drop constraint if exists acessos_extras_email_minusculo;
alter table public.acessos_extras add constraint acessos_extras_email_minusculo check (email = lower(email));

-- Rejeita o cadastro quando o e-mail (em minusculas) nao termina em @uniguacu.com.br
-- e nao esta em public.acessos_extras. search_path vazio: todos os nomes sao qualificados.
create or replace function public.validar_email_permitido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(new.email) like '%@uniguacu.com.br'
     or exists (
       select 1
       from public.acessos_extras
       where email = lower(new.email)
     ) then
    return new;
  end if;
  raise exception 'email_nao_permitido';
end;
$$;

-- A funcao roda com os direitos do dono (security definer), entao le acessos_extras
-- mesmo com RLS. Ela nao deve ser chamavel pela API (anon/authenticated); o gatilho em
-- auth.users e disparado pelo papel supabase_auth_admin, que mantem o direito de execucao.
revoke execute on function public.validar_email_permitido() from public, anon, authenticated;
grant execute on function public.validar_email_permitido() to supabase_auth_admin;

drop trigger if exists validar_email_permitido on auth.users;
create trigger validar_email_permitido
  before insert on auth.users
  for each row execute function public.validar_email_permitido();

-- Segundo gatilho: a mesma regra vale quando uma pessoa ja cadastrada troca de e-mail.
-- A clausula "when" e necessaria: o GoTrue atualiza a linha em auth.users a cada login
-- (ex.: last_sign_in_at). Sem ela, usuarios existentes ficariam sem conseguir entrar.
-- Com ela, o gatilho dispara so quando o e-mail realmente muda.
drop trigger if exists validar_email_permitido_update on auth.users;
create trigger validar_email_permitido_update
  before update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.validar_email_permitido();
