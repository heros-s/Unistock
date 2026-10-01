export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (key === 'className') node.className = value;
    else if (key === 'value') node.value = value;
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const glyphs = {
  grid:[['rect',{x:3,y:3,width:8,height:8}],['rect',{x:13,y:3,width:8,height:8}],['rect',{x:3,y:13,width:8,height:8}],['rect',{x:13,y:13,width:8,height:8}]],
  list:[['rect',{x:3,y:5,width:3,height:3}],['line',{x1:10,y1:6.5,x2:21,y2:6.5}],['rect',{x:3,y:11,width:3,height:3}],['line',{x1:10,y1:12.5,x2:21,y2:12.5}],['rect',{x:3,y:17,width:3,height:3}],['line',{x1:10,y1:18.5,x2:21,y2:18.5}]],
  book:[['rect',{x:4,y:4,width:16,height:16}],['line',{x1:12,y1:4,x2:12,y2:20}],['line',{x1:7,y1:8.5,x2:10,y2:8.5}],['line',{x1:14,y1:8.5,x2:17,y2:8.5}],['line',{x1:7,y1:13,x2:10,y2:13}],['line',{x1:14,y1:13,x2:17,y2:13}]],
  laptop:[['rect',{x:5,y:5,width:14,height:9}],['line',{x1:2,y1:19,x2:22,y2:19}],['line',{x1:9,y1:19,x2:9,y2:20.5}],['line',{x1:15,y1:19,x2:15,y2:20.5}]],
  projector:[['rect',{x:3,y:8,width:13,height:8}],['circle',{cx:18.5,cy:12,r:2.5}],['line',{x1:6,y1:16,x2:6,y2:19}],['line',{x1:13,y1:16,x2:13,y2:19}]],
  scissors:[['circle',{cx:5,cy:6,r:2}],['circle',{cx:5,cy:18,r:2}],['line',{x1:7,y1:7,x2:20,y2:17}],['line',{x1:7,y1:17,x2:20,y2:7}]],
  ruler:[['polyline',{points:'4,20 7,20 7,17 10,17 10,20 13,20 13,15 16,15 16,20 20,20 20,4 4,20'}]],
  paper:[['rect',{x:5,y:3,width:14,height:18}],['line',{x1:8,y1:8,x2:16,y2:8}],['line',{x1:8,y1:12,x2:16,y2:12}],['line',{x1:8,y1:16,x2:13,y2:16}]],
  pencil:[['line',{x1:5,y1:19,x2:16,y2:8}],['polygon',{points:'16,8 19,5 21,7 18,10',fill:'currentColor'}],['line',{x1:4,y1:20,x2:6,y2:18}]],
  box:[['polygon',{points:'12,3 20,7 20,17 12,21 4,17 4,7'}],['line',{x1:12,y1:11,x2:12,y2:21}],['line',{x1:12,y1:11,x2:4,y2:7}],['line',{x1:12,y1:11,x2:20,y2:7}]],
  search:[['circle',{cx:10,cy:10,r:7}],['line',{x1:15,y1:15,x2:21,y2:21}]],
  arrow:[['line',{x1:3,y1:12,x2:18,y2:12}],['polyline',{points:'12,6 18,12 12,18'}]],
  back:[['line',{x1:21,y1:12,x2:6,y2:12}],['polyline',{points:'12,6 6,12 12,18'}]],
  clock:[['circle',{cx:12,cy:12,r:9}],['line',{x1:12,y1:12,x2:12,y2:6.5}],['line',{x1:12,y1:12,x2:16,y2:14}]],
  check:[['polyline',{points:'4,13 9,18 20,5'}]],
  info:[['circle',{cx:12,cy:12,r:9}],['line',{x1:12,y1:11,x2:12,y2:16}],['rect',{x:11.1,y:7.2,width:1.8,height:1.8,fill:'currentColor',stroke:'none'}]],
  refresh:[['path',{d:'M19 12a7 7 0 1 1-2.2-5.1'}],['polygon',{points:'19,3 19,8.4 14,7',fill:'currentColor'}]],
  users:[['circle',{cx:9,cy:8,r:3.5}],['polyline',{points:'2.5,20 2.5,17 6,13.5 12,13.5 15.5,17 15.5,20'}]],
  plus:[['line',{x1:12,y1:5,x2:12,y2:19}],['line',{x1:5,y1:12,x2:19,y2:12}]],
  menu:[['line',{x1:4,y1:7,x2:20,y2:7}],['line',{x1:4,y1:12.5,x2:20,y2:12.5}],['line',{x1:4,y1:18,x2:20,y2:18}]]
};
export function icon(name, className = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',
    'stroke-width':'1.6','stroke-linecap':'square','stroke-linejoin':'miter','aria-hidden':'true',class:`icon ${className}`}))
    svg.setAttribute(key, value);
  for (const [tag, attrs] of glyphs[name] || glyphs.box) {
    const shape = document.createElementNS(svg.namespaceURI, tag);
    for (const [key, value] of Object.entries(attrs)) shape.setAttribute(key, value);
    svg.append(shape);
  }
  return svg;
}

export function field({name, label, type = 'text', value = '', required = true, min, max, step, options, hint}) {
  const attrs = {id:name, name, required, min, max, step, 'aria-describedby':`${name}-error${hint ? ` ${name}-hint` : ''}`};
  let input;
  if (options) input = el('select', attrs, options.map(([v, text]) => el('option', {value:v}, text)));
  else if (type === 'textarea') input = el('textarea', {...attrs, rows:3});
  else input = el('input', {...attrs, type});
  input.value = value;
  return el('div', {className:'field'}, el('label', {for:name}, label), input,
    hint && el('small', {id:`${name}-hint`, className:'muted'}, hint),
    el('span', {id:`${name}-error`, className:'field-error'}));
}
export function errorSummary() { return el('div', {className:'error-summary', role:'alert', tabindex:'-1', hidden:true}); }
export function showError(container, error) {
  container.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
  container.querySelectorAll('.field-error').forEach(span => span.textContent = '');
  let summary = container.querySelector('.error-summary');
  if (!summary) { summary = errorSummary(); container.prepend(summary); }
  summary.hidden = false;
  summary.textContent = error.message || 'Não foi possível registrar. Confira os dados.';
  const control = container.elements?.namedItem(error.field) || container.querySelector(`[data-error-field="${CSS.escape(error.field || '')}"]`);
  const target = control instanceof Element ? control : null;
  if (target) {
    target.setAttribute('aria-invalid', 'true');
    const message = container.querySelector(`#${CSS.escape(error.field)}-error`);
    if (message) message.textContent = summary.textContent;
    target.focus();
  } else summary.focus();
}

export const linkButton = (label, href, kind = 'primary', name = 'arrow') =>
  el('a', {href, className:`button ${kind}`}, label, icon(name));
export const notice = text => el('div', {className:'notice'}, icon('info'), el('p', {}, text));
export const heading = (eyebrow, title, description, action) => el('div', {className:'page-heading'},
  el('div', {}, el('p', {className:'eyebrow'}, eyebrow), el('h1', {tabindex:'-1'}, title), el('p', {className:'lead'}, description)), action);
export const empty = (title, description, action) => el('div', {className:'empty'},
  el('div', {className:'empty-icon'}, icon('box')), el('h2', {}, title), el('p', {}, description), action);
