import {availability, availableUnits, returnable} from '../domain/inventory.mjs';
import {requestStatus} from '../domain/workflow.mjs';
import {DomainError} from '../domain/validation.mjs';
import {el, icon, field, errorSummary, showError, heading, notice, empty, linkButton, onSubmit} from './dom.mjs';
import {categories, measures, materialIcon, quantityText, requestCard, statusBadge, protocol, formatDate} from './shared.mjs';

export function renderTeam(context) {
  const {state,route,dispatch,navigate} = context;
  const screen=route.path[1];
  if (screen==='resumo') return overview(context);
  if (screen==='solicitacoes'||screen==='retiradas') return queue(context);
  if (screen==='materiais') return route.path[2]==='novo'?newMaterial(context):materials(context);
  if (screen==='brindes') return gifts(context);
  const request=state.requests.find(r=>r.id===route.path[2]);
  if (!request) return empty('Solicitação não encontrada','Escolha um pedido da lista para continuar.',linkButton('Ver solicitações','#/equipe/solicitacoes'));
  const material=state.materials.find(m=>m.id===request.materialId);
  const status=requestStatus(state,request.id);
  if(screen==='retirada') return status==='confirmed'?pickupForm(context,request,material):
    empty('Esta retirada não está disponível','O pedido precisa estar confirmado e ainda não pode ter sido retirado.',linkButton('Ver solicitação',`#/equipe/solicitacao/${request.id}`));
  if(screen==='devolucao') return status==='loaned'?returnForm(context,request,material):
    empty('Não há devolução para registrar','Apenas empréstimos retornáveis em aberto podem ser devolvidos.',linkButton('Ver solicitação',`#/equipe/solicitacao/${request.id}`));
  if(screen!=='solicitacao') return empty('Página não encontrada','Escolha uma opção no menu da equipe.',linkButton('Visão geral','#/equipe/resumo'));
  const actions=el('div',{className:'card-actions'});
  const page=el('section',{},linkButton('Voltar às solicitações','#/equipe/solicitacoes','text-button','back'),
    heading('ATENDIMENTO',protocol(request.id),'Confira o pedido e registre cada etapa separadamente.'),errorSummary(),requestCard(state,request),
    status==='requested'&&notice('A confirmação não reserva o material. A disponibilidade será conferida novamente na retirada.'),actions);
  if(status==='requested') actions.append(el('button',{type:'button',className:'button primary',onclick:async event=>{
    const button=event.currentTarget;
    if(button.disabled) return;
    button.disabled=true;button.setAttribute('aria-busy','true');
    // O servidor grava o horário da confirmação; aqui só evita relógio local atrasado em relação ao pedido.
    const at=new Date(Math.max(Date.now(),Date.parse(request.at))).toISOString();
    try{await dispatch('confirm',{requestId:request.id,at});navigate(`#/equipe/solicitacao/${request.id}`);}
    catch(error){button.disabled=false;button.removeAttribute('aria-busy');showError(page,error);}
  }},icon('check'),'Confirmar solicitação'));
  if(status==='confirmed') actions.append(linkButton('Registrar retirada',`#/equipe/retirada/${request.id}`));
  if(status==='loaned') actions.append(linkButton('Registrar devolução',`#/equipe/devolucao/${request.id}`));
  return page;
}

function overview(context) {
  const {state}=context;
  const counts=status=>state.requests.filter(r=>requestStatus(state,r.id)===status).length;
  const recent=state.requests.slice().reverse().slice(0,5);
  return el('section',{},heading('CADA MATERIAL, UMA POSSIBILIDADE','Tudo em seu devido lugar.','Acompanhe as solicitações e mantenha o acervo disponível para a próxima atividade.',
    linkButton('Cadastrar material','#/equipe/materiais/novo','secondary','plus')),
    el('div',{className:'stats'},[
      ['Aguardando confirmação','requested','clock','Pedidos para analisar','#/equipe/solicitacoes?status=requested'],
      ['Aguardando retirada','confirmed','box','Confirmação já registrada','#/equipe/retiradas?status=confirmed'],
      ['Empréstimos em aberto','loaned','refresh','Materiais a devolver','#/equipe/retiradas?status=loaned']
    ].map(([label,status,symbol,description,href])=>el('a',{href,className:'stat-card'},
      el('div',{className:'stat-top'},label,icon(symbol)),el('strong',{},counts(status)),el('span',{},description,' →')))),
    el('div',{className:'section-heading'},el('h2',{},'Solicitações recentes'),el('a',{href:'#/equipe/solicitacoes'},'Ver todas →')),
    recent.length?operationList(state,recent):empty('Um acervo pronto para novas ideias','Ainda não há solicitações. Explore a área do aluno e envie um pedido para experimentar o atendimento.',
      linkButton('Ir para a área do aluno','#/aluno/catalogo','secondary')),
    notice('Os registros ficam salvos no servidor e são compartilhados por toda a equipe.'));
}

function operationList(state,requests) {
  return el('div',{className:'operation-list'},requests.map(request=>{
    const material=state.materials.find(m=>m.id===request.materialId);
    return el('article',{className:'operation-row'},el('div',{className:'item-title'},
      el('span',{className:`item-icon ${material.category}`},icon(materialIcon(material))),
      el('div',{},el('h3',{},material.name),el('p',{},request.name,' · ',quantityText(request.quantity,material.measure)),el('p',{className:'protocol'},protocol(request.id)))),
      el('div',{className:'row-end'},statusBadge(requestStatus(state,request.id)),el('a',{href:`#/equipe/solicitacao/${request.id}`},'Abrir pedido ',icon('arrow'))));
  }));
}

function queue({state,route}) {
  const operations=route.path[1]==='retiradas';
  const selected=route.params.get('status')||(operations?'confirmed':'all');
  const choices=operations?[['confirmed','Aguardando retirada'],['loaned','Empréstimos em aberto'],['history','Histórico']]:
    [['all','Todos os pedidos'],['requested','Aguardando confirmação'],['confirmed','Confirmadas']];
  const requests=state.requests.filter(request=>{
    const status=requestStatus(state,request.id);
    return selected==='all'||(selected==='history'?['completed','returned'].includes(status):status===selected);
  }).slice().reverse();
  const base=operations?'retiradas':'solicitacoes';
  return el('section',{},heading('ATENDIMENTO',operations?'Retiradas e devoluções':'Solicitações',operations?
    'Registre a entrega, acompanhe os empréstimos e confira os materiais na devolução.':'Cada pedido é o começo de uma nova atividade. Confira os detalhes antes de confirmar.'),
    el('nav',{className:'category-tabs','aria-label':'Filtrar atendimentos'},choices.map(([value,label])=>
      el('a',{className:`button ${value===selected?'primary':'secondary'}`,href:`#/equipe/${base}?status=${value}`,'aria-current':value===selected?'page':null},label))),
    requests.length?operationList(state,requests):empty('Nenhum pedido nesta etapa','Os pedidos aparecem aqui conforme avançam no atendimento.',linkButton('Ver todos os pedidos','#/equipe/solicitacoes','secondary')));
}

function localNow() {
  const date=new Date(Math.ceil(Date.now()/1000)*1000);
  return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,19);
}
function localISO(value,fieldName) {
  const date=new Date(value);
  if(!value||!Number.isFinite(date.getTime())) throw new DomainError(fieldName,'Informe uma data e horário válidos.');
  return date.toISOString();
}
function formPage(request,title,description,form,summary) {
  return el('section',{},linkButton('Voltar ao pedido',`#/equipe/solicitacao/${request.id}`,'text-button','back'),
    heading(protocol(request.id),title,description),el('div',{className:'form-layout'},form,
      el('aside',{className:'card'},el('p',{className:'eyebrow'},'RESUMO DO PEDIDO'),el('h2',{},request.name),
        el('p',{className:'muted'},request.course),el('hr'),summary)));
}
function pickupForm({state,dispatch,navigate,personName},request,material) {
  const count=availability(state,material.id);
  const partial=notice('Cada pedido tem uma única retirada. O restante não ficará pendente para outra entrega.');
  partial.hidden=true;
  const quantity=field({name:'quantity',label:`Quantidade entregue (${material.measure})`,type:'number',value:Math.min(count,request.quantity),min:1,
    max:Math.min(count,request.quantity),step:1,hint:`Solicitado: ${request.quantity}. Disponível agora: ${count}.`});
  quantity.querySelector('input').addEventListener('input',event=>{partial.hidden=Number(event.target.value)>=request.quantity;});
  partial.hidden=Math.min(count,request.quantity)>=request.quantity;
  const codes=material.category==='equipment'?el('fieldset',{className:'checklist','data-error-field':'codes',tabindex:'-1','aria-describedby':'codes-error'},
    el('legend',{},'Unidades entregues'),availableUnits(state,material.id).map(unit=>el('label',{},
      el('input',{type:'checkbox',name:'codes',value:unit.code}),unit.code)),el('span',{id:'codes-error',className:'field-error'})):null;
  const form=el('form',{className:'card form-card',novalidate:true},errorSummary(),el('h2',{},material.name),quantity,partial,codes,
    field({name:'operator',label:'Pessoa responsável pelo registro',value:personName||''}),
    field({name:'at',label:'Data e horário da retirada',type:'datetime-local',value:localNow(),step:1}),
    returnable(material.category)&&field({name:'dueAt',label:'Previsão de devolução combinada',type:'datetime-local',step:1,hint:'Preencha o prazo combinado com a pessoa solicitante.'}),
    !returnable(material.category)&&notice('Material de consumo: a retirada encerra o pedido e reduz o estoque. Não há devolução.'),
    el('div',{className:'form-actions'},linkButton('Voltar',`#/equipe/solicitacao/${request.id}`,'ghost','back'),
      el('button',{type:'submit',className:'button primary'},'Registrar retirada',icon('check'))));
  onSubmit(form,async values=>{
    await dispatch('pickup',{requestId:request.id,quantity:Number(values.get('quantity')),codes:values.getAll('codes'),operator:values.get('operator'),
      at:localISO(values.get('at'),'at'),dueAt:returnable(material.category)?localISO(values.get('dueAt'),'dueAt'):null});
    navigate(`#/equipe/solicitacao/${request.id}`);
  });
  return formPage(request,'Registrar retirada','Confira a quantidade realmente entregue antes de concluir.',form,
    el('div',{},el('strong',{},material.name),el('p',{},quantityText(request.quantity,material.measure),' solicitadas'),
      el('p',{className:'small muted'},'A baixa acontece somente ao registrar esta entrega.')));
}

function returnForm({state,dispatch,navigate},request,material) {
  const pickup=state.pickups.find(p=>p.requestId===request.id);
  const condition=field({name:'condition',label:'Estado do material',value:'',options:[['','Selecione após conferir'],['ok','Conferido sem problemas'],['problem','Com problema, aguardar avaliação']]});
  const notes=field({name:'notes',label:'Observações da conferência',type:'textarea',required:false,hint:'Descreva o problema quando houver. Nesse caso, este campo é obrigatório.'});
  condition.querySelector('select').addEventListener('change',event=>{notes.querySelector('textarea').required=event.target.value==='problem';});
  const form=el('form',{className:'card form-card',novalidate:true},errorSummary(),el('h2',{},material.name),
    notice(`Devolução integral de ${quantityText(pickup.quantity,material.measure)}${pickup.codes.length?' · '+pickup.codes.join(', '):''}.`),
    field({name:'at',label:'Data e horário da devolução',type:'datetime-local',value:localNow(),step:1}),condition,notes,
    el('p',{className:'small muted'},'Materiais devolvidos com problema ficam indisponíveis, aguardando avaliação.'),
    el('div',{className:'form-actions'},linkButton('Voltar',`#/equipe/solicitacao/${request.id}`,'ghost','back'),
      el('button',{className:'button primary',type:'submit'},'Registrar devolução',icon('check'))));
  onSubmit(form,async values=>{
    await dispatch('return',{requestId:request.id,at:localISO(values.get('at'),'at'),condition:values.get('condition'),notes:values.get('notes')});
    navigate(`#/equipe/solicitacao/${request.id}`);
  });
  return formPage(request,'Registrar devolução','Receba, confira e registre o estado do material.',form,
    el('div',{},el('strong',{},material.name),el('p',{},quantityText(pickup.quantity,material.measure),' retiradas'),
      el('p',{className:'small muted'},'A disponibilidade só é recomposta após a conferência sem problemas.')));
}

function materials({state}) {
  return el('section',{},heading('ACERVO','Materiais e disponibilidade','Consulte o saldo, as unidades e os itens que aguardam avaliação.',linkButton('Cadastrar material','#/equipe/materiais/novo','primary','plus')),
    el('div',{className:'stock-list'},Object.entries(categories).map(([category,label])=>[
      el('div',{className:'section-heading'},el('h2',{},label)),
      state.materials.filter(m=>m.category===category).map(material=>{
        const units=state.units.filter(u=>u.materialId===material.id);
        const review=category==='equipment'?units.filter(u=>u.status==='review').length:
          state.returns.filter(r=>r.condition==='problem'&&state.requests.find(q=>q.id===r.requestId)?.materialId===material.id)
            .reduce((sum,r)=>sum+state.pickups.find(p=>p.requestId===r.requestId).quantity,0);
        return el('article',{className:'card stock-item'},el('div',{className:'request-top'},
          el('div',{className:'item-title'},el('span',{className:`item-icon ${category}`},icon(materialIcon(material))),
            el('div',{},el('h2',{},material.name),el('p',{className:'small muted'},'Unidade de medida: ',material.measure))),
          el('div',{className:'stock-numbers'},el('strong',{},availability(state,material.id)),el('small',{},'disponíveis · ',material.measure))),
          units.length>0&&el('div',{className:'unit-list'},units.map(u=>el('span',{},u.code,' · ',{available:'Disponível',loaned:'Emprestado',review:'Aguardando avaliação'}[u.status]))),
          review>0&&el('p',{className:'review-count'},icon('info'),' ',quantityText(review,material.measure),' aguardando avaliação'));
      })])),notice('Ajustes de saldo, reposições, correções e liberação de itens em avaliação ainda não estão disponíveis no sistema.'));
}

function newMaterial({dispatch,navigate}) {
  const category=field({name:'category',label:'Categoria',value:'equipment',options:Object.entries(categories),
    hint:'Equipamentos e reutilizáveis exigem devolução. Consumo e brindes saem do estoque sem devolução; brindes não aparecem para o aluno.'});
  const measure=field({name:'measure',label:'Unidade de medida',value:'unidade',options:measures});
  const codes=field({name:'codes',label:'Números de patrimônio',type:'textarea',hint:'Um por linha, um para cada unidade. Ex.: 9501.'});
  const update=()=>{const equipment=category.querySelector('select').value==='equipment';
    codes.hidden=!equipment;codes.querySelector('textarea').required=equipment;
    measure.querySelector('select').disabled=equipment;if(equipment)measure.querySelector('select').value='unidade';};
  category.querySelector('select').addEventListener('change',update);update();
  const form=el('form',{className:'card form-card',novalidate:true},errorSummary(),
    field({name:'name',label:'Nome do material'}),el('div',{className:'form-grid two-cols'},category,measure),
    field({name:'quantity',label:'Saldo inicial',type:'number',value:0,min:0,step:1}),codes,
    notice('Equipamentos precisam de um número de patrimônio único para cada unidade; saldo zero não exige números. Depois do cadastro, categoria, unidade de medida e saldo não podem ser editados.'),
    el('div',{className:'form-actions'},linkButton('Voltar','#/equipe/materiais','ghost','back'),el('button',{className:'button primary',type:'submit'},'Cadastrar material',icon('plus'))));
  const id=crypto.randomUUID();
  onSubmit(form,async values=>{
    const selected=values.get('category');
    await dispatch('material',{id,name:values.get('name'),category:selected,measure:selected==='equipment'?'unidade':values.get('measure'),quantity:Number(values.get('quantity')),
      codes:selected==='equipment'?String(values.get('codes')).split(/\r?\n/).map(s=>s.trim()).filter(Boolean):[]});
    navigate(selected==='gift'?'#/equipe/brindes':'#/equipe/materiais');
  });
  return el('section',{},heading('ACERVO','Cadastrar material','Defina a categoria e a unidade de medida antes de disponibilizar o item.'),
    el('div',{className:'narrow-form'},form));
}

function gifts({state,dispatch,navigate,personName}) {
  const list=state.materials.filter(m=>m.category==='gift');
  const stocked=list.filter(m=>availability(state,m.id)>0);
  const history=state.giftOuts.slice().sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
  const id=crypto.randomUUID();
  const material=field({name:'materialId',label:'Brinde',value:stocked[0]?.id||'',
    options:stocked.map(m=>[m.id,`${m.name} (${quantityText(availability(state,m.id),m.measure)})`])});
  const form=el('form',{className:'card form-card',novalidate:true},errorSummary(),el('h2',{},'Registrar saída de brinde'),
    material,field({name:'quantity',label:'Quantidade entregue',type:'number',value:1,min:1,step:1}),
    field({name:'recipient',label:'Entregue para',hint:'Pessoa, setor ou evento que recebeu o brinde.'}),
    field({name:'operator',label:'Pessoa responsável pelo registro',value:personName||''}),
    field({name:'at',label:'Data e horário da entrega',type:'datetime-local',value:localNow(),step:1}),
    field({name:'notes',label:'Observações',type:'textarea',required:false}),
    el('div',{className:'form-actions'},el('button',{type:'submit',className:'button primary'},'Registrar saída',icon('check'))));
  onSubmit(form,async values=>{
    await dispatch('gift',{id,materialId:values.get('materialId'),quantity:Number(values.get('quantity')),recipient:values.get('recipient'),
      operator:values.get('operator'),at:localISO(values.get('at'),'at'),notes:values.get('notes')});
    navigate('#/equipe/brindes');
  });
  const materialOf=materialId=>state.materials.find(m=>m.id===materialId);
  return el('section',{},heading('BRINDES','Brindes','Registre a entrega de brindes. Eles não aparecem no catálogo do aluno e não têm devolução.',
    linkButton('Cadastrar brinde','#/equipe/materiais/novo','secondary','plus')),
    el('div',{className:'form-layout'},
      stocked.length?form:empty('Nenhum brinde disponível','Cadastre um brinde com saldo para registrar entregas.',linkButton('Cadastrar material','#/equipe/materiais/novo','secondary','plus')),
      el('aside',{className:'card'},el('p',{className:'eyebrow'},'SALDO'),
        list.length?el('ul',{className:'gift-stock'},list.map(m=>el('li',{},el('span',{},m.name),el('strong',{},quantityText(availability(state,m.id),m.measure))))):
          el('p',{className:'muted'},'Nenhum brinde cadastrado.'))),
    el('div',{className:'section-heading'},el('h2',{},'Entregas registradas')),
    history.length?el('div',{className:'operation-list'},history.map(out=>{
      const m=materialOf(out.materialId);
      return el('article',{className:'operation-row'},el('div',{className:'item-title'},
        el('span',{className:'item-icon gift'},icon('gift')),
        el('div',{},el('h3',{},m?m.name:'Brinde'),el('p',{},out.recipient,' · ',quantityText(out.quantity,m?m.measure:'unidade')),
          el('p',{className:'small muted'},formatDate(out.at),' · registrado por ',out.operator,out.notes?` · ${out.notes}`:''))));
    })):empty('Nenhuma entrega registrada','As saídas de brindes aparecem aqui assim que forem registradas.'));
}
