import {createStore} from './store.mjs';
import {el, icon, notice, empty, linkButton} from './ui/dom.mjs';
import {renderStudent} from './ui/student.mjs';
import {renderTeam} from './ui/team.mjs';
import {protocol} from './ui/shared.mjs';

const store = createStore();
let studentId = 'DEMO-ALUNO-1';
let flash = '';
const app = document.querySelector('#app');
const navItems = {
  aluno:[['catalogo','Catálogo','grid'],['solicitacoes','Minhas solicitações','list'],['como-funciona','Como funciona','book']],
  equipe:[['resumo','Visão geral','grid'],['solicitacoes','Solicitações','list'],['retiradas','Retiradas e devoluções','refresh'],['materiais','Materiais','box']]
};
function navigate(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}
function dispatch(command, payload) {
  const state = store.dispatch(command,payload);
  flash = command === 'request'
    ? `Solicitação enviada. Aguarde a confirmação antes de retirar o material. Protocolo ${protocol(payload.id)}.`
    : ({confirm:'Solicitação confirmada. A retirada ainda precisa ser registrada.', pickup:'Retirada registrada. A disponibilidade foi atualizada.',
      return:'Devolução e conferência registradas.', material:'Material demonstrativo cadastrado.'})[command];
  return state;
}
function render(focus = true) {
  const [pathname, search = ''] = (location.hash.slice(1) || '/aluno/catalogo').split('?');
  const route = {path:pathname.split('/').filter(Boolean), params:new URLSearchParams(search)};
  const area = route.path[0] === 'equipe' ? 'equipe' : 'aluno';
  const state = store.getState();
  const student = state.students.find(s => s.id === studentId);
  const navigation = el('nav', {className:'navigation',id:'main-nav','aria-label':area==='aluno'?'Navegação do aluno':'Navegação da equipe'},
    navItems[area].map(([path,label,symbol])=>{
      const current = route.path[1] === path || (path==='catalogo'&&['material','solicitar'].includes(route.path[1])) ||
        (path==='solicitacoes'&&route.path[1]==='solicitacao') || (path==='retiradas'&&['retirada','devolucao'].includes(route.path[1]));
      return el('a',{href:`#/${area}/${path}`,className:current?'active':'','aria-current':current?'page':null},icon(symbol),label);
    }));
  const areaSelect = el('select',{id:'area-select','aria-label':'Alternar área de demonstração',onchange:event=>{
    flash='';navigate(event.target.value==='equipe'?'#/equipe/resumo':'#/aluno/catalogo');
  }},el('option',{value:'aluno'},'Área do aluno'),el('option',{value:'equipe'},'Área da equipe'));
  areaSelect.value=area;
  const personSelect = el('select',{id:'person-select','aria-label':'Pessoa fictícia da demonstração',onchange:event=>{
    studentId=event.target.value;flash='';render(false);
  }},state.students.map(person=>el('option',{value:person.id},person.name)));
  personSelect.value=studentId;
  const header = el('header',{className:'site-header'},el('div',{className:'header-inner'},
    el('a',{href:area==='aluno'?'#/aluno/catalogo':'#/equipe/resumo',className:'brand','aria-label':'Página inicial do Unistock'},
      el('span',{className:'brand-mark','aria-hidden':true},'U'),el('span',{},'uni',el('strong',{},'stock'),el('small',{},'MATERIAIS QUE CONECTAM IDEIAS'))),
    area==='aluno'&&navigation,
    el('div',{className:'header-tools'},el('span',{className:'area-switch'},icon('users'),areaSelect),
      el('span',{className:'avatar','aria-label':area==='aluno'?student.name:'Equipe demonstrativa'},area==='aluno'?student.name[0]:'E'),
      el('button',{type:'button',className:'menu-button','aria-label':'Abrir navegação','aria-controls':'main-nav','aria-expanded':'false',onclick:event=>{
        const open=event.currentTarget.getAttribute('aria-expanded')!=='true';event.currentTarget.setAttribute('aria-expanded',String(open));
        navigation.classList.toggle('mobile-open',open);
      }},icon('menu')))));
  const demoBar=el('div',{className:'demo-bar'},el('div',{className:'demo-inner'},
    el('span',{className:'demo-label'},el('span',{className:'status-dot'}),'Protótipo · dados demonstrativos'),
    el('span',{className:'demo-description'},'Ao recarregar, os dados reiniciam.'),
    el('button',{className:'reset-button',type:'button',onclick:()=>{
      store.reset();studentId='DEMO-ALUNO-1';flash='Demonstração reiniciada. Os materiais estão no cenário inicial.';navigate('#/aluno/catalogo');
    }},icon('refresh'),'Reiniciar demonstração')));
  const context={state,route,studentId,dispatch,navigate};
  const content=!['aluno','equipe'].includes(route.path[0])
    ? empty('Página não encontrada','Volte ao catálogo para continuar.',linkButton('Ver catálogo','#/aluno/catalogo'))
    : area==='aluno'?renderStudent(context):renderTeam(context);
  const main=el('main',{id:'conteudo',tabindex:'-1',className:'page'},
    el('div',{className:'context-row'},el('span',{},'Unistock',el('span',{},' / '),area==='aluno'?'Espaço do aluno':'Espaço da equipe'),
      area==='aluno'&&el('div',{className:'person-switch'},el('label',{for:'person-select'},'Pessoa fictícia:'),personSelect)),
    flash&&el('div',{className:'success-message',role:'status'},icon('check'),el('span',{},flash)),content,
    el('footer',{className:'page-footer'},el('span',{},'Unistock · Compartilhar faz a diferença.'),
      el('span',{},'Demonstração sem autenticação. A seleção de área ou pessoa não protege dados.')));
  flash='';
  app.replaceChildren(header,demoBar,area==='equipe'?el('div',{className:'team-layout'},
    el('aside',{className:'sidebar'},el('p',{className:'eyebrow'},'GESTÃO DE MATERIAIS'),navigation,
      el('div',{className:'sidebar-note'},icon('info'),el('p',{},'Um só acervo.',el('br'),'Mais possibilidades para todos.'))),main):main);
  if(focus) { (main.querySelector('h1') || main).focus({preventScroll:true});window.scrollTo(0,0); }
  document.title=`${main.querySelector('h1')?.textContent || 'Catálogo'} · Unistock`;
}
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();document.querySelector('main').focus();});
window.addEventListener('hashchange',()=>render());
render(false);
