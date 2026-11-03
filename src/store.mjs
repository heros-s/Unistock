// store.mjs — estado compartilhado pelas duas áreas, carregado do servidor.
// Cada ação é validada antes pelas regras do domínio (mensagem imediata junto ao campo),
// gravada no servidor (que valida de novo, de forma atômica) e então o estado é recarregado.
import {emptyState, addMaterial} from './domain/inventory.mjs';
import {requestMaterial,confirmRequest,recordPickup,recordReturn,recordGiftOut} from './domain/workflow.mjs';
import {DomainError} from './domain/validation.mjs';

const rules = {request:requestMaterial, confirm:confirmRequest, pickup:recordPickup,
  return:recordReturn, material:addMaterial, gift:recordGiftOut};

export function createStore(backend) {
  let state = emptyState();
  let scope = null;
  let generation = 0; // descarta respostas de cargas anteriores (ex.: login no meio da carga)
  return {
    getState:()=>structuredClone(state),
    get scope() { return scope; },
    async load(nextScope = scope) {
      const ticket = ++generation;
      const loaded = await backend.load(nextScope);
      if (ticket === generation) { state = loaded; scope = nextScope; }
      return structuredClone(state);
    },
    async dispatch(command, payload) {
      if (!Object.hasOwn(rules, command)) throw new DomainError('command', 'Ação desconhecida.');
      const projected = rules[command](state, payload);
      await backend[command](payload);
      try { await this.load(scope); }
      catch { state = projected; } // gravado no servidor; a próxima carga traz o estado oficial
      return structuredClone(state);
    }
  };
}
