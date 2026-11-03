// Gera supabase/carga_inicial.sql a partir de scripts/inventario-inicial.mjs.
// Uso: node scripts/carga-inicial.mjs
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {inventarioInicial} from './inventario-inicial.mjs';

const literal = value => `'${String(value).replaceAll("'", "''")}'`;
const array = codes => codes.length ? `array[${codes.map(literal).join(', ')}]::text[]` : `'{}'::text[]`;

export function cargaInicialSql(items = inventarioInicial) {
  const rows = items.map(m =>
    `    (${literal(m.id)}, ${literal(m.name)}, ${literal(m.category)}, ${literal(m.measure)}, ${m.quantity}, ${array(m.codes)})`);
  return `-- Unistock: carga inicial do acervo (gerado por scripts/carga-inicial.mjs; nao edite a mao).
-- Execute no SQL Editor do Supabase DEPOIS de dados.sql. Pode ser repetido: materiais ja
-- cadastrados (mesmo id) sao ignorados, entao saldos alterados pelo uso nao sao sobrescritos.
do $$
declare
  item record;
begin
  for item in
    select * from (values
${rows.join(',\n')}
    ) as t(id, nome, categoria, medida, quantidade, codigos)
  loop
    if not exists (select 1 from public.materiais where id = item.id) then
      perform privado.inserir_material(item.id, item.nome, item.categoria, item.medida, item.quantidade, item.codigos, null);
    end if;
  end loop;
end;
$$;
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await writeFile(new URL('../supabase/carga_inicial.sql', import.meta.url), cargaInicialSql());
  console.log(`supabase/carga_inicial.sql gerado com ${inventarioInicial.length} materiais.`);
}
