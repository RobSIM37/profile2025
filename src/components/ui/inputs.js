// Shared input helpers for a consistent look-and-feel
// numberField({ id, label, value, min, max, step }) -> { wrapper, input }

export function numberField({ id, label = '', value = '', min, max, step } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui-field';
  const lab = document.createElement('label');
  if (id) lab.setAttribute('for', id);
  lab.textContent = label || '';
  const input = document.createElement('input');
  input.type = 'number';
  if (id) input.id = id;
  if (value !== undefined && value !== null) input.value = String(value);
  if (min !== undefined) input.min = String(min);
  if (max !== undefined) input.max = String(max);
  if (step !== undefined) input.step = String(step);
  input.className = 'control';
  const control = document.createElement('div');
  control.className = 'ui-control';
  control.append(input);
  wrapper.append(lab, control);
  return { wrapper, input };
}

// selectField({ id, label, value, options }) -> { wrapper, input }
// options: array of { value, label } or [value,label]
export function selectField({ id, label = '', value = '', options = [] } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui-field';
  const lab = document.createElement('label');
  if (id) lab.setAttribute('for', id);
  lab.textContent = label || '';
  const sel = document.createElement('select');
  if (id) sel.id = id;
  options.forEach(opt => {
    const [val, txt] = Array.isArray(opt) ? opt : [opt?.value, opt?.label];
    if (val == null && txt == null) return;
    const o = document.createElement('option');
    o.value = String(val ?? '');
    o.textContent = String(txt ?? val ?? '');
    sel.append(o);
  });
  if (value !== undefined && value !== null) sel.value = String(value);
  sel.className = 'control';
  const control = document.createElement('div');
  control.className = 'ui-control';
  control.append(sel);
  wrapper.append(lab, control);
  return { wrapper, input: sel };
}

// textField({ id, label, value, placeholder? }) -> { wrapper, input }
export function textField({ id, label = '', value = '', placeholder = '' } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui-field';
  const lab = document.createElement('label');
  if (id) lab.setAttribute('for', id);
  lab.textContent = label || '';
  const input = document.createElement('input');
  input.type = 'text';
  if (id) input.id = id;
  if (value !== undefined && value !== null) input.value = String(value);
  if (placeholder) input.placeholder = String(placeholder);
  input.className = 'control';
  const control = document.createElement('div');
  control.className = 'ui-control';
  control.append(input);
  wrapper.append(lab, control);
  return { wrapper, input };
}
