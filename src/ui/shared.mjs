import {el, icon, linkButton} from './dom.mjs';
import {requestStatus} from '../domain/workflow.mjs';
import {returnable} from '../domain/inventory.mjs';

export const categories = {equipment:'Equipamentos', reusable:'Materiais reutilizáveis', consumable:'Materiais de consumo', gift:'Brindes'};
// Brindes ficam fora do catálogo do aluno: só a equipe registra a saída.
export const studentCategories = Object.fromEntries(Object.entries(categories).filter(([key]) => key !== 'gift'));
export const measures = [['unidade','Unidade'],['caixa','Caixa'],['pacote','Pacote'],['rolo','Rolo'],['kit','Kit'],['folha','Folha']];
const iconsById = {projetor:'projector',computador:'laptop',notebook:'laptop',tesoura:'scissors',regua:'ruler',
  'lapis-de-cor':'pencil',lapis:'pencil','caneta-azul':'pencil','caneta-preta':'pencil','caneta-bic-caixa':'pencil',
  'papel-a4-branco':'paper','papel-a4-verde':'paper','papel-a4-rosa':'paper','papel-fotografico':'paper',cartolina:'paper','post-it':'paper'};
export const materialIcon = material => iconsById[material.id]
  || ({equipment:'laptop',reusable:'ruler',consumable:'box',gift:'gift'})[material.category];
export const descriptions = {equipment:'Tecnologia para apresentar, criar e aprender.', reusable:'Use na sua atividade e devolva para a próxima ideia.',
  consumable:'O essencial para dar forma aos seus projetos.', gift:'Entregue pela equipe em eventos e ações da instituição.'};
export const statusLabels = {requested:'Aguardando confirmação',confirmed:'Confirmada',loaned:'Retirada registrada',
  completed:'Concluída · sem devolução',returned:'Devolução registrada'};
export const statusBadge = status => el('span', {className:`badge status-${status}`}, el('span', {className:'status-dot'}), statusLabels[status]);
export const formatDate = value => new Intl.DateTimeFormat('pt-BR', {dateStyle:'short',timeStyle:'short'}).format(new Date(value));
export const quantityText = (number, measure) => `${number} ${measure}${number === 1 ? '' : 's'}`;
export const protocol = id => 'UNI-' + id.slice(0,8).toUpperCase();
const detail = (label, value) => el('div', {}, el('dt', {}, label), el('dd', {}, value));

export function requestCard(state, request, team = false) {
  const material = state.materials.find(m => m.id === request.materialId);
  const status = requestStatus(state, request.id);
  const pickup = state.pickups.find(p => p.requestId === request.id);
  const confirmation = state.confirmations.find(c => c.requestId === request.id);
  const returned = state.returns.find(r => r.requestId === request.id);
  const events = [
    ['Solicitação enviada', request.at],
    ['Confirmada', confirmation?.at],
    ['Retirada registrada', pickup?.at],
    ...(returnable(material.category) ? [['Devolução registrada', returned?.at]] : [])
  ];
  return el('article', {className:'request-card card'},
    el('div', {className:'request-top'},
      el('div', {className:'item-title'}, el('span', {className:`item-icon ${material.category}`}, icon(materialIcon(material))),
        el('div', {}, el('span', {className:'protocol'}, protocol(request.id)), el('h2', {}, material.name))), statusBadge(status)),
    el('dl', {className:'details-grid'},
      detail('Solicitante', request.name), detail('Turma / curso', request.course),
      detail('Quantidade solicitada', quantityText(request.quantity, material.measure)),
      detail('Quantidade retirada', pickup ? quantityText(pickup.quantity, material.measure) : 'Aguardando retirada'),
      pickup?.dueAt && detail('Devolução combinada', formatDate(pickup.dueAt)),
      pickup && detail('Registro por', pickup.operator),
      pickup?.codes.length > 0 && detail('Unidades', pickup.codes.join(', '))),
    el('div', {className:'purpose'}, el('span', {className:'label'}, 'Finalidade'), el('p', {}, request.purpose)),
    pickup && pickup.quantity < request.quantity && el('p', {className:'small muted'},
      'Foi entregue uma quantidade menor. O restante não fica pendente para outra retirada.'),
    returned && el('div', {className:returned.condition === 'problem' ? 'review-note' : 'good-note'},
      icon(returned.condition === 'problem' ? 'info' : 'check'),
      el('div', {}, el('strong', {}, returned.condition === 'problem' ? 'Aguardando avaliação' : 'Material conferido sem problemas'),
        returned.notes && el('p', {}, returned.notes))),
    el('ol', {className:'timeline', 'aria-label':'Etapas da solicitação'}, events.map(([label, at]) =>
      el('li', {className:at ? 'done' : ''}, el('span', {className:'step-dot'}, at ? icon('check') : ''),
        el('span', {}, el('strong', {}, label), el('small', {}, at ? formatDate(at) : 'Ainda não registrada'))))),
    team && el('div', {className:'card-actions'},
      linkButton('Abrir solicitação', `#/equipe/solicitacao/${request.id}`, 'secondary')));
}
