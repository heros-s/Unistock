import {createDemoState} from './demo.mjs';
import {addMaterial} from './domain/inventory.mjs';
import {requestMaterial,confirmRequest,recordPickup,recordReturn} from './domain/workflow.mjs';
import {DomainError} from './domain/validation.mjs';
export function createStore(seed=createDemoState) {
  let state=seed();
  const commands={request:requestMaterial,confirm:confirmRequest,pickup:recordPickup,
    return:recordReturn,material:addMaterial};
  return {
    getState:()=>structuredClone(state),
    dispatch(command,payload) {
      if(!Object.hasOwn(commands,command)) throw new DomainError('command','Ação desconhecida.');
      state=commands[command](state,payload);
      return structuredClone(state);
    },
    reset(){state=seed();return structuredClone(state);}
  };
}