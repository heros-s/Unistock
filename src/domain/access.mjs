// access.mjs
const DEFAULT_NEXT='#/equipe/resumo';
export function safeNext(value) {
  if (typeof value !== 'string') return DEFAULT_NEXT;
  return /^#\/equipe(\/|$)/.test(value)?value:DEFAULT_NEXT;
}
export function loginUrl(nextHash) {
  return '#/entrar?next='+encodeURIComponent(safeNext(nextHash));
}
export function guardRoute({path,session,loading}={}) {
  const segments=Array.isArray(path)?path:[];
  if (segments[0]!=='equipe') return {action:'allow'};
  if (loading) return {action:'wait'};
  if (session) return {action:'allow'};
  return {action:'redirect',to:loginUrl('#/'+segments.join('/'))};
}
export function sameSession(a,b) {
  if (!a||!b) return !a&&!b;
  return a.email===b.email&&a.nome===b.nome&&a.sobrenome===b.sobrenome;
}
// Retorno do link de confirmação do Supabase (fluxo implícito): o fragmento traz os dados de
// autenticação em vez de uma rota. Devolve null para rotas normais.
export function parseAuthCallback(hash) {
  if (typeof hash!=='string') return null;
  const first=hash.replace(/^#/,'').split('&')[0];
  if (/^(error|error_code)=/.test(first)) return {kind:'error'};
  if (/^access_token=/.test(first)) return {kind:'success'};
  return null;
}
