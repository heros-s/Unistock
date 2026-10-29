import test from 'node:test';
import assert from 'node:assert/strict';
import {DomainError} from '../src/domain/validation.mjs';
import {validateSignUp,validateSignIn} from '../src/domain/auth-validation.mjs';
const valid=(changes={})=>({nome:'Ana',sobrenome:'Exemplo',email:'ana@uniguacu.com.br',
  senha:'12345678',confirmacao:'12345678',...changes});
function rejects(fn,field,message) {
  assert.throws(fn,e=>e instanceof DomainError&&e.field===field&&e.message===message);
}

test('cadastro válido normaliza e-mail e nomes',()=>{
  const r=validateSignUp(valid({nome:' Ana ',sobrenome:' Exemplo ',email:'  Ana@UniGuacu.com.br '}));
  assert.deepEqual(r,{nome:'Ana',sobrenome:'Exemplo',email:'ana@uniguacu.com.br',senha:'12345678'});
});
test('e-mail gmail.com é aceito',()=>{
  assert.equal(validateSignUp(valid({email:'pessoa@gmail.com'})).email,'pessoa@gmail.com');
});
for (const field of ['nome','sobrenome','email','senha'])
  test(`campo ${field} vazio é recusado`,()=>{
    rejects(()=>validateSignUp(valid({[field]:''})),field,'Preencha este campo.');
  });
for (const email of ['sem-arroba','a@b'])
  test(`e-mail ${email} é inválido`,()=>{
    rejects(()=>validateSignUp(valid({email})),'email','Informe um e-mail válido.');
  });
test('senha curta é recusada e 8 caracteres passam',()=>{
  rejects(()=>validateSignUp(valid({senha:'1234567',confirmacao:'1234567'})),'senha','A senha precisa ter pelo menos 8 caracteres.');
  assert.equal(validateSignUp(valid()).senha,'12345678');
});
test('confirmação diferente é recusada',()=>{
  rejects(()=>validateSignUp(valid({confirmacao:'87654321'})),'confirmacao','As senhas não coincidem.');
});
test('senha não sofre trim',()=>{
  const r=validateSignUp(valid({senha:' abcdefg ',confirmacao:' abcdefg '}));
  assert.equal(r.senha,' abcdefg ');
});
test('login normaliza e-mail e mantém a senha',()=>{
  assert.deepEqual(validateSignIn({email:' Ana@UniGuacu.com.br ',senha:' x '}),
    {email:'ana@uniguacu.com.br',senha:' x '});
});
test('login exige e-mail válido e senha preenchida',()=>{
  rejects(()=>validateSignIn({email:'',senha:'x'}),'email','Preencha este campo.');
  rejects(()=>validateSignIn({email:'a@b',senha:'x'}),'email','Informe um e-mail válido.');
  rejects(()=>validateSignIn({email:'ana@uniguacu.com.br',senha:''}),'senha','Preencha este campo.');
});
