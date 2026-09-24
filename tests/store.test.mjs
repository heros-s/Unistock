import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../src/store.mjs';
test('o mesmo store atende às duas áreas, reseta e não expõe estado mutável',()=>{
  const store=createStore(), initial=store.getState();
  store.dispatch('request',{id:'r',studentId:'DEMO-ALUNO-1',name:'Ana Exemplo',course:'Design',
    materialId:'cartolina',quantity:2,purpose:'Demonstração',at:'2026-10-05T12:00:00Z'});
  assert.equal(store.getState().requests.length,1);
  const reader=store.getState(); reader.requests.length=0;
  assert.equal(store.getState().requests.length,1);
  const snapshot=store.getState();
  assert.throws(()=>store.dispatch('confirm',{requestId:'inexistente',at:'2026-10-05T13:00:00Z'}));
  assert.deepEqual(store.getState(),snapshot);
  assert.deepEqual(store.reset(),initial);
});