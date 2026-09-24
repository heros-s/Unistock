import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState, addMaterial, availability} from '../src/domain/inventory.mjs';
import {createDemoState} from '../src/demo.mjs';

const item = (changes = {}) => ({id:'m', name:'Notebook de demonstração',
  category:'equipment', measure:'unidade', quantity:1, codes:['DEMO-N-01'], ...changes});

test('cadastro não muda o estado anterior e deriva a disponibilidade', () => {
  const before = emptyState();
  const after = addMaterial(before, item());
  assert.equal(before.materials.length, 0);
  assert.equal(availability(after, 'm'), 1);
});
test('códigos são únicos após normalização, inclusive entre materiais', () => {
  assert.throws(() => addMaterial(emptyState(), item({quantity:2,
    codes:['demo-n-01', ' DEMO-N-01 ']})), /código/i);
  const state = addMaterial(emptyState(), item());
  assert.throws(() => addMaterial(state, item({id:'outro'})), /código/i);
});
test('rejeita cadastro incoerente', () => {
  for (const changes of [{quantity:-1},{quantity:1.5},{name:' '},
    {category:'outra'},{quantity:2},{codes:['N01']}]) {
    assert.throws(() => addMaterial(emptyState(), item(changes)));
  }
});
test('saldo zero é permitido e cada demonstração é independente', () => {
  const state = addMaterial(emptyState(), item({quantity:0,codes:[]}));
  assert.equal(availability(state,'m'),0);
  const first = createDemoState();
  first.materials.length = 0;
  assert.ok(createDemoState().materials.length > 0);
});