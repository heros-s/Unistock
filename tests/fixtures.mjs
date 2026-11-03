// fixtures.mjs — acervo fictício usado somente pelos testes.
import {emptyState,addMaterial} from '../src/domain/inventory.mjs';
export function createDemoState() {
  let state=emptyState();
  for(const item of [
    {id:'notebook',name:'Notebook',category:'equipment',measure:'unidade',quantity:2,codes:['DEMO-N-01','DEMO-N-02']},
    {id:'projetor',name:'Projetor',category:'equipment',measure:'unidade',quantity:0,codes:[]},
    {id:'tesoura',name:'Tesoura',category:'reusable',measure:'unidade',quantity:4,codes:[]},
    {id:'regua',name:'Régua',category:'reusable',measure:'unidade',quantity:6,codes:[]},
    {id:'cartolina',name:'Cartolina',category:'consumable',measure:'unidade',quantity:12,codes:[]},
    {id:'lapis',name:'Lápis de cor',category:'consumable',measure:'caixa',quantity:3,codes:[]},
    {id:'bone',name:'Boné',category:'gift',measure:'unidade',quantity:5,codes:[]}
  ]) state=addMaterial(state,item);
  return state;
}
