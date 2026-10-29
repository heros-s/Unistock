import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuth} from '../src/auth.mjs';
import {DomainError} from '../src/domain/validation.mjs';

const CONFIG={url:'https://exemplo.supabase.test',key:'chave-falsa'};
const REDIRECT='https://exemplo.test/equipe';
const VALID={nome:'Ana',sobrenome:'Souza',email:' Ana.Souza@Faculdade.Test ',senha:'senha-segura-1',confirmacao:'senha-segura-1'};

function fakeClient(overrides={}) {
  const calls=[];
  const listeners=[];
  let unsubscribed=0;
  const client={
    calls,listeners,
    get unsubscribed() {return unsubscribed;},
    auth:{
      async signUp(args) {calls.push(['signUp',args]); return overrides.signUp?overrides.signUp(args):{data:{},error:null};},
      async signInWithPassword(args) {
        calls.push(['signIn',args]);
        return overrides.signIn?overrides.signIn(args):{data:{session:{user:{email:'ana@faculdade.test',user_metadata:{nome:'Ana',sobrenome:'Souza'}}}},error:null};
      },
      async signOut() {calls.push(['signOut']); return {error:null};},
      async getSession() {return {data:{session:overrides.session||null},error:null};},
      onAuthStateChange(cb) {listeners.push(cb); return {data:{subscription:{unsubscribe(){unsubscribed++;}}}};}
    }
  };
  return client;
}
function make(client,extra={}) {
  let loads=0;
  const auth=createAuth(async()=>{loads++; return client;},{redirectTo:REDIRECT,config:CONFIG,...extra});
  return {auth,loads:()=>loads};
}
const rejectsForm=(promise,message)=>assert.rejects(promise,e=>e instanceof DomainError&&e.field==='form'&&e.message===message);

test('signUp válido chama o cliente com e-mail normalizado e metadados',async()=>{
  const c=fakeClient();
  const result=await make(c).auth.signUp(VALID);
  assert.deepEqual(result,{needsConfirmation:true});
  assert.deepEqual(c.calls[0],['signUp',{email:'ana.souza@faculdade.test',password:'senha-segura-1',options:{data:{nome:'Ana',sobrenome:'Souza'},emailRedirectTo:REDIRECT}}]);
});

test('signUp inválido lança DomainError e não chama o cliente',async()=>{
  const c=fakeClient();
  const {auth,loads}=make(c);
  await assert.rejects(auth.signUp({...VALID,senha:'curta',confirmacao:'curta'}),e=>e instanceof DomainError&&e.field==='senha');
  assert.equal(c.calls.length,0);
  assert.equal(loads(),0);
});

test('e-mail Gmail é repassado ao cliente',async()=>{
  const c=fakeClient();
  await make(c).auth.signUp({...VALID,email:'pessoa@gmail.com'});
  assert.equal(c.calls[0][1].email,'pessoa@gmail.com');
});

test('erro do trigger vira mensagem de e-mail sem permissão',async()=>{
  const msg='Este e-mail não tem permissão para acessar a área da equipe. Use o e-mail institucional.';
  const a=fakeClient({signUp:()=>({data:null,error:{status:500,message:'Database error saving new user'}})});
  await rejectsForm(make(a).auth.signUp(VALID),msg);
  const b=fakeClient({signUp:()=>({data:null,error:{message:'Database error saving new user'}})});
  await rejectsForm(make(b).auth.signUp(VALID),msg);
});

test('erros de signIn são traduzidos',async()=>{
  const input={email:'ana@faculdade.test',senha:'qualquer'};
  const mk=message=>fakeClient({signIn:()=>({data:null,error:{message}})});
  await rejectsForm(make(mk('Invalid login credentials')).auth.signIn(input),'E-mail ou senha incorretos.');
  await rejectsForm(make(mk('Email not confirmed')).auth.signIn(input),'Confirme seu e-mail pelo link que enviamos antes de entrar.');
  await rejectsForm(make(mk('algo inesperado')).auth.signIn(input),'Não foi possível concluir. Tente novamente.');
});

test('signIn válido devolve a sessão resumida',async()=>{
  const c=fakeClient();
  const s=await make(c).auth.signIn({email:'Ana@Faculdade.Test',senha:'x'});
  assert.deepEqual(s,{email:'ana@faculdade.test',nome:'Ana',sobrenome:'Souza'});
  assert.deepEqual(c.calls[0],['signIn',{email:'ana@faculdade.test',password:'x'}]);
});

test('getSession devolve null sem sessão e dados resumidos com sessão',async()=>{
  assert.equal(await make(fakeClient()).auth.getSession(),null);
  const c=fakeClient({session:{user:{email:'ana@faculdade.test',user_metadata:{nome:'Ana',sobrenome:'Souza'}}}});
  assert.deepEqual(await make(c).auth.getSession(),{email:'ana@faculdade.test',nome:'Ana',sobrenome:'Souza'});
});

test('onChange notifica e cancela a inscrição',async()=>{
  const c=fakeClient();
  const {auth}=make(c);
  const seen=[];
  const off=auth.onChange(s=>seen.push(s));
  await auth.getSession();
  await new Promise(r=>setImmediate(r));
  c.listeners[0]('SIGNED_IN',{user:{email:'ana@faculdade.test',user_metadata:{nome:'Ana',sobrenome:'Souza'}}});
  c.listeners[0]('SIGNED_OUT',null);
  assert.deepEqual(seen,[{email:'ana@faculdade.test',nome:'Ana',sobrenome:'Souza'},null]);
  off();
  assert.equal(c.unsubscribed,1);
});

test('falha ao carregar o cliente vira mensagem de conexão',async()=>{
  const auth=createAuth(async()=>{throw new Error('rede');},{redirectTo:REDIRECT,config:CONFIG});
  const msg='Não foi possível conectar ao serviço de acesso. Verifique sua conexão e tente novamente.';
  await rejectsForm(auth.signUp(VALID),msg);
  await rejectsForm(auth.signIn({email:'a@b.test',senha:'x'}),msg);
  assert.equal(await auth.getSession(),null);
  await auth.signOut();
});

test('loadClient é chamado uma só vez',async()=>{
  const c=fakeClient();
  const {auth,loads}=make(c);
  await auth.signIn({email:'a@b.test',senha:'x'});
  await auth.getSession();
  assert.equal(loads(),1);
});

test('chaves COLE_AQUI geram erro de configuração sem lançar na criação',async()=>{
  let loads=0;
  const auth=createAuth(async()=>{loads++; return fakeClient();},{redirectTo:REDIRECT,config:{url:'COLE_AQUI',key:'COLE_AQUI'}});
  const isConfig=e=>e instanceof DomainError&&e.field==='config'&&e.message==='O acesso da equipe ainda não foi configurado.';
  await assert.rejects(auth.signUp(VALID),isConfig);
  await assert.rejects(auth.signIn({email:'a@b.test',senha:'x'}),isConfig);
  assert.equal(await auth.getSession(),null);
  await auth.signOut();
  assert.equal(typeof auth.onChange(()=>{}),'function');
  assert.equal(loads,0);
});

test('config padrão (config.mjs) ainda não configurada',async()=>{
  const auth=createAuth(async()=>fakeClient());
  await assert.rejects(auth.signIn({email:'a@b.test',senha:'x'}),e=>e.field==='config');
});

test('segundo signUp pendente devolve a mesma promessa',async()=>{
  let release;
  const gate=new Promise(r=>{release=r;});
  const c=fakeClient({signUp:async()=>{await gate; return {data:{},error:null};}});
  const {auth}=make(c);
  const p1=auth.signUp(VALID);
  const p2=auth.signUp(VALID);
  assert.equal(p1,p2);
  release();
  await p1;
  assert.equal(c.calls.filter(x=>x[0]==='signUp').length,1);
});
