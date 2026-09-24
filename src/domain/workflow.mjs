import {availability, availableUnits} from './inventory.mjs';
import {DomainError, requiredText, positiveInteger, validDate} from './validation.mjs';

const fail = (field, message) => { throw new DomainError(field, message); };
const requestFor = (s, id) => s.requests.find(r => r.id === id)
  ?? fail('requestId', 'Solicitação não encontrada.');
const materialFor = (s, id) => s.materials.find(m => m.id === id)
  ?? fail('materialId', 'Material não encontrado.');
const after = (at, earlier, field = 'at') => {
  if (Date.parse(at) < Date.parse(earlier))
    fail(field, 'A data e horário não podem ser anteriores à etapa precedente.');
};

/** Each transition validates first, then returns a new State without mutating its input. */
export function requestMaterial(s, input) {
  const id = requiredText(input.id, 'id');
  if (s.requests.some(r => r.id === id)) fail('id', 'Esta solicitação já foi enviada.');
  if (!s.students.some(student => student.id === input.studentId))
    fail('studentId', 'Selecione uma pessoa fictícia válida.');
  materialFor(s, input.materialId);
  const quantity = positiveInteger(input.quantity);
  if (quantity > availability(s, input.materialId)) fail('quantity', 'Quantidade maior que a disponível.');
  const request = {id, studentId: input.studentId, materialId: input.materialId, quantity,
    name: requiredText(input.name, 'name'), course: requiredText(input.course, 'course'),
    purpose: requiredText(input.purpose, 'purpose'), at: validDate(input.at)};
  const next = structuredClone(s);
  next.requests.push(request);
  return next;
}

export function confirmRequest(s, {requestId, at}) {
  const request = requestFor(s, requestId);
  if (s.confirmations.some(c => c.requestId === requestId))
    fail('requestId', 'A confirmação desta solicitação já foi registrada.');
  at = validDate(at);
  after(at, request.at);
  const next = structuredClone(s);
  next.confirmations.push({requestId, at});
  return next;
}

export function recordPickup(s, input) {
  const request = requestFor(s, input.requestId);
  const material = materialFor(s, request.materialId);
  const confirmation = s.confirmations.find(c => c.requestId === request.id);
  if (!confirmation) fail('requestId', 'Aguarde a confirmação antes da retirada.');
  if (s.pickups.some(p => p.requestId === request.id))
    fail('requestId', 'A retirada desta solicitação já foi registrada.');
  const quantity = positiveInteger(input.quantity);
  if (quantity > request.quantity) fail('quantity', 'A entrega não pode superar a quantidade solicitada.');
  if (quantity > availability(s, material.id)) fail('quantity', 'Quantidade indisponível. Confira o saldo atual.');
  const operator = requiredText(input.operator, 'operator');
  const at = validDate(input.at);
  after(at, confirmation.at);
  const dueAt = material.category === 'consumable' ? null : validDate(input.dueAt, 'dueAt');
  if (dueAt) after(dueAt, at, 'dueAt');
  if (material.category === 'consumable' && input.dueAt)
    fail('dueAt', 'Materiais de consumo não têm previsão de devolução.');
  if (!Array.isArray(input.codes)) fail('codes', 'Selecione os códigos das unidades.');
  const codes = input.codes.map(code => requiredText(code, 'codes').toUpperCase());
  if (material.category === 'equipment') {
    const available = new Set(availableUnits(s, material.id).map(u => u.code));
    if (codes.length !== quantity || new Set(codes).size !== codes.length || codes.some(code => !available.has(code)))
      fail('codes', 'Selecione um código disponível deste material para cada unidade entregue.');
  } else if (codes.length) fail('codes', 'Este material não usa códigos de equipamento.');
  const next = structuredClone(s);
  next.pickups.push({requestId: request.id, quantity, codes, operator, at, dueAt});
  next.movements.push({materialId: material.id, requestId: request.id, kind: 'out', delta: -quantity});
  for (const unit of next.units) if (codes.includes(unit.code)) unit.status = 'loaned';
  return next;
}

export function recordReturn(s, input) {
  const request = requestFor(s, input.requestId);
  if (materialFor(s, request.materialId).category === 'consumable')
    fail('requestId', 'Materiais de consumo não exigem devolução.');
  const pickup = s.pickups.find(p => p.requestId === request.id);
  if (!pickup) fail('requestId', 'Registre a retirada antes da devolução.');
  if (s.returns.some(r => r.requestId === request.id))
    fail('requestId', 'A devolução desta solicitação já foi registrada.');
  const at = validDate(input.at);
  after(at, pickup.at);
  if (!['ok', 'problem'].includes(input.condition)) fail('condition', 'Informe o estado do material na devolução.');
  const notes = input.condition === 'problem' ? requiredText(input.notes, 'notes') : String(input.notes ?? '').trim();
  const next = structuredClone(s);
  next.returns.push({requestId: request.id, at, condition: input.condition, notes});
  if (input.condition === 'ok') next.movements.push({materialId: request.materialId,
    requestId: request.id, kind: 'in', delta: pickup.quantity});
  for (const unit of next.units) if (pickup.codes.includes(unit.code))
    unit.status = input.condition === 'ok' ? 'available' : 'review';
  return next;
}

export function requestStatus(s, id) {
  const request = requestFor(s, id);
  if (s.returns.some(r => r.requestId === id)) return 'returned';
  if (s.pickups.some(p => p.requestId === id))
    return materialFor(s, request.materialId).category === 'consumable' ? 'completed' : 'loaned';
  return s.confirmations.some(c => c.requestId === id) ? 'confirmed' : 'requested';
}
