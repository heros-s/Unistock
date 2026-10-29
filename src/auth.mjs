// auth.mjs — acesso da equipe via Supabase (cliente injetado para permitir testes em Node)
import {DomainError} from './domain/validation.mjs';
import {validateSignUp,validateSignIn} from './domain/auth-validation.mjs';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.mjs';

const MARKER='COLE_AQUI';
const CDN_URL='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';
const MSG={
  config:'O acesso da equipe ainda não foi configurado.',
  connection:'Não foi possível conectar ao serviço de acesso. Verifique sua conexão e tente novamente.',
  forbidden:'Este e-mail não tem permissão para acessar a área da equipe. Use o e-mail institucional.',
  credentials:'E-mail ou senha incorretos.',
  unconfirmed:'Confirme seu e-mail pelo link que enviamos antes de entrar.',
  generic:'Não foi possível concluir. Tente novamente.'
};

export async function defaultLoadClient() {
  const {createClient}=await import(CDN_URL);
  return createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
}

function toSession(session) {
  const user=session&&session.user;
  if (!user) return null;
  const meta=user.user_metadata||{};
  return {email:user.email,nome:meta.nome||'',sobrenome:meta.sobrenome||''};
}

function mapError(error,kind) {
  if (error instanceof DomainError) return error;
  const message=String((error&&error.message)||'');
  if (kind==='signUp'&&((error&&error.status)===500||message.includes('Database error')))
    return new DomainError('form',MSG.forbidden);
  if (kind==='signIn'&&message.includes('Invalid login credentials'))
    return new DomainError('form',MSG.credentials);
  if (kind==='signIn'&&message.includes('Email not confirmed'))
    return new DomainError('form',MSG.unconfirmed);
  return new DomainError('form',MSG.generic);
}

export function createAuth(loadClient=defaultLoadClient,{redirectTo,config={url:SUPABASE_URL,key:SUPABASE_ANON_KEY}}={}) {
  const configured=config.url!==MARKER&&config.key!==MARKER;
  let clientPromise=null;
  let pendingSignUp=null;

  function getClient() {
    if (!configured) return Promise.reject(new DomainError('config',MSG.config));
    if (!clientPromise) {
      clientPromise=Promise.resolve().then(loadClient).then(client=>{
        if (!client||!client.auth) throw new Error('cliente inválido');
        return client;
      }).catch(()=>{
        clientPromise=null;
        throw new DomainError('form',MSG.connection);
      });
    }
    return clientPromise;
  }

  async function doSignUp(input) {
    const {nome,sobrenome,email,senha}=validateSignUp(input);
    const client=await getClient();
    let result;
    try {
      result=await client.auth.signUp({email,password:senha,options:{data:{nome,sobrenome},emailRedirectTo:redirectTo}});
    } catch (error) {throw mapError(error,'signUp');}
    if (result&&result.error) throw mapError(result.error,'signUp');
    return {needsConfirmation:true};
  }

  function signUp(input) {
    if (pendingSignUp) return pendingSignUp;
    const promise=doSignUp(input).finally(()=>{if (pendingSignUp===promise) pendingSignUp=null;});
    pendingSignUp=promise;
    return promise;
  }

  async function signIn(input) {
    const {email,senha}=validateSignIn(input);
    const client=await getClient();
    let result;
    try {
      result=await client.auth.signInWithPassword({email,password:senha});
    } catch (error) {throw mapError(error,'signIn');}
    if (result&&result.error) throw mapError(result.error,'signIn');
    return toSession(result.data&&result.data.session);
  }

  async function signOut() {
    let client;
    try {client=await getClient();} catch {return;}
    try {await client.auth.signOut();} catch {throw new DomainError('form',MSG.generic);}
  }

  async function getSession() {
    let client;
    try {client=await getClient();} catch {return null;}
    try {
      const {data}=await client.auth.getSession();
      return toSession(data&&data.session);
    } catch {return null;}
  }

  function onChange(callback) {
    let cancelled=false;
    let subscription=null;
    getClient().then(client=>{
      const {data}=client.auth.onAuthStateChange((_event,session)=>{
        if (!cancelled) callback(toSession(session));
      });
      subscription=data&&data.subscription;
      if (cancelled&&subscription) subscription.unsubscribe();
    }).catch(()=>{});
    return ()=>{
      cancelled=true;
      if (subscription) {subscription.unsubscribe(); subscription=null;}
    };
  }

  return {signUp,signIn,signOut,getSession,onChange};
}
