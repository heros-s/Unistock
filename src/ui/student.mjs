import {availability, searchMaterials} from '../domain/inventory.mjs';
import {el, icon, field, errorSummary, showError, heading, notice, empty, linkButton} from './dom.mjs';
import {categories, materialIcon, descriptions, quantityText, requestCard} from './shared.mjs';

export function renderStudent(context) {
  const {state, route, studentId, dispatch, navigate} = context;
  const screen = route.path[1];
  const student = state.students.find(s => s.id === studentId);
  if (screen === 'catalogo') return catalog(context);
  if (screen === 'solicitacoes') {
    const requests = state.requests.filter(r => r.studentId === studentId).slice().reverse();
    return el('section', {}, heading('SEU ACOMPANHAMENTO', 'Minhas solicitações', 'Da primeira ideia à devolução. Acompanhe cada etapa por aqui.',
      linkButton('Explorar materiais', '#/aluno/catalogo', 'secondary')),
      notice(`Exibindo os pedidos de ${student.name}, pessoa fictícia. Esta seleção demonstrativa não protege dados.`),
      requests.length ? el('div', {className:'request-list'}, requests.map(r => requestCard(state,r))) :
        empty('Seu próximo projeto começa no catálogo', 'Quando você solicitar um material, poderá acompanhar o pedido aqui.', linkButton('Ver catálogo', '#/aluno/catalogo')));
  }
  if (screen === 'como-funciona') return guide();
  const material = state.materials.find(m => m.id === route.path[2]);
  if (!material) return empty('Material não encontrado', 'Volte ao catálogo para consultar os materiais da demonstração.', linkButton('Ver catálogo', '#/aluno/catalogo'));
  const count = availability(state, material.id);
  if (screen === 'material') return el('section', {}, back(),
    heading(categories[material.category], material.name, descriptions[material.category]),
    el('div', {className:'detail-layout'},
      el('div', {className:`material-detail-art ${material.category}`}, icon(materialIcon(material)), el('span', {}, material.name)),
      el('div', {className:'card detail-panel'}, el('span', {className:count ? 'badge available' : 'badge unavailable'}, count ? 'Disponível para solicitar' : 'Indisponível no momento'),
        el('h2', {}, quantityText(count, material.measure)),
        el('p', {className:'lead'}, material.category === 'consumable' ? 'Sem devolução. A quantidade efetivamente retirada será registrada no estoque.' : 'Exige devolução. Combine o prazo com a equipe e permita a conferência ao devolver.'),
        notice('A solicitação será analisada pela equipe. Aguarde a confirmação antes de retirar.'),
        count > 0 ? linkButton('Solicitar material', `#/aluno/solicitar/${material.id}`) : el('button', {className:'button',disabled:true}, 'Indisponível no momento'))));
  if (screen !== 'solicitar') return empty('Página não encontrada', 'Escolha uma opção na navegação.', back());
  if (!count) return empty('Indisponível no momento', 'Este material está sem unidades disponíveis na demonstração.', back());
  const id = crypto.randomUUID();
  const form = el('form', {className:'card form-card', novalidate:true}, errorSummary(),
    el('h2', {}, 'Conte um pouco sobre sua atividade'),
    el('p', {className:'muted'}, 'Preencha os campos abaixo. Todos são obrigatórios.'),
    el('div', {className:'form-grid two-cols'}, field({name:'name',label:'Nome do solicitante',value:student.name}),
      field({name:'course',label:'Turma / curso',value:student.course})),
    field({name:'quantity',label:`Quantidade (${material.measure})`,type:'number',value:1,min:1,max:count,step:1,
      hint:`Disponível agora: ${quantityText(count,material.measure)}. Solicite somente o necessário.`}),
    field({name:'purpose',label:'Finalidade',type:'textarea',hint:'Ex.: apresentação de trabalho, aula prática ou atividade acadêmica.'}),
    notice('Enviar a solicitação não reserva o material. A disponibilidade será conferida novamente na retirada.'),
    el('div', {className:'form-actions'}, linkButton('Voltar', `#/aluno/material/${material.id}`, 'ghost', 'back'),
      el('button', {className:'button primary',type:'submit'}, 'Enviar solicitação', icon('arrow'))));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = new FormData(form);
    try {
      dispatch('request',{id,studentId,materialId:material.id,name:values.get('name'),course:values.get('course'),
        quantity:Number(values.get('quantity')),purpose:values.get('purpose'),at:new Date().toISOString()});
      navigate('#/aluno/solicitacoes');
    } catch (error) { showError(form,error); }
  });
  return el('section', {}, back(), heading('NOVA SOLICITAÇÃO', 'O que você vai criar?', 'Peça o material para apoiar sua próxima atividade.'),
    el('div', {className:'form-layout'}, form,
      el('aside', {className:'card summary-card'}, el('div', {className:`summary-art ${material.category}`}, icon(materialIcon(material))),
        el('p', {className:'eyebrow'}, 'SEU MATERIAL'), el('h2', {}, material.name), el('p', {className:'muted'}, categories[material.category]),
        el('hr'), el('p', {}, icon('box'), ' ', quantityText(count,material.measure), ' disponíveis'),
        el('p', {}, icon(material.category === 'consumable' ? 'check' : 'refresh'), ' ', material.category === 'consumable' ? 'Sem devolução' : 'Exige devolução'),
        el('p', {className:'small muted'}, 'Um material por solicitação. Você pode fazer outros pedidos pelo catálogo.'))));
}

const back = () => linkButton('Voltar ao catálogo', '#/aluno/catalogo', 'text-button', 'back');

function catalog({state}) {
  let category = '', query = '';
  const resultLabel = el('p', {className:'result-count',role:'status','aria-live':'polite'});
  const grid = el('div', {className:'catalog-grid'});
  const tabs = el('div', {className:'category-tabs',role:'group','aria-label':'Filtrar por categoria'});
  const update = () => {
    const materials = searchMaterials(state,{category,query});
    resultLabel.textContent = `${materials.length} ${materials.length === 1 ? 'material encontrado' : 'materiais encontrados'}`;
    grid.replaceChildren(...materials.map(material => materialCard(state,material)));
    if (!materials.length) grid.append(empty('Nenhum material encontrado', 'Tente outro nome ou escolha uma categoria diferente.',
      el('button', {type:'button',className:'button secondary',onclick:()=>{
        query=''; category=''; search.value=''; updateTabs(); update(); search.focus();
      }}, 'Limpar filtros')));
  };
  const updateTabs = () => tabs.querySelectorAll('button').forEach(button => {
    const selected = button.dataset.category === category;
    button.setAttribute('aria-pressed',String(selected)); button.classList.toggle('selected',selected);
  });
  for (const [value,label] of [['','Todos os materiais'],...Object.entries(categories)]) {
    tabs.append(el('button', {type:'button','data-category':value,'aria-pressed':String(value===category),className:value===category?'selected':'',
      onclick:()=>{category=value;updateTabs();update();}}, label));
  }
  const search = el('input', {id:'search',type:'search',placeholder:'Busque por notebook, tesoura, cartolina…',
    oninput:event=>{query=event.target.value;update();}});
  update();
  return el('section', {},
    el('div', {className:'hero'},
      el('div', {className:'hero-copy'}, el('p', {className:'eyebrow'}, el('span',{className:'tiny-dot'}), 'CATÁLOGO DE MATERIAIS'),
        el('h1', {tabindex:'-1'}, 'Materiais disponíveis', el('br'), 'para sua atividade.'),
        el('p', {}, 'Consulte o que está disponível, solicite e retire na secretaria. Devolva os itens retornáveis no prazo combinado.'),
        el('a', {href:'#/aluno/como-funciona',className:'hero-link'}, 'Como funciona o empréstimo', icon('arrow')))),
    el('div', {className:'catalog-title'},el('div',{},el('p',{className:'eyebrow'},'EXPLORE O ACERVO'),el('h2',{},'O que você precisa hoje?')),
      el('p', {className:'muted small'}, icon('info'), ' Saldos fictícios para demonstração')),
    el('div', {className:'catalog-toolbar'}, el('div', {className:'search-box'},el('label',{for:'search',className:'sr-only'},'Buscar materiais'),icon('search'),search),resultLabel),
    tabs, grid,
    el('div', {className:'catalog-footer'},icon('book'),el('div',{},el('strong',{},'Cuidar também faz parte de compartilhar.'),
      el('p',{},'Retire somente o necessário e devolva os itens retornáveis no prazo combinado.')),el('a',{href:'#/aluno/como-funciona'},'Conheça as orientações',icon('arrow'))));
}

function materialCard(state, material) {
  const count = availability(state,material.id);
  return el('article', {className:`material-card ${!count?'out-of-stock':''}`},
    el('div', {className:`material-art ${material.category}`},
      icon(materialIcon(material)),
      el('span', {className:count?'stock-tag':'stock-tag zero'},el('span',{className:'status-dot'}),count?'Disponível':'Indisponível')),
    el('div', {className:'material-content'},el('span',{className:`category-label ${material.category}`},categories[material.category]),
      el('h3',{},material.name),el('p',{className:'material-description'},descriptions[material.category]),
      el('div',{className:'material-meta'},el('span',{},icon('box'),quantityText(count,material.measure)),
        el('span',{},icon(material.category==='consumable'?'check':'refresh'),material.category==='consumable'?'Sem devolução':'Devolver após o uso')),
      el('a',{href:`#/aluno/material/${material.id}`,className:'card-link'},'Ver material',icon('arrow'))));
}

function guide() {
  const steps = [
    ['Explore o catálogo','Consulte a categoria, a unidade de medida e a disponibilidade do material.'],
    ['Envie sua solicitação','Informe nome, turma ou curso, quantidade e finalidade. Solicite somente o necessário.'],
    ['Aguarde a confirmação','A equipe analisa o pedido. A solicitação e a confirmação são etapas anteriores à retirada.'],
    ['Retire com a equipe','A quantidade realmente entregue será registrada. Para retornáveis, combine a previsão de devolução.'],
    ['Devolva e compartilhe de novo','Devolva equipamentos e reutilizáveis no prazo combinado e permita a conferência. Consumo não exige devolução.']
  ];
  return el('section', {},heading('SIMPLES, DO COMEÇO AO FIM','Uma ideia. Cinco passos.','Os materiais da faculdade apoiam aulas, trabalhos e atividades acadêmicas.'),
    el('div',{className:'guide-steps'},steps.map(([title,description],index)=>el('article',{className:'card guide-step'},
      el('span',{className:'step-number'},String(index+1).padStart(2,'0')),el('div',{},el('h2',{},title),el('p',{className:'muted'},description))))),
    notice('Cuide dos itens durante o uso e informe imediatamente à equipe qualquer problema ou dano.'),
    linkButton('Explorar materiais','#/aluno/catalogo'));
}
