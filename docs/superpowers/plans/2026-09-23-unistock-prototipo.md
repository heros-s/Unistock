# Unistock — protótipo das duas áreas: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar um protótipo navegável no qual aluno e equipe percorrem solicitação, confirmação, retirada e devolução usando o mesmo estado demonstrativo.

**Architecture:** Aplicação estática com módulos ES, navegação por hash e estado em memória. Funções de domínio validam as operações antes de retornar um novo estado; telas não alteram saldos diretamente. Um servidor HTTP local serve somente os arquivos do protótipo, sem backend de negócio.

**Tech Stack:** HTML, CSS e JavaScript; Node.js com `node:test` e `node:assert/strict` para testes. Ambiente inspecionado: Node v22.22.3 e npm 10.9.8. Não instalar dependências de produto ou frameworks para este recorte.

**Spec:** [Desenho aprovado](../specs/2026-09-23-unistock-prototipo-design.md). Ler também [AGENTS.md](../../../AGENTS.md), [guia](../../../guia_emprestimo_materiais.md) e [briefing](../../../briefing_controle_materiais.md).

## Global Constraints

Trechos abaixo transcritos da especificação; valem para todas as tarefas:

- “O protótipo não terá autenticação, servidor, integração externa nem inventário real.” Aqui, servidor significa backend de negócio; um servidor estático local é necessário para carregar módulos ES no navegador.
- “Usar HTML, CSS e JavaScript em módulos, sem dependências externas para executar a experiência.”
- “Usar pessoas fictícias, códigos com prefixo DEMO e datas explicitamente demonstrativas.”
- “Não importar a planilha nem tratar os saldos do briefing como estoque real.”
- “Não completar o ano do exemplo de 23/09.”
- “A confirmação não registrará retirada nem alterará estoque.”
- “O protótipo aceitará uma única retirada por solicitação.”
- “O primeiro protótipo demonstrará devolução integral e uma única vez, identificando as unidades retornadas quando aplicável.”
- “Ao recarregar, os dados retornarão ao cenário inicial; a interface informará esse comportamento e oferecerá “Reiniciar demonstração”.”

Textos de produto em português. As três categorias serão Equipamentos, Materiais reutilizáveis e Materiais de consumo. Não adicionar autenticação fictícia, reservas, multas, prazos automáticos, exclusão de movimentos, importação, exportação ou persistência local.

## Review Focus

1. Dois pedidos disputam a última unidade: só uma retirada deve acontecer, sem perda do pedido restante. Teste na tarefa 2.
2. Clique repetido ou formulário desatualizado: nenhum registro pode ser duplicado nem reduzir o saldo duas vezes. Testes nas tarefas 2 e 5.
3. Texto digitado contém HTML, acentos ou espaços: deve permanecer texto, com busca tolerante a acentos e validação de campos vazios. Testes e prova visual na tarefa 3.
4. Códigos equivalentes e unidades de outro material: rejeitar repetição após normalização e impedir a entrega de unidade incorreta. Testes nas tarefas 1 e 2.
5. Datas inválidas ou fora de ordem e devolução com problema: rejeitar cronologia incoerente e nunca liberar um material aguardando avaliação. Testes nas tarefas 2 e 4.

## Preparação e limites da execução

- O repositório está na branch `main`, sem commits; os documentos originais estão não rastreados. Não incluir esses arquivos em commits por meio de `git add .`.
- Seguir a habilidade de worktrees na execução, considerando esse estado inicial; não tentar criar worktree de um HEAD inexistente nem alterar arquivos originais para obter isolamento.
- Os únicos arquivos alterados nesta etapa de planejamento são a especificação e este plano. Código e testes abaixo serão criados durante a execução autorizada.
- As rotinas de empréstimo precisam de testes de domínio. Estilo e conteúdo estático terão inspeção visual e por teclado, sem testes que simplesmente reproduzam CSS ou marcação.
- Este plano recomenda execução nativa, pois as duas interfaces dependem diretamente do mesmo modelo pequeno. A escolha do método ocorre na revisão do plano.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `package.json` | Comandos `start`, `test` e `check`, sem dependências |
| `index.html` | Documento em português, raiz da aplicação e carregamento dos módulos |
| `scripts/serve.mjs` | Servir lista explícita de arquivos estáticos somente em loopback |
| `scripts/check.mjs` | Executar `node --check` nos módulos do projeto |
| `src/domain/validation.mjs` | Erros por campo, texto obrigatório, quantidade e data |
| `src/domain/inventory.mjs` | Cadastro, disponibilidade e unidades disponíveis |
| `src/domain/workflow.mjs` | Solicitar, confirmar, entregar, devolver e derivar status |
| `src/demo.mjs` | Pessoas e materiais fictícios, sem movimentações iniciais ocultas |
| `src/store.mjs` | Estado compartilhado, despacho de comandos e reinício |
| `src/main.mjs` | Navegação, área ativa, pessoa fictícia e shell |
| `src/ui/dom.mjs` | Construção segura de elementos e campos acessíveis |
| `src/ui/student.mjs` | Catálogo, detalhes, solicitação, acompanhamento e guia |
| `src/ui/team.mjs` | Resumo, pedidos, retiradas, devoluções e materiais |
| `src/styles.css` | Identidade visual, estados de foco e layout responsivo |
| `tests/inventory.test.mjs` | Cadastro, códigos, disponibilidade e isolamento do seed |
| `tests/workflow.test.mjs` | Regras e transições operacionais |
| `tests/store.test.mjs` | Integração entre comandos, leitura e reinício |
| `tests/server.test.mjs` | Rotas estáticas e bloqueio de arquivos alheios à aplicação |
| `README.md` | Execução, natureza demonstrativa e roteiro das duas áreas |
| `docs/prototype-validation.md` | Evidências reais de testes e inspeção visual |

## Contratos compartilhados

Todos os identificadores são strings. As funções de domínio recebem estado e payload, não acessam DOM ou relógio e não mutam o estado recebido. Em sucesso, retornam outro estado. Em erro, lançam `DomainError` com `field` e mensagem em português. A UI fornece `id` via `crypto.randomUUID()` e `at` via `new Date().toISOString()` para eventos automáticos, sempre sob a faixa de demonstração.

```js
// Formatos documentados em JSDoc nos módulos que os possuem.
// Category = 'equipment' | 'reusable' | 'consumable'
// Condition = 'ok' | 'problem'
// UnitStatus = 'available' | 'loaned' | 'review'
// Material = { id, name, category, measure }
// Unit = { code, materialId, status: UnitStatus }
// Student = { id, name, course }
// Request = { id, studentId, name, course, materialId, quantity, purpose, at }
// Confirmation = { requestId, at }
// Pickup = { requestId, quantity, codes: string[], at, dueAt: string|null, operator }
// Return = { requestId, at, condition: Condition, notes }
// Movement = { materialId, requestId: string|null, kind: 'initial'|'out'|'in', delta }
// State = { materials, units, students, requests, confirmations, pickups, returns, movements }
// Todos os arrays começam vazios em emptyState().

// inventory.mjs
// emptyState(): State
// addMaterial(state, {id,name,category,measure,quantity,codes}): State
// availability(state, materialId): number
// availableUnits(state, materialId): Unit[]
// workflow.mjs
// requestMaterial(state, Request): State
// confirmRequest(state, {requestId,at}): State
// recordPickup(state, Pickup): State
// recordReturn(state, Return): State
// requestStatus(state, requestId): 'requested'|'confirmed'|'loaned'|'completed'|'returned'
// demo.mjs
// createDemoState(): State
// store.mjs
// createStore(seed = createDemoState): {getState, dispatch, reset}
// getState(): State (cópia; leitura externa não muda o estado interno)
// dispatch(command, payload): State; command em 'request'|'confirm'|'pickup'|'return'|'material'
// reset(): State
```

### Tarefa 1: inventário demonstrativo confiável

**Arquivos:** criar `package.json`, `src/domain/validation.mjs`, `src/domain/inventory.mjs`, `src/demo.mjs`, `tests/inventory.test.mjs`.

**Consome:** contratos acima, sem dependências de outras tarefas.

**Produz:** `emptyState`, `addMaterial`, `availability`, `availableUnits`, `DomainError`, `requiredText`, `positiveInteger`, `validDate`, `createDemoState`.

- [ ] **1. Criar comandos de teste e exemplos verificáveis.**

```json
{
  "name": "unistock-prototype",
  "private": true,
  "scripts": {
    "start": "node scripts/serve.mjs",
    "test": "node --test tests/*.test.mjs",
    "check": "node scripts/check.mjs"
  }
}
```

`start` e `check` serão habilitados quando seus scripts forem entregues, nas tarefas 3 e 5. Criar o teste abaixo antes dos módulos:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState, addMaterial, availability} from '../src/domain/inventory.mjs';
import {createDemoState} from '../src/demo.mjs';

const item = (changes = {}) => ({id:'m', name:'Notebook de demonstração',
  category:'equipment', measure:'unidade', quantity:1, codes:['DEMO-N-01'], ...changes});

test('cadastro não muda o estado anterior e deriva a disponibilidade', () => {
  const before = emptyState();
  const after = addMaterial(before, item());
  assert.equal(before.materials.length, 0);
  assert.equal(availability(after, 'm'), 1);
});
test('códigos são únicos após normalização, inclusive entre materiais', () => {
  assert.throws(() => addMaterial(emptyState(), item({quantity:2,
    codes:['demo-n-01', ' DEMO-N-01 ']})), /código/i);
  const state = addMaterial(emptyState(), item());
  assert.throws(() => addMaterial(state, item({id:'outro'})), /código/i);
});
test('rejeita cadastro incoerente', () => {
  for (const changes of [{quantity:-1},{quantity:1.5},{name:' '},
    {category:'outra'},{quantity:2},{codes:['N01']}]) {
    assert.throws(() => addMaterial(emptyState(), item(changes)));
  }
});
test('saldo zero é permitido e cada demonstração é independente', () => {
  const state = addMaterial(emptyState(), item({quantity:0,codes:[]}));
  assert.equal(availability(state,'m'),0);
  const first = createDemoState();
  first.materials.length = 0;
  assert.ok(createDemoState().materials.length > 0);
});
```

- [ ] **2. Executar `node --test tests/inventory.test.mjs`.** Esperado: falha por módulos ainda inexistentes; não confundir isso com falha de ambiente.

- [ ] **3. Implementar validação e inventário.** Usar este núcleo e adicionar a validação de unicidade de `id`, campos obrigatórios e categoria antes do clone:

```js
// validation.mjs
export class DomainError extends Error {
  constructor(field, message) { super(message); this.name='DomainError'; this.field=field; }
}
export function requiredText(value, field) {
  if (typeof value !== 'string' || !value.trim())
    throw new DomainError(field, 'Preencha este campo.');
  return value.trim();
}
export function positiveInteger(value, field='quantity') {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new DomainError(field, 'Informe uma quantidade inteira maior que zero.');
  return value;
}
export function validDate(value, field='at') {
  if (typeof value !== 'string' || !value || !Number.isFinite(Date.parse(value)))
    throw new DomainError(field, 'Informe uma data e horário válidos.');
  return new Date(value).toISOString();
}
// inventory.mjs: importar DomainError e requiredText de validation.mjs.
export const emptyState = () => ({materials:[], units:[], students:[], requests:[],
  confirmations:[], pickups:[], returns:[], movements:[]});
export const availableUnits = (s,id) => s.units.filter(u => u.materialId===id && u.status==='available');
export function availability(s,id) {
  const material = s.materials.find(m => m.id===id);
  if (!material) throw new DomainError('materialId','Material não encontrado.');
  return material.category==='equipment' ? availableUnits(s,id).length
    : s.movements.filter(m => m.materialId===id).reduce((sum,m) => sum+m.delta,0);
}
export function addMaterial(s,input) {
  const id=requiredText(input.id,'id');
  if(s.materials.some(m=>m.id===id)) throw new DomainError('id','Material já cadastrado.');
  const name=requiredText(input.name,'name'), measure=requiredText(input.measure,'measure');
  const {category,quantity}=input;
  if(!['equipment','reusable','consumable'].includes(category))
    throw new DomainError('category','Selecione uma categoria válida.');
  if(!Number.isSafeInteger(quantity)||quantity<0)
    throw new DomainError('quantity','Informe um saldo inteiro igual ou maior que zero.');
  const codes=(input.codes??[]).map(code=>requiredText(code,'codes').toUpperCase());
  if(category==='equipment') {
    if(measure!=='unidade') throw new DomainError('measure','Equipamentos usam unidade nesta demonstração.');
    if(codes.length!==quantity || new Set(codes).size!==codes.length ||
      codes.some(code=>!/^DEMO-[A-Z0-9-]+$/.test(code)||s.units.some(u=>u.code===code)))
      throw new DomainError('codes','Informe um código DEMO único para cada unidade.');
  } else if(codes.length) throw new DomainError('codes','Use códigos somente para equipamentos.');
  const next=structuredClone(s);
  next.materials.push({id,name,category,measure});
  next.movements.push({materialId:id,requestId:null,kind:'initial',delta:quantity});
  next.units.push(...codes.map(code=>({code,materialId:id,status:'available'})));
  return next;
}
```

Criar o seed exclusivamente por `addMaterial`, sem copiar a planilha:

```js
// demo.mjs
import {emptyState,addMaterial} from './domain/inventory.mjs';
export function createDemoState() {
  let state=emptyState();
  for(const item of [
    {id:'notebook',name:'Notebook',category:'equipment',measure:'unidade',quantity:2,codes:['DEMO-N-01','DEMO-N-02']},
    {id:'projetor',name:'Projetor',category:'equipment',measure:'unidade',quantity:0,codes:[]},
    {id:'tesoura',name:'Tesoura',category:'reusable',measure:'unidade',quantity:4,codes:[]},
    {id:'regua',name:'Régua',category:'reusable',measure:'unidade',quantity:6,codes:[]},
    {id:'cartolina',name:'Cartolina',category:'consumable',measure:'unidade',quantity:12,codes:[]},
    {id:'lapis',name:'Lápis de cor',category:'consumable',measure:'caixa',quantity:3,codes:[]}
  ]) state=addMaterial(state,item);
  state.students=[{id:'DEMO-ALUNO-1',name:'Ana Exemplo',course:'Design — Turma A'},
    {id:'DEMO-ALUNO-2',name:'Bruno Exemplo',course:'Administração — Turma B'}];
  return state;
}
```

- [ ] **4. Rodar `node --test tests/inventory.test.mjs`.** Todos devem passar; examinar que cadastro inválido não alterou arrays do estado de entrada.
- [ ] **5. Commit da entrega**, se o Git estiver disponível para escrita: `git add package.json src/domain/validation.mjs src/domain/inventory.mjs src/demo.mjs tests/inventory.test.mjs` e `git commit -m "feat: add demo inventory domain"`. Se houver restrição de escrita em `.git`, registrar a limitação sem interromper arquivos e testes autorizados.

### Tarefa 2: ciclo completo sem baixa duplicada

**Arquivos:** criar `src/domain/workflow.mjs`, `src/store.mjs`, `tests/workflow.test.mjs`, `tests/store.test.mjs`.

**Consome:** inventário, validação e seed da tarefa 1.

**Produz:** todas as funções de workflow e store definidas em Contratos compartilhados. `requestStatus` deriva status dos eventos; nenhum campo de status editável na solicitação.

- [ ] **1. Criar testes de jornada, conflito e atomicidade.** Usar o setup abaixo em `tests/workflow.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState} from '../src/demo.mjs';
import {availability} from '../src/domain/inventory.mjs';
import {requestMaterial,confirmRequest,recordPickup,recordReturn,requestStatus} from '../src/domain/workflow.mjs';
const at='2026-10-05T12:00:00.000Z'; // Data de teste fictícia, sem relação com o briefing.
function pending(id='r1',materialId='notebook',quantity=1) {
  return {id,studentId:'DEMO-ALUNO-1',name:'Ana Exemplo',course:'Design',
    materialId,quantity,purpose:'Atividade demonstrativa',at};
}
function confirmed(s,id='r1',materialId='notebook',quantity=1) {
  return confirmRequest(requestMaterial(s,pending(id,materialId,quantity)),{requestId:id,at});
}
const pickup=(requestId='r1',changes={})=>({requestId,quantity:1,codes:['DEMO-N-01'],
  at,dueAt:'2026-10-05T15:00:00.000Z',operator:'Equipe Exemplo',...changes});
const returned=(changes={})=>({requestId:'r1',at:'2026-10-05T14:00:00.000Z',
  condition:'ok',notes:'Conferido na demonstração',...changes});

test('solicitação e confirmação não diminuem saldo; retirada e devolução sim',()=>{
  let s=confirmed(createDemoState());
  assert.equal(availability(s,'notebook'),2);
  s=recordPickup(s,pickup());
  assert.equal(availability(s,'notebook'),1);
  assert.equal(requestStatus(s,'r1'),'loaned');
  s=recordReturn(s,returned());
  assert.equal(availability(s,'notebook'),2);
  assert.equal(requestStatus(s,'r1'),'returned');
  assert.throws(()=>recordReturn(s,returned()),/devolução/i);
});
test('última caixa só pode ser entregue uma vez; falha não altera estado',()=>{
  let s=confirmed(createDemoState(),'r1','lapis',3);
  s=confirmed(s,'r2','lapis',3);
  s=recordPickup(s,pickup('r1',{quantity:3,codes:[],dueAt:null}));
  const snapshot=structuredClone(s);
  assert.equal(availability(s,'lapis'),0);
  assert.equal(requestStatus(s,'r1'),'completed');
  assert.throws(()=>recordPickup(s,pickup('r2',{quantity:3,codes:[],dueAt:null})),/dispon/i);
  assert.throws(()=>recordPickup(s,pickup('r1',{quantity:3,codes:[],dueAt:null})),/retirada/i);
  assert.throws(()=>recordReturn(s,returned()),/consumo/i);
  assert.deepEqual(s,snapshot);
});
test('devolução com problema não libera equipamento nem reutilizável',()=>{
  for(const materialId of ['notebook','tesoura']) {
    let s=confirmed(createDemoState(),'r1',materialId);
    const original=availability(s,materialId);
    s=recordPickup(s,pickup('r1',{codes:materialId==='notebook'?['DEMO-N-01']:[]}));
    s=recordReturn(s,returned({condition:'problem',notes:'Problema fictício para avaliação'}));
    assert.equal(availability(s,materialId),original-1);
    if(materialId==='notebook') assert.equal(s.units.find(u=>u.code==='DEMO-N-01').status,'review');
  }
});
test('rejeita unidade incorreta, datas incoerentes e confirmação duplicada',()=>{
  const s=confirmed(createDemoState());
  assert.throws(()=>confirmRequest(s,{requestId:'r1',at}),/confirma/i);
  for(const change of [{codes:['DEMO-INEXISTENTE']},{codes:['DEMO-N-01','DEMO-N-01']},
    {at:'data inválida'},{dueAt:'2026-10-04T12:00:00.000Z'},
    {at:'2026-10-04T12:00:00.000Z'},{quantity:0},{quantity:2},{operator:' '}])
    assert.throws(()=>recordPickup(s,pickup('r1',change)));
  const out=recordPickup(s,pickup());
  assert.throws(()=>recordReturn(out,returned({at:'2026-10-04T12:00:00.000Z'})),/data|horário/i);
});
test('entrega menor registra só a quantidade entregue e não aceita segunda retirada',()=>{
  let s=confirmed(createDemoState(),'r1','tesoura',3);
  s=recordPickup(s,pickup('r1',{quantity:2,codes:[]}));
  assert.equal(s.requests[0].quantity,3);
  assert.equal(s.pickups[0].quantity,2);
  assert.equal(availability(s,'tesoura'),2);
  assert.throws(()=>recordPickup(s,pickup('r1',{codes:[]})),/retirada/i);
  s=recordReturn(s,returned());
  assert.equal(availability(s,'tesoura'),4);
});
test('bloqueia pedido duplicado, aluno inexistente e quantidade maior que saldo',()=>{
  const initial=createDemoState();
  const once=requestMaterial(initial,pending());
  assert.throws(()=>requestMaterial(once,pending()),/solicitação/i);
  for(const change of [{studentId:'ausente'},{quantity:0},{quantity:1.5},
    {quantity:3},{name:' '},{course:' '},{purpose:' '},{at:'inválida'}])
    assert.throws(()=>requestMaterial(initial,{...pending(),...change}));
});
```

Acrescentar os testes abaixo, incluindo `addMaterial` no import de inventário:

```js
test('não entrega unidade que pertence a outro material',()=>{
  let s=addMaterial(createDemoState(),{id:'camera',name:'Câmera',category:'equipment',
    measure:'unidade',quantity:1,codes:['DEMO-C-01']});
  s=confirmed(s);
  const before=structuredClone(s);
  assert.throws(()=>recordPickup(s,pickup('r1',{codes:['DEMO-C-01']})),
    error=>error.field==='codes');
  assert.deepEqual(s,before);
});
test('não pula confirmação nem registra confirmação anterior ao pedido',()=>{
  const s=requestMaterial(createDemoState(),pending());
  const before=structuredClone(s);
  assert.throws(()=>recordPickup(s,pickup()),/confirma/i);
  assert.throws(()=>confirmRequest(s,{requestId:'r1',at:'2026-10-04T12:00:00Z'}),
    error=>error.field==='at');
  assert.deepEqual(s,before);
});
```

- [ ] **2. Rodar `node --test tests/workflow.test.mjs`.** Esperado: falha pela ausência do workflow.

- [ ] **3. Implementar as transições na ordem da tabela.** Validar tudo antes de clonar e anexar eventos. Validar as datas por `validDate`; para comparações, usar `Date.parse`. Mensagens de repetição devem citar a etapa para serem compreensíveis.

| Função | Validações e mutação permitida |
| --- | --- |
| `requestMaterial` | `id` único; aluno/material existentes; nome, curso e finalidade não vazios; quantidade inteira positiva ≤ disponível; data válida; inserir somente solicitação |
| `confirmRequest` | Pedido existente, sem confirmação anterior; data ≥ solicitação; inserir somente confirmação |
| `recordPickup` | Pedido confirmado, sem retirada; responsável preenchido; quantidade ≤ solicitada e disponível; data ≥ confirmação; em retornáveis previsão ≥ retirada; códigos únicos, pertencentes ao material e disponíveis; consumo não recebe previsão; inserir retirada, saída e atualizar unidades |
| `recordReturn` | Retirada retornável existente, sem devolução; data ≥ retirada; condição `ok` ou `problem`; notas obrigatórias para problema; inserir devolução; somente `ok` produz movimento de entrada; unidades passam para `available` ou `review` |

Usar os núcleos abaixo após validação; todos os payloads gravados devem conter apenas os campos definidos no contrato, com texto normalizado:

```js
// Trecho de recordPickup: s = estado recebido; p = payload já validado.
const next=structuredClone(s);
next.pickups.push(p);
next.movements.push({materialId:request.materialId,requestId:request.id,kind:'out',delta:-p.quantity});
for(const unit of next.units) if(p.codes.includes(unit.code)) unit.status='loaned';
return next;

// Trecho de recordReturn: r = devolução validada; pickup e request já localizados.
const next=structuredClone(s);
next.returns.push(r);
if(r.condition==='ok') next.movements.push({materialId:request.materialId,
  requestId:request.id,kind:'in',delta:pickup.quantity});
for(const unit of next.units) if(pickup.codes.includes(unit.code))
  unit.status=r.condition==='ok'?'available':'review';
return next;
```

Para reutilizáveis em avaliação, mostrar a soma das quantidades de retiradas cujas devoluções têm `condition==='problem'`. Para equipamentos, contar as unidades em `review`. Não criar botão de liberação, pois sua política não foi definida.

```js
export function requestStatus(s,id) {
  const req=s.requests.find(r=>r.id===id);
  if(!req) throw new DomainError('requestId','Solicitação não encontrada.');
  if(s.returns.some(r=>r.requestId===id)) return 'returned';
  if(s.pickups.some(p=>p.requestId===id))
    return s.materials.find(m=>m.id===req.materialId).category==='consumable'?'completed':'loaned';
  return s.confirmations.some(c=>c.requestId===id)?'confirmed':'requested';
}
```

- [ ] **4. Integrar store e testar reinício e isolamento de leitura.** Implementar `src/store.mjs`:

```js
import {createDemoState} from './demo.mjs';
import {addMaterial} from './domain/inventory.mjs';
import {requestMaterial,confirmRequest,recordPickup,recordReturn} from './domain/workflow.mjs';
import {DomainError} from './domain/validation.mjs';
export function createStore(seed=createDemoState) {
  let state=seed();
  const commands={request:requestMaterial,confirm:confirmRequest,pickup:recordPickup,
    return:recordReturn,material:addMaterial};
  return {
    getState:()=>structuredClone(state),
    dispatch(command,payload) {
      if(!Object.hasOwn(commands,command)) throw new DomainError('command','Ação desconhecida.');
      state=commands[command](state,payload);
      return structuredClone(state);
    },
    reset(){state=seed();return structuredClone(state);}
  };
}
```

Criar `tests/store.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../src/store.mjs';
test('o mesmo store atende às duas áreas, reseta e não expõe estado mutável',()=>{
  const store=createStore(), initial=store.getState();
  store.dispatch('request',{id:'r',studentId:'DEMO-ALUNO-1',name:'Ana Exemplo',course:'Design',
    materialId:'cartolina',quantity:2,purpose:'Demonstração',at:'2026-10-05T12:00:00Z'});
  assert.equal(store.getState().requests.length,1);
  const reader=store.getState(); reader.requests.length=0;
  assert.equal(store.getState().requests.length,1);
  const snapshot=store.getState();
  assert.throws(()=>store.dispatch('confirm',{requestId:'inexistente',at:'2026-10-05T13:00:00Z'}));
  assert.deepEqual(store.getState(),snapshot);
  assert.deepEqual(store.reset(),initial);
});
```

- [ ] **5. Rodar `npm.cmd test`.** Esperado: testes de inventário, workflow e store aprovados. Se uma asserção falhar, corrigir a regra responsável sem enfraquecer a expectativa.
- [ ] **6. Commit:** `git add src/domain/workflow.mjs src/store.mjs tests/workflow.test.mjs tests/store.test.mjs` e `git commit -m "feat: model requests pickups and returns"`, respeitando a mesma limitação de Git da tarefa 1.

### Tarefa 3: experiência completa do aluno e shell navegável

**Arquivos:** criar `index.html`, `scripts/serve.mjs`, `src/main.mjs`, `src/ui/dom.mjs`, `src/ui/student.mjs`, `src/styles.css`, `tests/server.test.mjs`; ampliar `tests/inventory.test.mjs` com busca.

**Consome:** `createStore`, `availability`, `requestStatus`, `DomainError`.

**Produz:** `renderStudent({state,route,studentId,dispatch,navigate}): HTMLElement`, `el(tag,attrs,...children): HTMLElement`, `field({name,label,type,value,required,min,max}): HTMLElement`, `showError(form,error): void`, `searchMaterials(state,{query,category}): Material[]`. Declarar `searchMaterials` em `inventory.mjs` e exportá-la. `dispatch` chama o store e renderiza após sucesso; `navigate(hash)` altera `location.hash`.

- [ ] **1. Fixar busca com teste sem DOM.** Acrescentar:

```js
// Incluir searchMaterials no import de inventory.mjs.
test('busca ignora acentos e espaços e combina categoria',()=>{
  const state=createDemoState();
  assert.deepEqual(searchMaterials(state,{query:' REGUA ',category:'reusable'}).map(m=>m.id),['regua']);
  assert.equal(searchMaterials(state,{query:'régua',category:'consumable'}).length,0);
  assert.equal(searchMaterials(state,{query:'inexistente',category:''}).length,0);
});
```

Rodar `node --test tests/inventory.test.mjs`; esperar falha pela função ausente. Implementar:

```js
const normalized=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export function searchMaterials(s,{query='',category=''}) {
  return s.materials.filter(m=>(!category||m.category===category)&&normalized(m.name).includes(normalized(query)));
}
```

- [ ] **2. Criar shell estático e preview local.** `index.html`:

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unistock · Protótipo</title>
  <link rel="stylesheet" href="/src/styles.css">
</head>
<body>
  <a class="skip-link" href="#conteudo">Ir para o conteúdo</a>
  <div id="app"></div>
  <script type="module" src="/src/main.mjs"></script>
</body>
</html>
```

Em `scripts/serve.mjs`, exportar `createStaticServer(): http.Server`. Mapear explicitamente `/` e `/index.html` para `index.html`, `/src/styles.css` para CSS e cada módulo de `src/` da tabela de arquivos para seu arquivo `.mjs`. Importar `createServer` de `node:http`, `readFile` de `node:fs/promises` e `fileURLToPath`/`pathToFileURL` de `node:url`. Resolver cada destino com `new URL('../'+filename, import.meta.url)`, sem interpolar caminhos de requisição no filesystem.

```js
// Dentro do callback do servidor, depois de criar o Map routes.
const route=routes.get(new URL(req.url,'http://localhost').pathname);
if(req.method!=='GET'||!route) {res.writeHead(404);res.end('Não encontrado');return;}
try {
  const body=await readFile(new URL('../'+route.file,import.meta.url));
  res.writeHead(200,{'Content-Type':route.type,'Cache-Control':'no-store'});
  res.end(body);
} catch {res.writeHead(404);res.end('Não encontrado');}
```

Usar `text/html; charset=utf-8`, `text/css; charset=utf-8` e `text/javascript; charset=utf-8`. Ao executar o script diretamente, escutar `127.0.0.1` na porta `Number(process.env.PORT || 4173)` e imprimir a URL. Ao importar em teste, não abrir porta automaticamente. Identificar execução direta comparando `import.meta.url` com `pathToFileURL(process.argv[1]).href`.

Criar `tests/server.test.mjs`, antes de concluir o servidor, e rodar `node --test tests/server.test.mjs` para observar a falha inicial e a aprovação após a implementação:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {createStaticServer} from '../scripts/serve.mjs';
test('serve o protótipo e não expõe documentos ou arquivos internos',async t=>{
  const server=createStaticServer();
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',resolve);
  });
  t.after(()=>new Promise((resolve,reject)=>{
    server.close(error=>error?reject(error):resolve());
    server.closeAllConnections();
  }));
  const base=`http://127.0.0.1:${server.address().port}`;
  const page=await fetch(base+'/');
  assert.equal(page.status,200);
  assert.match(await page.text(),/lang="pt-BR"/);
  const css=await fetch(base+'/src/styles.css');
  assert.equal(css.status,200);
  assert.match(css.headers.get('content-type'),/text\/css/);
  await css.text();
  for(const path of ['/AGENTS.md','/.git/config','/package.json','/../AGENTS.md']) {
    const result=await fetch(base+path);
    assert.equal(result.status,404);
    await result.text();
  }
});
```

- [ ] **3. Construir DOM seguro, campos e shell responsivo.** Em `dom.mjs`, não inserir valores do usuário em `innerHTML`:

```js
export function el(tag,attrs={},...children) {
  const node=document.createElement(tag);
  for(const [key,value] of Object.entries(attrs)) {
    if(value===false||value===null||value===undefined) continue;
    if(key.startsWith('on')&&typeof value==='function') node.addEventListener(key.slice(2),value);
    else if(key==='className') node.className=value;
    else if(key==='value') node.value=value;
    else node.setAttribute(key,value===true?'':String(value));
  }
  for(const child of children.flat(Infinity)) {
    if(child===null||child===undefined||child===false) continue;
    node.append(child instanceof Node?child:document.createTextNode(String(child)));
  }
  return node;
}
```

`field` cria `label[for]`, `input[id=name][name]`, texto de erro `id=name-error` e `aria-describedby`. `showError` limpa erros anteriores, usa `form.elements.namedItem(error.field)`, coloca `aria-invalid=true` e foco no campo; se não houver campo correspondente, foca um resumo com `role=alert` e `tabindex=-1`. Não rerenderizar a tela em erro: dados e foco permanecem no formulário.

Em `main.mjs`, instanciar um store. Manter `studentId` inicial `DEMO-ALUNO-1`, selecionar explicitamente uma das duas pessoas fictícias e explicar “A seleção de pessoa é apenas demonstrativa; não protege dados”. Shell exibe marca, faixa de demonstração, aviso de reinício ao recarregar, seletor de área, navegação e `<main id="conteudo" tabindex="-1">`.

Rotas: `#/aluno/catalogo`, `#/aluno/material/{id}`, `#/aluno/solicitar/{id}`, `#/aluno/solicitacoes`, `#/aluno/como-funciona`. As rotas da equipe são implementadas na tarefa 4. Rota desconhecida mostra mensagem e link para catálogo; ID desconhecido mostra “Material não encontrado”. Trocar hash só após comandos bem-sucedidos. Focar título principal após navegação, sem roubar foco durante digitação da busca.

```css
:root{--bg:#f5f7fb;--surface:#fff;--text:#17243b;--muted:#53627b;--primary:#2459c4;
  --line:#dce3ed;--radius:16px;font-family:system-ui,sans-serif;color:var(--text);background:var(--bg)}
*{box-sizing:border-box}body{margin:0}button,input,select,textarea{font:inherit}
button,a,input,select,textarea{touch-action:manipulation}
:focus-visible{outline:3px solid #2459c4;outline-offset:3px}
.page{max-width:1240px;margin:auto;padding:clamp(16px,3vw,40px)}
.catalog-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:20px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:24px}
.field{display:grid;gap:8px}.form-grid{display:grid;gap:20px}
input,select,textarea{width:100%;min-height:44px}button{min-height:44px;cursor:pointer}
.skip-link{position:absolute;top:-80px;left:16px}.skip-link:focus{top:16px;z-index:10}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
```

Expandir essas regras para nav, badges textuais, botões, erros, tabelas/listas, menu móvel e estados vazios; todos os textos de baixo contraste precisam continuar legíveis. Usar ícones SVG locais decorativos com `aria-hidden=true`, acompanhados de nomes escritos.

- [ ] **4. Implementar as cinco rotas do aluno.** Cada rota retorna elementos construídos por `el`:

| Tela | Conteúdo e comportamento |
| --- | --- |
| Catálogo | Título “Materiais para suas atividades”; busca rotulada; três filtros e “Todos”; cartões com unidade e saldo derivados; estado vazio com “Limpar filtros” |
| Material | Categoria, saldo, explicação de devolução, link de solicitação ou “Indisponível no momento” |
| Solicitar | `name`, `course`, `quantity`, `purpose`; nome e curso preenchidos com a pessoa fictícia ativa e editáveis; material e unidade visíveis; resumo antes do envio |
| Minhas solicitações | Filtrar por `studentId`; protocolo `DEMO-` mais ID abreviado; histórico de eventos, previsão somente após retirada, quantidade solicitada e entregue separadas |
| Como funciona | Cinco etapas do guia e orientações de cuidado; sem local, prazo ou penalidade inventados |

Usar este padrão de envio, com ID gerado uma vez por instância do formulário:

```js
const requestId=crypto.randomUUID();
form.addEventListener('submit',event=>{
  event.preventDefault();
  const values=new FormData(form);
  try {
    dispatch('request',{id:requestId,studentId,materialId,
      name:values.get('name'),course:values.get('course'),quantity:Number(values.get('quantity')),
      purpose:values.get('purpose'),at:new Date().toISOString()});
    navigate('#/aluno/solicitacoes');
  } catch(error) {showError(form,error);}
});
```

Após o envio, anunciar em região `role=status` a mensagem exata da especificação e apresentar o protocolo. Manter em `main.mjs` um aviso transitório de sucesso definido por `dispatch` e consumido na próxima renderização da rota de destino; não adicioná-lo ao estado de negócio. Status em português: `requested` → “Aguardando confirmação”; `confirmed` → “Confirmada”; `loaned` → “Retirada registrada”; `completed` → “Concluída · sem devolução”; `returned` → “Devolução registrada”. Mostrar “Aguardando avaliação” adicionalmente se houver problema na devolução.

- [ ] **5. Verificar no navegador e executar os testes.** Iniciar com `npm.cmd start`. Testar 390×844 e 1440×900, busca `regua`, formulário vazio, quantidade zero e projetor indisponível. Digitar `<img src=x onerror=alert(1)>` na finalidade: a UI deve exibir texto literal no acompanhamento. Alternar pessoa fictícia e confirmar que a lista muda por ID. Inspecionar foco e ausência de erros de console. Registrar evidência apenas depois de observar o resultado.
- [ ] **6. Commit:** adicionar explicitamente os arquivos desta tarefa, incluindo a modificação de inventário e seu teste; `git commit -m "feat: build student prototype experience"`.

### Tarefa 4: painel da equipe e integração operacional

**Arquivos:** criar `src/ui/team.mjs`; modificar `src/main.mjs` e `src/styles.css`.

**Consome:** store, domínio, `el`, `field`, `showError` e rotas do aluno.

**Produz:** `renderTeam({state,route,dispatch,navigate}): HTMLElement`, integrado ao mesmo store. Não instanciar outro store ao alternar a área.

- [ ] **1. Executar a base antes de ligar a interface.** Rodar `npm.cmd test`; os casos operacionais da tarefa 2 devem passar. Não duplicar os mesmos testes apenas para cobrir nomes de componentes.

- [ ] **2. Implementar resumo, filas e confirmação.** Rotas `#/equipe/resumo`, `#/equipe/solicitacoes`, `#/equipe/solicitacao/{id}`, `#/equipe/retiradas`, `#/equipe/retirada/{id}`, `#/equipe/devolucao/{id}`, `#/equipe/materiais` e `#/equipe/materiais/novo`.

Derivar contadores de `requestStatus`; em Retiradas e devoluções, oferecer filtros Confirmadas, Empréstimos em aberto e Histórico. Links dos contadores usam query do hash, como `#/equipe/solicitacoes?status=requested`; analisar com `URLSearchParams`.

```js
const requested=state.requests.filter(r=>requestStatus(state,r.id)==='requested');
const confirmed=state.requests.filter(r=>requestStatus(state,r.id)==='confirmed');
const open=state.requests.filter(r=>requestStatus(state,r.id)==='loaned');
// No detalhe, botão confirmar somente se status==='requested'.
const confirmButton=el('button',{type:'button',onclick:()=>{
  try {dispatch('confirm',{requestId:request.id,at:new Date().toISOString()});}
  catch(error) {showError(detailContainer,error);}
}},'Confirmar solicitação');
```

Para `detailContainer`, ajustar `showError` para aceitar contêiner sem `.elements` e usar resumo de erro focável. Mostrar dados completos do pedido e aviso de que confirmação não reserva material na demonstração. Confirmado oferece “Registrar retirada”; item em empréstimo oferece “Registrar devolução”; concluído mostra histórico sem ações repetidas.

- [ ] **3. Implementar retirada e devolução com validação visível.** Os campos de data usarão `datetime-local` com `step=1`; converter valor não vazio com `new Date(value).toISOString()` somente após verificar `Number.isFinite(new Date(value).getTime())`. Se inválido, lançar `DomainError` no campo correspondente. Mostrar “Datas deste registro são demonstrativas”. Não preencher previsão automaticamente. Para data efetiva, preencher o próximo segundo inteiro e preservar segundos no campo, evitando que o truncamento de minutos faça uma retirada imediata parecer anterior à confirmação:

```js
const rounded=new Date(Math.ceil(Date.now()/1000)*1000);
const localValue=new Date(rounded.getTime()-rounded.getTimezoneOffset()*60000)
  .toISOString().slice(0,19);
// input de data efetiva: type='datetime-local', step='1', value=localValue.
```

```js
// Trecho do submit de retirada: form e request já renderizados.
const values=new FormData(form);
const rawAt=values.get('at'), rawDue=values.get('dueAt');
const localISO=(value,field)=>{
  const date=new Date(value);
  if(!value||!Number.isFinite(date.getTime())) throw new DomainError(field,'Informe uma data e horário válidos.');
  return date.toISOString();
};
dispatch('pickup',{requestId:request.id,quantity:Number(values.get('quantity')),
  codes:values.getAll('codes'),operator:values.get('operator'),
  at:localISO(rawAt,'at'),dueAt:material.category==='consumable'?null:localISO(rawDue,'dueAt')});
```

Exibir checkboxes de códigos somente para unidades disponíveis do equipamento. Identificar quantidade solicitada e saldo atual junto ao campo de quantidade entregue. Se menor que a solicitada, mostrar antes do envio: “Esta demonstração registra uma única retirada. O restante não ficará pendente para outra entrega”.

Devolução exibe a quantidade integral e os códigos retirados, campos `at`, `condition` e `notes`; opções “Conferido sem problemas” e “Com problema — aguardar avaliação”. Nas notas, descrição obrigatória para problema e opcional para conferência sem problemas. Consumíveis nunca têm esse formulário. Após sucesso, navegar ao histórico do pedido; em erro, preservar campos e destacar a causa.

- [ ] **4. Implementar materiais e cadastro demonstrativo.** Lista por categoria com saldo calculado, quantidade em avaliação e códigos/condições dos equipamentos. Formulário com `name`, `category`, `measure`, `quantity` e `codes` (um por linha, somente equipamentos).

```js
const values=new FormData(form);
const category=values.get('category');
dispatch('material',{id:crypto.randomUUID(),name:values.get('name'),category,
  measure:category==='equipment'?'unidade':values.get('measure'),
  quantity:Number(values.get('quantity')),
  codes:category==='equipment'?String(values.get('codes')).split(/\r?\n/).map(s=>s.trim()).filter(Boolean):[]});
```

Oferecer `unidade` e `caixa` para os materiais demonstrativos sem códigos. Não oferecer ajuste direto de estoque, edição estrutural ou exclusão. Material cadastrado aparece imediatamente no catálogo do aluno após alternar a área.

- [ ] **5. Verificar a experiência completa no navegador.** Criar pedido de duas tesouras como aluno, confirmar na equipe, retirar uma, conferir disponibilidade e diferença de quantidades nas duas áreas, devolver e verificar recomposição. Repetir com notebook e problema na devolução; confirmar que o código fica “Aguardando avaliação”. Retirar uma caixa de lápis e confirmar que a jornada termina sem devolução. Tentar datas anteriores e código duplicado no cadastro; manter valores do formulário após erro. Executar `npm.cmd test`.
- [ ] **6. Commit:** `git add src/ui/team.mjs src/main.mjs src/styles.css src/ui/dom.mjs` e `git commit -m "feat: connect staff operations to student requests"`.

### Tarefa 5: fechamento integrado e entrega revisável

**Arquivos:** criar `scripts/check.mjs`, `README.md` e `docs/prototype-validation.md`; corrigir somente arquivos ligados a problemas observados na revisão.

**Consome:** aplicação concluída nas tarefas anteriores.

**Produz:** preview local funcional, verificações registradas e instruções reproduzíveis.

- [ ] **1. Adicionar verificação sintática sem bibliotecas.** Em `scripts/check.mjs`, usar `readdir` recursivo em `src`, `scripts` e `tests`, selecionando `.mjs`, e `spawnSync(process.execPath,['--check',file],{stdio:'inherit'})`. Encerrar com código não zero se qualquer arquivo falhar:

```js
import {readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
async function modules(directory) {
  const entries=await readdir(directory,{withFileTypes:true});
  const result=[];
  for(const entry of entries) {
    const file=join(directory,entry.name);
    if(entry.isDirectory()) result.push(...await modules(file));
    else if(entry.name.endsWith('.mjs')) result.push(file);
  }
  return result;
}
for(const directory of ['src','scripts','tests']) for(const file of await modules(directory)) {
  const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
  if(result.error||result.status!==0) process.exit(1);
}
console.log('Sintaxe dos módulos verificada.');
```

- [ ] **2. Executar a matriz final no navegador.** Cobrir cada linha e registrar resultado observado, não apenas intenção:

| Cenário | Resultado esperado |
| --- | --- |
| Busca vazia, sem resultados e acentuada | Lista coerente, estado vazio útil, `regua` encontra Régua |
| Solicitar e confirmar | Histórico avança; disponibilidade não muda |
| Dois pedidos para as últimas três caixas | Após entregar o primeiro, o segundo permanece confirmado e sua retirada é rejeitada |
| Clique duplo em confirmação/retirada/devolução | Uma única transição, saldo consistente |
| Retirada menor | Quantidades distintas, sem segunda entrega do restante |
| Devolução normal e com problema | Só a normal recompõe disponibilidade |
| Consumo | Saída única, sem previsão ou devolução |
| Cadastro de material | Visível nas duas áreas; duplicação de código rejeitada |
| Texto com marcação | Exibido literalmente, sem executar HTML |
| Datas fora de ordem e campos vazios | Erro no campo, dados digitados preservados |
| Pessoa fictícia diferente | Minhas solicitações acompanha `studentId` |
| Reiniciar e recarregar | Store e filtros/drafts retornam a um estado inicial coerente |
| Rotas desconhecidas | Mensagem compreensível e caminho de volta ao catálogo |
| Teclado, 390×844 e 1440×900 | Navegação, campos e ações acessíveis; sem corte horizontal |

O botão Reiniciar deve recriar o seed, voltar para `DEMO-ALUNO-1`, limpar rascunhos e avisos antigos e navegar ao catálogo. Não persistir dados em `localStorage`, cookies ou URL. É permitido manter no hash somente rota, ID demonstrativo e filtro de status.

- [ ] **3. Documentar a execução.** `README.md` deve conter `npm.cmd start`, URL `http://127.0.0.1:4173`, alternativa `$env:PORT=4174` antes de iniciar se a porta estiver ocupada, `npm.cmd test`, `npm.cmd run check`, reinício em memória e roteiro aluno → equipe → aluno. Explicar que Node só serve arquivos localmente e executa testes, sem backend de negócio. Não declarar pronto para uso institucional.

Em `docs/prototype-validation.md`, registrar data da execução, versão do Node, comandos e contagem real dos testes, dimensões inspecionadas, cenários exercitados, falhas corrigidas e limitações ainda observadas. Se não foi possível inspecionar algum cenário, marcá-lo como não verificado; não apresentar planejamento como evidência.

- [ ] **4. Executar a verificação final.** `npm.cmd run check`, `npm.cmd test` e `git diff --check`. Revisar o diff para assegurar que briefing, guia e planilha não foram alterados e que não existem requisições a serviços externos ou dependências adicionadas. Não repetir toda a suíte se nada mudou depois da aprovação dos testes.
- [ ] **5. Commit e entrega.** Adicionar explicitamente os arquivos da tarefa e correções efetivamente feitas; `git commit -m "docs: verify and document the interactive prototype"`. Abrir o preview no painel do aplicativo e entregar ao usuário a URL, o roteiro curto para explorar as duas áreas e as limitações reais. Não publicar externamente, criar PR ou escolher hospedagem nesta entrega.

## Revisão do plano

- Cobertura: catálogo, categorias, consulta, solicitação, confirmação, retirada, devolução, conferência, cadastro, guia e demonstração das duas áreas possuem tarefas e critérios de aceitação.
- Regras: quantidades solicitada/entregue separadas, consumo sem devolução, disponibilidade derivada, código por equipamento e falhas sem mutação cobertos pelo domínio.
- Contratos: todas as telas recebem o mesmo store; identificadores, payloads e nomes de função são compartilhados acima. Nenhuma dependência de uma tecnologia ainda não escolhida para produção.
- Decisões abertas: reservas, permissões, atrasos, danos e correções continuam institucionais; o protótipo mostra seus limites sem implementar políticas de produção.
- Método de execução: recomendação nativa, aguardando escolha do usuário na revisão deste plano.
