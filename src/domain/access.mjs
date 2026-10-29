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
