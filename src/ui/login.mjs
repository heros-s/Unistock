import {el, icon, field, errorSummary, showError, heading, notice} from './dom.mjs';
import {safeNext} from '../domain/access.mjs';

export function renderLogin({route, auth, navigate, onSignedIn = () => {}}) {
  const signup = route.params.get('aba') === 'cadastro';
  const next = route.params.get('next');
  const tabHref = tab => {
    const params = new URLSearchParams();
    if (next) params.set('next', next);
    if (tab === 'cadastro') params.set('aba', 'cadastro');
    const query = params.toString();
    return `#/entrar${query ? '?' + query : ''}`;
  };
  const tabs = el('div', {className:'category-tabs login-tabs', role:'group', 'aria-label':'Entrar ou criar conta'},
    [['entrar','Entrar'],['cadastro','Criar conta']].map(([tab, label]) => {
      const selected = (tab === 'cadastro') === signup;
      return el('button', {type:'button', className:selected ? 'selected' : '', 'aria-pressed':String(selected),
        onclick:() => { if (!selected) navigate(tabHref(tab)); }}, label);
    }));
  const form = el('form', {className:'card form-card login-card', novalidate:true}, errorSummary(),
    el('h2', {}, signup ? 'Criar conta da equipe' : 'Entrar na área da equipe'),
    signup && el('div', {className:'form-grid two-cols'},
      field({name:'nome', label:'Nome'}), field({name:'sobrenome', label:'Sobrenome'})),
    field({name:'email', label:'E-mail', type:'email'}),
    field({name:'senha', label:'Senha', type:'password'}),
    signup && field({name:'confirmacao', label:'Confirmar senha', type:'password'}),
    el('div', {className:'form-actions'},
      el('button', {className:'button primary', type:'submit'}, signup ? 'Criar conta' : 'Entrar', icon('arrow'))));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const values = Object.fromEntries(new FormData(form));
    button.disabled = true;
    try {
      if (signup) {
        await auth.signUp(values);
        form.replaceChildren(notice('Enviamos um link de confirmação para seu e-mail. Confirme para entrar.'));
        return;
      }
      onSignedIn(await auth.signIn(values));
      navigate(safeNext(next));
    } catch (error) {
      showError(form, error);
    } finally {
      button.disabled = false;
    }
  });
  return el('section', {}, heading('ÁREA DA EQUIPE', signup ? 'Criar conta' : 'Entrar',
    'Somente a equipe precisa de login. O catálogo do aluno continua aberto.'),
    route.params.get('aviso') === 'link-invalido' && notice('O link de confirmação expirou ou já foi usado. Entre com seu e-mail e senha ou crie a conta novamente.'),
    tabs, form);
}
