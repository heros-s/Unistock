import {createStore} from './store.mjs';
import {createBackend} from './data.mjs';
import {createLocalData} from './local.mjs';
import {el, icon, notice, empty, linkButton} from './ui/dom.mjs';
import {renderStudent} from './ui/student.mjs';
import {renderTeam} from './ui/team.mjs';
import {protocol} from './ui/shared.mjs';
import {renderLogin} from './ui/login.mjs';
import {createAuth, defaultLoadClient} from './auth.mjs';
import {guardRoute, safeNext, sameSession, parseAuthCallback} from './domain/access.mjs';

let flash = '';
let session = null, loading = true;
// Retorno do link de confirmação: o fragmento traz dados de autenticação, não uma rota.
let callbackPending = parseAuthCallback(location.hash);
const auth = createAuth(defaultLoadClient, {redirectTo:location.origin + location.pathname});
const local = createLocalData();
const store = createStore(createBackend(auth.client, local));
// Situação da carga do acervo: 'loading' | 'ready' | 'error'.
let data = {status:'loading', scope:null, error:''};
const app = document.querySelector('#app');
const navItems = {
  aluno:[['catalogo','Catálogo','grid'],['solicitacoes','Minhas solicitações','list'],['como-funciona','Como funciona','book']],
  equipe:[['resumo','Visão geral','grid'],['solicitacoes','Solicitações','list'],['retiradas','Retiradas e devoluções','refresh'],['materiais','Materiais','box'],['brindes','Brindes','gift']]
};
const hasUserInput = () => Boolean(document.querySelector('main form')) ||
  [...document.querySelectorAll('main input[type="search"]')].some(input => input.value);
const desiredScope = () => session ? 'team' : 'public';
/** Recarrega quando a sessão muda o que pode ser lido (login traz dados da equipe; logout os descarta). */
function ensureScope() { if (data.scope !== null && data.scope !== desiredScope()) loadData(); }
/** Carrega o acervo do servidor: dados da equipe com sessão, catálogo público sem ela. */
async function loadData({quiet = false} = {}) {
  const scope = desiredScope();
  if (!quiet || data.scope !== scope) data = {status:'loading', scope, error:''};
  if (!quiet) render(false);
  const before = JSON.stringify(store.getState());
  try {
    await store.load(scope);
    if (data.scope !== scope) return; // a sessão mudou durante a carga; outra carga está em andamento
    const changed = data.status !== 'ready' || JSON.stringify(store.getState()) !== before;
    data = {status:'ready', scope, error:''};
    // Não redesenha sobre um formulário em preenchimento: o servidor valida de novo ao enviar.
    if (changed && !(quiet && hasUserInput())) render(false);
  } catch (error) {
    if (data.scope !== scope) return;
    if (quiet && data.status === 'ready') return; // mantém o que já está na tela
    data = {status:'error', scope, error:error.message || 'Não foi possível carregar os materiais.'};
    render(false);
  }
}
function navigate(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}
async function dispatch(command, payload) {
  const state = await store.dispatch(command,payload);
  flash = command === 'request'
    ? `Solicitação enviada. Aguarde a confirmação antes de retirar o material. Protocolo ${protocol(payload.id)}.`
    : ({confirm:'Solicitação confirmada. A retirada ainda precisa ser registrada.', pickup:'Retirada registrada. A disponibilidade foi atualizada.',
      return:'Devolução e conferência registradas.', material:'Material cadastrado.', gift:'Saída de brinde registrada.'})[command];
  return state;
}
function render(focus = true) {
  const [pathname, search = ''] = (callbackPending ? '/' : location.hash.slice(1) || '/aluno/catalogo').split('?');
  const route = {path:pathname.split('/').filter(Boolean), params:new URLSearchParams(search)};
  const guard = guardRoute({path:route.path, session, loading});
  if (guard.action === 'redirect') { location.replace(guard.to); return; }
  if (route.path[0] === 'entrar' && session) { location.replace(safeNext(route.params.get('next'))); return; }
  const waiting = guard.action === 'wait' || Boolean(callbackPending);
  const area = route.path[0] === 'equipe' ? 'equipe' : 'aluno';
  const personName = session ? `${session.nome} ${session.sobrenome}`.trim() : '';
  const state = store.getState();
  const navigation = el('nav', {className:'navigation',id:'main-nav','aria-label':area==='aluno'?'Navegação do aluno':'Navegação da equipe'},
    navItems[area].map(([path,label,symbol])=>{
      const current = route.path[1] === path || (path==='catalogo'&&['material','solicitar'].includes(route.path[1])) ||
        (path==='solicitacoes'&&route.path[1]==='solicitacao') || (path==='retiradas'&&['retirada','devolucao'].includes(route.path[1]));
      return el('a',{href:`#/${area}/${path}`,className:current?'active':'','aria-current':current?'page':null},icon(symbol),label);
    }));
  const areaSelect = el('select',{id:'area-select','aria-label':'Alternar área',onchange:event=>{
    flash='';navigate(event.target.value==='equipe'?'#/equipe/resumo':'#/aluno/catalogo');
  }},el('option',{value:'aluno'},'Área do aluno'),el('option',{value:'equipe'},'Área da equipe'));
  areaSelect.value=area;
  const header = el('header',{className:'site-header'},el('div',{className:'header-inner'},
    el('a',{href:area==='aluno'?'#/aluno/catalogo':'#/equipe/resumo',className:'brand','aria-label':'Página inicial do Unistock'},
      el('span',{className:'brand-mark','aria-hidden':true},'U'),el('span',{},'uni',el('strong',{},'stock'),el('small',{},'MATERIAIS QUE CONECTAM IDEIAS'))),
    area==='aluno'&&navigation,
    el('div',{className:'header-tools'},el('span',{className:'area-switch'},icon('users'),areaSelect),
      el('span',{className:'avatar',role:'img',title:area==='aluno'?'Aluno':(personName||'Equipe'),'aria-label':area==='aluno'?'Aluno':(personName||'Equipe')},area==='aluno'?'A':(personName[0]||'E').toUpperCase()),
      area==='equipe'&&personName&&el('span',{className:'user-name'},personName),
      area==='equipe'&&session&&el('button',{type:'button',className:'signout-button',onclick:async()=>{
        let result;
        try { result = await auth.signOut(); } catch { result = {serverError:false}; }
        session=null;
        flash=result&&result.serverError?'Não foi possível encerrar a sessão no servidor. Ela foi removida deste navegador.':'';
        ensureScope();
        navigate('#/aluno/catalogo');
      }},'Sair'),
      el('button',{type:'button',className:'menu-button','aria-label':'Abrir navegação','aria-controls':'main-nav','aria-expanded':'false',onclick:event=>{
        const open=event.currentTarget.getAttribute('aria-expanded')!=='true';event.currentTarget.setAttribute('aria-expanded',String(open));
        navigation.classList.toggle('mobile-open',open);
      }},icon('menu')))));
  const context={state,route,dispatch,navigate,local,personName};
  const content=waiting
    ? el('div',{className:'notice',role:'status'},icon('clock'),el('p',{},'Verificando acesso…'))
    : route.path[0]!=='entrar'&&data.status==='loading'
    ? el('div',{className:'notice',role:'status'},icon('clock'),el('p',{},'Carregando materiais…'))
    : route.path[0]!=='entrar'&&data.status==='error'
    ? el('div',{className:'empty',role:'alert'},el('div',{className:'empty-icon'},icon('info')),el('h2',{},'Não foi possível carregar os materiais'),
        el('p',{},data.error),el('button',{type:'button',className:'button primary',onclick:()=>loadData()},icon('refresh'),'Tentar novamente'))
    : route.path[0]==='entrar'
    ? renderLogin({route,auth,navigate,onSignedIn:next=>{session=next;loading=false;ensureScope();}})
    : !['aluno','equipe'].includes(route.path[0])
    ? empty('Página não encontrada','Volte ao catálogo para continuar.',linkButton('Ver catálogo','#/aluno/catalogo'))
    : area==='aluno'?renderStudent(context):renderTeam(context);
  const main=el('main',{id:'conteudo',tabindex:'-1',className:'page'},
    el('div',{className:'context-row'},el('span',{},'Unistock',el('span',{},' / '),area==='aluno'?(route.path[0]==='entrar'?'Entrar':'Espaço do aluno'):'Espaço da equipe')),
    flash&&el('div',{className:'success-message',role:'status'},icon('check'),el('span',{},flash)),content,
    el('footer',{className:'page-footer'},el('span',{},'Unistock · Compartilhar faz a diferença.'),
      el('span',{},'A área da equipe exige login. Os pedidos do aluno ficam vinculados a este navegador.')));
  flash='';
  app.replaceChildren(header,area==='equipe'?el('div',{className:'team-layout'},
    el('aside',{className:'sidebar'},el('p',{className:'eyebrow'},'GESTÃO DE MATERIAIS'),navigation,
      el('div',{className:'sidebar-note'},icon('info'),el('p',{},'Um só acervo.',el('br'),'Mais possibilidades para todos.'))),main):main);
  if(focus) { (main.querySelector('h1') || main).focus({preventScroll:true});window.scrollTo(0,0); }
  document.title=`${main.querySelector('h1')?.textContent || 'Catálogo'} · Unistock`;
}
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();document.querySelector('main').focus();});
// Ao navegar, mostra o que já está carregado e busca a versão atual do servidor em segundo plano.
window.addEventListener('hashchange',()=>{ render(); if (!loading && data.status === 'ready') loadData({quiet:true}); });
auth.onChange(next => {
  const changed = loading || !sameSession(session, next);
  session = next; loading = false;
  if (data.scope !== null && data.scope !== desiredScope()) loadData();
  else if (changed) render(false);
});
auth.getSession().then(current => { session = current; }, () => { session = null; })
  .then(() => {
    loading = false;
    const callback = callbackPending;
    callbackPending = null;
    if (data.scope !== desiredScope()) loadData();
    // navigate sempre renderiza: o supabase-js limpa o fragmento com replaceState, que não dispara hashchange.
    if (callback) navigate(session && callback.kind === 'success' ? '#/equipe/resumo' : callback.kind === 'error' ? '#/entrar?aviso=link-invalido' : '#/entrar');
    else render(false);
  });
render(false);
