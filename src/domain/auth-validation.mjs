// auth-validation.mjs
import {DomainError, requiredText} from './validation.mjs';
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validEmail(value) {
  const email=requiredText(value,'email').toLowerCase();
  if (!EMAIL_RE.test(email)) throw new DomainError('email','Informe um e-mail válido.');
  return email;
}
function requiredPassword(value) {
  if (typeof value !== 'string' || !value) throw new DomainError('senha','Preencha este campo.');
  return value;
}
export function validateSignUp({nome,sobrenome,email,senha,confirmacao}={}) {
  const result={
    nome:requiredText(nome,'nome'),
    sobrenome:requiredText(sobrenome,'sobrenome'),
    email:validEmail(email),
    senha:requiredPassword(senha)};
  if (senha.length<8)
    throw new DomainError('senha','A senha precisa ter pelo menos 8 caracteres.');
  if (confirmacao!==senha) throw new DomainError('confirmacao','As senhas não coincidem.');
  return result;
}
export function validateSignIn({email,senha}={}) {
  return {email:validEmail(email),senha:requiredPassword(senha)};
}
