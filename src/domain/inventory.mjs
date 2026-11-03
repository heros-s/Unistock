import {DomainError, requiredText} from './validation.mjs';

// equipment e reusable exigem devolução; consumable e gift saem do estoque sem retorno.
export const CATEGORIES = ['equipment','reusable','consumable','gift'];
export const returnable = category => category==='equipment' || category==='reusable';
// Código de patrimônio: letras, números e hífen, até 40 caracteres (ex.: 9501, PROJ-11533).
export const UNIT_CODE = /^[A-Z0-9][A-Z0-9-]{0,39}$/;

const normalized = value => value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
export function searchMaterials(s, {query = '', category = ''}) {
  return s.materials.filter(m => (!category || m.category === category) && normalized(m.name).includes(normalized(query)));
}

export const emptyState = () => ({materials:[], units:[], requests:[],
  confirmations:[], pickups:[], returns:[], giftOuts:[], movements:[]});
export const availableUnits = (s,id) => s.units.filter(u => u.materialId===id && u.status==='available');
export function availability(s,id) {
  const material = s.materials.find(m => m.id===id);
  if (!material) throw new DomainError('materialId','Material não encontrado.');
  return material.category==='equipment' ? availableUnits(s,id).length
    : s.movements.filter(m => m.materialId===id).reduce((sum,m) => sum+m.delta,0);
}
export function addMaterial(s,input) {
  const id=requiredText(input.id,'id');
  if(s.materials.some(m=>m.id===id)) throw new DomainError('id','Material já cadastrado.');
  const name=requiredText(input.name,'name'), measure=requiredText(input.measure,'measure');
  if(name.length>120) throw new DomainError('name','Use no máximo 120 caracteres.');
  const {category,quantity}=input;
  if(!CATEGORIES.includes(category))
    throw new DomainError('category','Selecione uma categoria válida.');
  if(!Number.isSafeInteger(quantity)||quantity<0)
    throw new DomainError('quantity','Informe um saldo inteiro igual ou maior que zero.');
  const codes=(input.codes??[]).map(code=>requiredText(code,'codes').toUpperCase());
  if(category==='equipment') {
    if(measure!=='unidade') throw new DomainError('measure','Equipamentos usam a unidade de medida "unidade".');
    if(codes.length!==quantity || new Set(codes).size!==codes.length ||
      codes.some(code=>!UNIT_CODE.test(code)||s.units.some(u=>u.code===code)))
      throw new DomainError('codes','Informe um código de patrimônio único para cada unidade (letras, números e hífen).');
  } else if(codes.length) throw new DomainError('codes','Use códigos somente para equipamentos.');
  const next=structuredClone(s);
  next.materials.push({id,name,category,measure});
  next.movements.push({materialId:id,requestId:null,kind:'initial',delta:quantity});
  next.units.push(...codes.map(code=>({code,materialId:id,status:'available'})));
  return next;
}
