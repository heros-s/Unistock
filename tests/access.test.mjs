import test from 'node:test';
import assert from 'node:assert/strict';
import {guardRoute, safeNext, loginUrl, sameSession, parseAuthCallback} from '../src/domain/access.mjs';

const session={user:{id:'u1'}};

test('rotas de aluno e entrar sao liberadas com ou sem sessao', () => {
  for (const root of ['aluno','entrar']) {
    for (const s of [null,session]) {
      for (const loading of [false,true]) {
        assert.deepEqual(guardRoute({path:[root,'x'],session:s,loading}),{action:'allow'});
      }
    }
  }
});

test('equipe sem sessao redireciona para entrar com next', () => {
  assert.deepEqual(
    guardRoute({path:['equipe','solicitacoes'],session:null,loading:false}),
    {action:'redirect',to:loginUrl('#/equipe/solicitacoes')});
  assert.equal(
    guardRoute({path:['equipe'],session:null,loading:false}).to,
    loginUrl('#/equipe'));
});

test('equipe com sessao e liberada', () => {
  assert.deepEqual(guardRoute({path:['equipe','resumo'],session,loading:false}),{action:'allow'});
});

test('equipe carregando espera', () => {
  for (const s of [null,session]) {
    assert.deepEqual(guardRoute({path:['equipe','resumo'],session:s,loading:true}),{action:'wait'});
  }
});

test('safeNext aceita so destinos da equipe', () => {
  assert.equal(safeNext('#/equipe/solicitacoes'),'#/equipe/solicitacoes');
  for (const bad of ['https://evil.com','//evil.com','#/aluno/catalogo','',undefined,null,42,{},['#/equipe/x']]) {
    assert.equal(safeNext(bad),'#/equipe/resumo');
  }
});

test('loginUrl codifica o destino seguro', () => {
  assert.equal(loginUrl('#/equipe/solicitacoes'),'#/entrar?next='+encodeURIComponent('#/equipe/solicitacoes'));
  assert.equal(loginUrl('https://evil.com'),'#/entrar?next='+encodeURIComponent('#/equipe/resumo'));
});

test('sameSession compara a identidade da sessão',()=>{
  const a={email:'a@exemplo.invalid',nome:'Ana',sobrenome:'Lima'};
  assert.equal(sameSession(null,null),true);
  assert.equal(sameSession(a,{...a}),true);
  assert.equal(sameSession(null,a),false);
  assert.equal(sameSession(a,null),false);
  assert.equal(sameSession(a,{...a,nome:'Bia'}),false);
  assert.equal(sameSession(a,{...a,email:'b@exemplo.invalid'}),false);
});

test('parseAuthCallback reconhece o retorno do link de confirmação', () => {
  for (const route of ['#/aluno/catalogo','#/entrar?next=x','','#','#/equipe/resumo',undefined,null]) {
    assert.equal(parseAuthCallback(route),null);
  }
  assert.deepEqual(parseAuthCallback('#access_token=abc&refresh_token=d&type=signup'),{kind:'success'});
  assert.deepEqual(parseAuthCallback('#error=access_denied&error_code=otp_expired&error_description=x'),{kind:'error'});
  assert.deepEqual(parseAuthCallback('#error_code=otp_expired'),{kind:'error'});
});
