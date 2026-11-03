-- Unistock: acervo, solicitacoes, retiradas, devolucoes e saidas de brinde.
-- Execute no SQL Editor do Supabase DEPOIS de setup.sql. O script pode ser repetido sem erro.
--
-- Modelo de acesso:
--   * Leitura publica (anon): materiais que nao sao brinde, suas unidades e movimentos
--     (o catalogo do aluno calcula a disponibilidade a partir deles).
--   * Aluno (anon): envia solicitacao e consulta somente as solicitacoes cujo id conhece
--     (o navegador guarda os ids que enviou; ids sao UUID aleatorios).
--   * Equipe (authenticated, nao anonimo): le tudo e registra cada etapa.
--   * Nenhum papel da API escreve direto nas tabelas: toda escrita passa pelas funcoes abaixo,
--     que validam as regras e bloqueiam a linha do material para impedir saldo negativo
--     quando duas pessoas registram ao mesmo tempo.
-- Categorias: equipment e reusable exigem devolucao; consumable e gift nao.

-- ---------------------------------------------------------------- tabelas
create table if not exists public.materiais (
  id text primary key check (length(id) between 1 and 64),
  nome text not null check (length(btrim(nome)) between 1 and 120),
  categoria text not null check (categoria in ('equipment','reusable','consumable','gift')),
  medida text not null check (length(btrim(medida)) between 1 and 30),
  criado_em timestamptz not null default now(),
  criado_por uuid
);

create table if not exists public.unidades (
  codigo text primary key check (codigo ~ '^[A-Z0-9][A-Z0-9-]{0,39}$'),
  material_id text not null references public.materiais(id),
  status text not null default 'available' check (status in ('available','loaned','review'))
);
create index if not exists unidades_material_idx on public.unidades(material_id);

create table if not exists public.solicitacoes (
  id uuid primary key,
  material_id text not null references public.materiais(id),
  quantidade integer not null check (quantidade > 0),
  nome text not null check (length(btrim(nome)) between 1 and 120),
  curso text not null check (length(btrim(curso)) between 1 and 120),
  finalidade text not null check (length(btrim(finalidade)) between 1 and 1000),
  criado_em timestamptz not null default now()
);
create index if not exists solicitacoes_material_idx on public.solicitacoes(material_id);

create table if not exists public.confirmacoes (
  solicitacao_id uuid primary key references public.solicitacoes(id),
  em timestamptz not null,
  registrado_por uuid
);

create table if not exists public.retiradas (
  solicitacao_id uuid primary key references public.solicitacoes(id),
  quantidade integer not null check (quantidade > 0),
  codigos text[] not null default '{}',
  responsavel text not null check (length(btrim(responsavel)) between 1 and 120),
  em timestamptz not null,
  previsao_devolucao timestamptz,
  registrado_por uuid
);

create table if not exists public.devolucoes (
  solicitacao_id uuid primary key references public.retiradas(solicitacao_id),
  em timestamptz not null,
  condicao text not null check (condicao in ('ok','problem')),
  observacoes text not null default '' check (length(observacoes) <= 1000),
  registrado_por uuid
);

create table if not exists public.saidas_brinde (
  id uuid primary key,
  material_id text not null references public.materiais(id),
  quantidade integer not null check (quantidade > 0),
  destinatario text not null check (length(btrim(destinatario)) between 1 and 120),
  responsavel text not null check (length(btrim(responsavel)) between 1 and 120),
  em timestamptz not null,
  observacoes text not null default '' check (length(observacoes) <= 1000),
  registrado_por uuid
);
create index if not exists saidas_brinde_material_idx on public.saidas_brinde(material_id);

-- Livro de movimentos: o saldo de reutilizaveis, consumo e brindes e a soma de delta.
create table if not exists public.movimentos (
  id bigint generated always as identity primary key,
  material_id text not null references public.materiais(id),
  solicitacao_id uuid references public.solicitacoes(id),
  saida_brinde_id uuid references public.saidas_brinde(id),
  tipo text not null check (tipo in ('initial','out','in','gift')),
  delta integer not null,
  criado_em timestamptz not null default now()
);
create index if not exists movimentos_material_idx on public.movimentos(material_id);

-- ---------------------------------------------------------------- permissoes de tabela
alter table public.materiais enable row level security;
alter table public.unidades enable row level security;
alter table public.solicitacoes enable row level security;
alter table public.confirmacoes enable row level security;
alter table public.retiradas enable row level security;
alter table public.devolucoes enable row level security;
alter table public.saidas_brinde enable row level security;
alter table public.movimentos enable row level security;

-- O Supabase concede tudo por padrao em tabelas novas; aqui so fica a leitura.
revoke all on public.materiais, public.unidades, public.solicitacoes, public.confirmacoes,
  public.retiradas, public.devolucoes, public.saidas_brinde, public.movimentos from anon, authenticated;
grant select on public.materiais, public.unidades, public.movimentos to anon, authenticated;
grant select on public.solicitacoes, public.confirmacoes, public.retiradas, public.devolucoes,
  public.saidas_brinde to authenticated;

-- Equipe = sessao autenticada que nao seja login anonimo do Supabase.
create or replace function public.e_equipe()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() is not null
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;
grant execute on function public.e_equipe() to anon, authenticated;

drop policy if exists materiais_leitura on public.materiais;
create policy materiais_leitura on public.materiais for select to anon, authenticated
  using (categoria <> 'gift' or public.e_equipe());

drop policy if exists unidades_leitura on public.unidades;
create policy unidades_leitura on public.unidades for select to anon, authenticated
  using (exists (select 1 from public.materiais m where m.id = material_id));

drop policy if exists movimentos_leitura on public.movimentos;
create policy movimentos_leitura on public.movimentos for select to anon, authenticated
  using (exists (select 1 from public.materiais m where m.id = material_id));

drop policy if exists solicitacoes_leitura on public.solicitacoes;
create policy solicitacoes_leitura on public.solicitacoes for select to authenticated using (public.e_equipe());
drop policy if exists confirmacoes_leitura on public.confirmacoes;
create policy confirmacoes_leitura on public.confirmacoes for select to authenticated using (public.e_equipe());
drop policy if exists retiradas_leitura on public.retiradas;
create policy retiradas_leitura on public.retiradas for select to authenticated using (public.e_equipe());
drop policy if exists devolucoes_leitura on public.devolucoes;
create policy devolucoes_leitura on public.devolucoes for select to authenticated using (public.e_equipe());
drop policy if exists saidas_brinde_leitura on public.saidas_brinde;
create policy saidas_brinde_leitura on public.saidas_brinde for select to authenticated using (public.e_equipe());

-- ---------------------------------------------------------------- funcoes internas
-- Schema fora da API: as funcoes daqui nao podem ser chamadas pelo site.
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

-- Erro de regra: a mensagem vai para a tela e o hint diz qual campo destacar.
create or replace function privado.falhar(campo text, mensagem text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = mensagem, hint = campo;
end;
$$;

create or replace function privado.exigir_equipe()
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.e_equipe() then
    perform privado.falhar('form', 'Entre na área da equipe para continuar.');
  end if;
end;
$$;

create or replace function privado.texto(valor text, campo text, maximo integer default 120)
returns text
language plpgsql
set search_path = ''
as $$
begin
  if valor is null or btrim(valor) = '' then
    perform privado.falhar(campo, 'Preencha este campo.');
  end if;
  if length(btrim(valor)) > maximo then
    perform privado.falhar(campo, format('Use no máximo %s caracteres.', maximo));
  end if;
  return btrim(valor);
end;
$$;

create or replace function privado.disponivel(p_material_id text)
returns integer
language sql
stable
set search_path = ''
as $$
  select case when m.categoria = 'equipment'
    then (select count(*)::integer from public.unidades u where u.material_id = m.id and u.status = 'available')
    else (select coalesce(sum(v.delta), 0)::integer from public.movimentos v where v.material_id = m.id)
  end
  from public.materiais m
  where m.id = p_material_id;
$$;

-- Usada pelo site (cadastrar_material) e pela carga inicial.
create or replace function privado.inserir_material(
  p_id text, p_nome text, p_categoria text, p_medida text, p_quantidade integer, p_codigos text[], p_por uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_id text := privado.texto(p_id, 'id', 64);
  v_nome text := privado.texto(p_nome, 'name', 120);
  v_medida text := privado.texto(p_medida, 'measure', 30);
  v_codigos text[] := coalesce((select array_agg(upper(btrim(c))) from unnest(coalesce(p_codigos, '{}')) c), '{}');
begin
  if exists (select 1 from public.materiais where id = v_id) then
    perform privado.falhar('id', 'Material já cadastrado.');
  end if;
  if p_categoria is null or p_categoria not in ('equipment','reusable','consumable','gift') then
    perform privado.falhar('category', 'Selecione uma categoria válida.');
  end if;
  if p_quantidade is null or p_quantidade < 0 then
    perform privado.falhar('quantity', 'Informe um saldo inteiro igual ou maior que zero.');
  end if;
  if p_categoria = 'equipment' then
    if v_medida <> 'unidade' then
      perform privado.falhar('measure', 'Equipamentos usam a unidade de medida "unidade".');
    end if;
    if cardinality(v_codigos) <> p_quantidade
       or (select count(distinct c) from unnest(v_codigos) c) <> cardinality(v_codigos)
       or exists (select 1 from unnest(v_codigos) c where c !~ '^[A-Z0-9][A-Z0-9-]{0,39}$')
       or exists (select 1 from public.unidades u where u.codigo = any(v_codigos)) then
      perform privado.falhar('codes', 'Informe um código de patrimônio único para cada unidade (letras, números e hífen).');
    end if;
  elsif cardinality(v_codigos) > 0 then
    perform privado.falhar('codes', 'Use códigos somente para equipamentos.');
  end if;

  insert into public.materiais (id, nome, categoria, medida, criado_por)
    values (v_id, v_nome, p_categoria, v_medida, p_por);
  insert into public.movimentos (material_id, tipo, delta) values (v_id, 'initial', p_quantidade);
  insert into public.unidades (codigo, material_id) select c, v_id from unnest(v_codigos) c;
end;
$$;

-- ---------------------------------------------------------------- funcoes da API
create or replace function public.cadastrar_material(
  p_id text, p_nome text, p_categoria text, p_medida text, p_quantidade integer, p_codigos text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_equipe();
  perform privado.inserir_material(p_id, p_nome, p_categoria, p_medida, p_quantidade, p_codigos, auth.uid());
end;
$$;

create or replace function public.solicitar_material(
  p_id uuid, p_material_id text, p_quantidade integer, p_nome text, p_curso text, p_finalidade text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_categoria text;
begin
  if p_id is null then perform privado.falhar('id', 'Solicitação inválida. Recarregue a página.'); end if;
  if exists (select 1 from public.solicitacoes where id = p_id) then
    perform privado.falhar('id', 'Esta solicitação já foi enviada.');
  end if;
  select categoria into v_categoria from public.materiais where id = p_material_id;
  if v_categoria is null then perform privado.falhar('materialId', 'Material não encontrado.'); end if;
  if v_categoria = 'gift' then
    perform privado.falhar('materialId', 'Brindes são entregues diretamente pela equipe e não podem ser solicitados.');
  end if;
  if p_quantidade is null or p_quantidade <= 0 then
    perform privado.falhar('quantity', 'Informe uma quantidade inteira maior que zero.');
  end if;
  if p_quantidade > privado.disponivel(p_material_id) then
    perform privado.falhar('quantity', 'Quantidade maior que a disponível.');
  end if;
  insert into public.solicitacoes (id, material_id, quantidade, nome, curso, finalidade)
    values (p_id, p_material_id, p_quantidade, privado.texto(p_nome, 'name'),
      privado.texto(p_curso, 'course'), privado.texto(p_finalidade, 'purpose', 1000));
end;
$$;

-- O aluno so ve as solicitacoes cujos ids o navegador dele guardou.
create or replace function public.consultar_solicitacoes(p_ids uuid[])
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ids uuid[] := coalesce(p_ids, '{}');
begin
  if cardinality(v_ids) > 200 then v_ids := v_ids[1:200]; end if;
  return jsonb_build_object(
    'solicitacoes', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'material_id', s.material_id,
        'quantidade', s.quantidade, 'nome', s.nome, 'curso', s.curso, 'finalidade', s.finalidade,
        'criado_em', s.criado_em) order by s.criado_em)
      from public.solicitacoes s where s.id = any(v_ids)), '[]'::jsonb),
    'confirmacoes', coalesce((select jsonb_agg(jsonb_build_object('solicitacao_id', c.solicitacao_id, 'em', c.em))
      from public.confirmacoes c where c.solicitacao_id = any(v_ids)), '[]'::jsonb),
    'retiradas', coalesce((select jsonb_agg(jsonb_build_object('solicitacao_id', r.solicitacao_id,
        'quantidade', r.quantidade, 'codigos', r.codigos, 'responsavel', r.responsavel, 'em', r.em,
        'previsao_devolucao', r.previsao_devolucao))
      from public.retiradas r where r.solicitacao_id = any(v_ids)), '[]'::jsonb),
    'devolucoes', coalesce((select jsonb_agg(jsonb_build_object('solicitacao_id', d.solicitacao_id, 'em', d.em,
        'condicao', d.condicao, 'observacoes', d.observacoes))
      from public.devolucoes d where d.solicitacao_id = any(v_ids)), '[]'::jsonb)
  );
end;
$$;

create or replace function public.confirmar_solicitacao(p_solicitacao_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_equipe();
  perform 1 from public.solicitacoes where id = p_solicitacao_id for update;
  if not found then perform privado.falhar('requestId', 'Solicitação não encontrada.'); end if;
  if exists (select 1 from public.confirmacoes where solicitacao_id = p_solicitacao_id) then
    perform privado.falhar('requestId', 'A confirmação desta solicitação já foi registrada.');
  end if;
  insert into public.confirmacoes (solicitacao_id, em, registrado_por) values (p_solicitacao_id, now(), auth.uid());
end;
$$;

create or replace function public.registrar_retirada(
  p_solicitacao_id uuid, p_quantidade integer, p_codigos text[], p_responsavel text,
  p_em timestamptz, p_previsao_devolucao timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_solicitacao public.solicitacoes%rowtype;
  v_categoria text;
  v_confirmada_em timestamptz;
  v_responsavel text;
  v_codigos text[] := coalesce((select array_agg(upper(btrim(c))) from unnest(coalesce(p_codigos, '{}')) c), '{}');
begin
  perform privado.exigir_equipe();
  select * into v_solicitacao from public.solicitacoes where id = p_solicitacao_id for update;
  if not found then perform privado.falhar('requestId', 'Solicitação não encontrada.'); end if;
  -- Bloqueia o material: duas retiradas simultaneas do ultimo item ficam em fila.
  select categoria into v_categoria from public.materiais where id = v_solicitacao.material_id for update;
  select em into v_confirmada_em from public.confirmacoes where solicitacao_id = p_solicitacao_id;
  if v_confirmada_em is null then perform privado.falhar('requestId', 'Aguarde a confirmação antes da retirada.'); end if;
  if exists (select 1 from public.retiradas where solicitacao_id = p_solicitacao_id) then
    perform privado.falhar('requestId', 'A retirada desta solicitação já foi registrada.');
  end if;
  if p_quantidade is null or p_quantidade <= 0 then
    perform privado.falhar('quantity', 'Informe uma quantidade inteira maior que zero.');
  end if;
  if p_quantidade > v_solicitacao.quantidade then
    perform privado.falhar('quantity', 'A entrega não pode superar a quantidade solicitada.');
  end if;
  if p_quantidade > privado.disponivel(v_solicitacao.material_id) then
    perform privado.falhar('quantity', 'Quantidade indisponível. Confira o saldo atual.');
  end if;
  v_responsavel := privado.texto(p_responsavel, 'operator');
  if p_em is null then perform privado.falhar('at', 'Informe uma data e horário válidos.'); end if;
  if p_em < v_confirmada_em then
    perform privado.falhar('at', 'A data e horário não podem ser anteriores à etapa precedente.');
  end if;
  if v_categoria in ('equipment','reusable') then
    if p_previsao_devolucao is null then perform privado.falhar('dueAt', 'Informe uma data e horário válidos.'); end if;
    if p_previsao_devolucao < p_em then
      perform privado.falhar('dueAt', 'A data e horário não podem ser anteriores à etapa precedente.');
    end if;
  elsif p_previsao_devolucao is not null then
    perform privado.falhar('dueAt', 'Materiais sem devolução não têm previsão de devolução.');
  end if;
  if v_categoria = 'equipment' then
    if cardinality(v_codigos) <> p_quantidade
       or (select count(distinct c) from unnest(v_codigos) c) <> cardinality(v_codigos)
       or (select count(*) from public.unidades u where u.codigo = any(v_codigos)
             and u.material_id = v_solicitacao.material_id and u.status = 'available') <> cardinality(v_codigos) then
      perform privado.falhar('codes', 'Selecione um código disponível deste material para cada unidade entregue.');
    end if;
  elsif cardinality(v_codigos) > 0 then
    perform privado.falhar('codes', 'Este material não usa códigos de equipamento.');
  end if;

  insert into public.retiradas (solicitacao_id, quantidade, codigos, responsavel, em, previsao_devolucao, registrado_por)
    values (p_solicitacao_id, p_quantidade, v_codigos, v_responsavel, p_em, p_previsao_devolucao, auth.uid());
  insert into public.movimentos (material_id, solicitacao_id, tipo, delta)
    values (v_solicitacao.material_id, p_solicitacao_id, 'out', -p_quantidade);
  update public.unidades set status = 'loaned' where codigo = any(v_codigos);
end;
$$;

create or replace function public.registrar_devolucao(
  p_solicitacao_id uuid, p_em timestamptz, p_condicao text, p_observacoes text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_solicitacao public.solicitacoes%rowtype;
  v_categoria text;
  v_retirada public.retiradas%rowtype;
  v_observacoes text := btrim(coalesce(p_observacoes, ''));
begin
  perform privado.exigir_equipe();
  select * into v_solicitacao from public.solicitacoes where id = p_solicitacao_id for update;
  if not found then perform privado.falhar('requestId', 'Solicitação não encontrada.'); end if;
  select categoria into v_categoria from public.materiais where id = v_solicitacao.material_id for update;
  if v_categoria not in ('equipment','reusable') then
    perform privado.falhar('requestId', 'Materiais de consumo não exigem devolução.');
  end if;
  select * into v_retirada from public.retiradas where solicitacao_id = p_solicitacao_id;
  if not found then perform privado.falhar('requestId', 'Registre a retirada antes da devolução.'); end if;
  if exists (select 1 from public.devolucoes where solicitacao_id = p_solicitacao_id) then
    perform privado.falhar('requestId', 'A devolução desta solicitação já foi registrada.');
  end if;
  if p_em is null then perform privado.falhar('at', 'Informe uma data e horário válidos.'); end if;
  if p_em < v_retirada.em then
    perform privado.falhar('at', 'A data e horário não podem ser anteriores à etapa precedente.');
  end if;
  if p_condicao is null or p_condicao not in ('ok','problem') then
    perform privado.falhar('condition', 'Informe o estado do material na devolução.');
  end if;
  if p_condicao = 'problem' and v_observacoes = '' then perform privado.falhar('notes', 'Preencha este campo.'); end if;
  if length(v_observacoes) > 1000 then perform privado.falhar('notes', 'Use no máximo 1000 caracteres.'); end if;

  insert into public.devolucoes (solicitacao_id, em, condicao, observacoes, registrado_por)
    values (p_solicitacao_id, p_em, p_condicao, v_observacoes, auth.uid());
  if p_condicao = 'ok' then
    insert into public.movimentos (material_id, solicitacao_id, tipo, delta)
      values (v_solicitacao.material_id, p_solicitacao_id, 'in', v_retirada.quantidade);
  end if;
  update public.unidades set status = case when p_condicao = 'ok' then 'available' else 'review' end
    where codigo = any(v_retirada.codigos);
end;
$$;

create or replace function public.registrar_saida_brinde(
  p_id uuid, p_material_id text, p_quantidade integer, p_destinatario text, p_responsavel text,
  p_em timestamptz, p_observacoes text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_categoria text;
  v_destinatario text;
  v_responsavel text;
  v_observacoes text := btrim(coalesce(p_observacoes, ''));
begin
  perform privado.exigir_equipe();
  if p_id is null then perform privado.falhar('id', 'Registro inválido. Recarregue a página.'); end if;
  if exists (select 1 from public.saidas_brinde where id = p_id) then
    perform privado.falhar('id', 'Esta saída de brinde já foi registrada.');
  end if;
  select categoria into v_categoria from public.materiais where id = p_material_id for update;
  if v_categoria is distinct from 'gift' then perform privado.falhar('materialId', 'Selecione um brinde.'); end if;
  if p_quantidade is null or p_quantidade <= 0 then
    perform privado.falhar('quantity', 'Informe uma quantidade inteira maior que zero.');
  end if;
  if p_quantidade > privado.disponivel(p_material_id) then
    perform privado.falhar('quantity', 'Quantidade maior que a disponível.');
  end if;
  v_destinatario := privado.texto(p_destinatario, 'recipient');
  v_responsavel := privado.texto(p_responsavel, 'operator');
  if p_em is null then perform privado.falhar('at', 'Informe uma data e horário válidos.'); end if;
  if length(v_observacoes) > 1000 then perform privado.falhar('notes', 'Use no máximo 1000 caracteres.'); end if;

  insert into public.saidas_brinde (id, material_id, quantidade, destinatario, responsavel, em, observacoes, registrado_por)
    values (p_id, p_material_id, p_quantidade, v_destinatario, v_responsavel, p_em, v_observacoes, auth.uid());
  insert into public.movimentos (material_id, saida_brinde_id, tipo, delta)
    values (p_material_id, p_id, 'gift', -p_quantidade);
end;
$$;

-- ---------------------------------------------------------------- direitos de execucao
-- O Supabase concede execucao a anon/authenticated por padrao; aqui fica so o necessario.
revoke execute on all functions in schema privado from public, anon, authenticated;

revoke execute on function public.cadastrar_material(text, text, text, text, integer, text[]) from public, anon;
revoke execute on function public.confirmar_solicitacao(uuid) from public, anon;
revoke execute on function public.registrar_retirada(uuid, integer, text[], text, timestamptz, timestamptz) from public, anon;
revoke execute on function public.registrar_devolucao(uuid, timestamptz, text, text) from public, anon;
revoke execute on function public.registrar_saida_brinde(uuid, text, integer, text, text, timestamptz, text) from public, anon;
grant execute on function public.cadastrar_material(text, text, text, text, integer, text[]) to authenticated;
grant execute on function public.confirmar_solicitacao(uuid) to authenticated;
grant execute on function public.registrar_retirada(uuid, integer, text[], text, timestamptz, timestamptz) to authenticated;
grant execute on function public.registrar_devolucao(uuid, timestamptz, text, text) to authenticated;
grant execute on function public.registrar_saida_brinde(uuid, text, integer, text, text, timestamptz, text) to authenticated;

revoke execute on function public.solicitar_material(uuid, text, integer, text, text, text) from public;
revoke execute on function public.consultar_solicitacoes(uuid[]) from public;
grant execute on function public.solicitar_material(uuid, text, integer, text, text, text) to anon, authenticated;
grant execute on function public.consultar_solicitacoes(uuid[]) to anon, authenticated;
