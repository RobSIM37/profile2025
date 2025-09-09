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
