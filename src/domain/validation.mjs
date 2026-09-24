// validation.mjs
export class DomainError extends Error {
  constructor(field, message) { super(message); this.name='DomainError'; this.field=field; }
}
export function requiredText(value, field) {
  if (typeof value !== 'string' || !value.trim())
    throw new DomainError(field, 'Preencha este campo.');
  return value.trim();
}
export function positiveInteger(value, field='quantity') {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new DomainError(field, 'Informe uma quantidade inteira maior que zero.');
  return value;
}
export function validDate(value, field='at') {
  if (typeof value !== 'string' || !value || !Number.isFinite(Date.parse(value)))
    throw new DomainError(field, 'Informe uma data e horário válidos.');
  return new Date(value).toISOString();
}
