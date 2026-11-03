import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inventarioInicial} from '../scripts/inventario-inicial.mjs';
import {cargaInicialSql} from '../scripts/carga-inicial.mjs';
import {emptyState, addMaterial, availability} from '../src/domain/inventory.mjs';

test('todos os itens da lista passam nas regras de cadastro',()=>{
  let state=emptyState();
  for(const item of inventarioInicial) state=addMaterial(state,item);
  assert.equal(state.materials.length,inventarioInicial.length);
  assert.equal(availability(state,'computador'),11);
  assert.equal(availability(state,'caneta-preta'),90);
  assert.equal(availability(state,'brinde-garrafa'),200);
});
test('classificação: equipamentos com patrimônio, brindes separados',()=>{
  const by=category=>inventarioInicial.filter(m=>m.category===category).map(m=>m.id);
  assert.deepEqual(by('equipment'),['projetor','computador','caixa-de-som']);
  assert.equal(by('gift').length,15);
  assert.ok(by('gift').every(id=>id.startsWith('brinde-')));
  assert.deepEqual(inventarioInicial.find(m=>m.id==='projetor').codes,['11533','11706','11627']);
});
test('supabase/carga_inicial.sql está atualizado com a lista',async()=>{
  const file=await readFile(new URL('../supabase/carga_inicial.sql',import.meta.url),'utf8');
  assert.equal(file.replace(/\r\n/g,'\n'),cargaInicialSql(),'rode: node scripts/carga-inicial.mjs');
  assert.match(cargaInicialSql([{id:'x',name:"Copo d'água",category:'gift',measure:'unidade',quantity:1,codes:[]}]),/'Copo d''água'/);
});
