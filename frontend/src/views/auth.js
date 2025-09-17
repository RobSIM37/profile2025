import { Button } from '../components/ui/button.js';
import { textField } from '../components/ui/inputs.js';
import { makeSelectPanels } from '../components/ui/selectPanels.js';

export const meta = {
  title: 'Auth',
  description: 'Login / Register',
};

function makeShowPasswordToggle(forInput) {
  const wrap = document.createElement('div');
  wrap.className = 'ui-field';
  const lab = document.createElement('label');
  lab.textContent = 'Options';
  const control = document.createElement('div');
  control.className = 'ui-control';
  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.id = 'show-password';
  const l2 = document.createElement('label');
  l2.setAttribute('for', 'show-password');
  l2.textContent = 'Show password';
  l2.style.marginLeft = '8px';
  chk.addEventListener('change', () => {
    try { forInput.type = chk.checked ? 'text' : 'password'; } catch {}
  });
  control.append(chk, l2);
  wrap.append(lab, control);
  return { wrapper: wrap, checkbox: chk };
}

function LoginPanel() {
  const frag = document.createDocumentFragment();

  const user = textField({ id: 'login-username', label: 'Username', placeholder: 'yourname' });
  const pass = textField({ id: 'login-password', label: 'Password', placeholder: '••••••••' });
  try { pass.input.type = 'password'; } catch {}
  const toggle = makeShowPasswordToggle(pass.input);

  const btnWrap = document.createElement('div');
  btnWrap.innerHTML = Button({ id: 'login-submit', label: 'Login' });

  frag.append(user.wrapper, pass.wrapper, toggle.wrapper, btnWrap.firstElementChild);
  return frag;
}

function RegisterPanel() {
  const frag = document.createDocumentFragment();

  const user = textField({ id: 'reg-username', label: 'Username', placeholder: 'yourname' });
  const email = textField({ id: 'reg-email', label: 'Email', placeholder: 'you@example.com' });
  const pass = textField({ id: 'reg-password', label: 'Password', placeholder: '••••••••' });
  try { pass.input.type = 'password'; } catch {}
  const toggle = makeShowPasswordToggle(pass.input);

  // Simple email validation UI hint
  const hint = document.createElement('p');
  hint.className = 'note';
  hint.textContent = '';
  const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  email.input.addEventListener('input', () => {
    const ok = re.test(email.input.value.trim());
    hint.textContent = ok || !email.input.value ? '' : 'Enter a valid email (name@domain.tld)';
  });

  const btnWrap = document.createElement('div');
  btnWrap.innerHTML = Button({ id: 'reg-submit', label: 'Register' });

  frag.append(user.wrapper, email.wrapper, pass.wrapper, toggle.wrapper, hint, btnWrap.firstElementChild);
  return frag;
}

export function render() {
  const sec = document.createElement('section');
  sec.className = 'stack';

  const { root } = makeSelectPanels({
    id: 'auth-select',
    label: 'Login / Register',
    includeNone: false,
    options: [
      { id: 'login', label: 'Login' },
      { id: 'register', label: 'Register' },
    ],
    panels: {
      login: LoginPanel,
      register: RegisterPanel,
    },
    value: 'login',
  });

  sec.append(root);
  return sec;
}
