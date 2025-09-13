// Lightweight DOM helpers to keep views tidy

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null) continue;
    if (k === 'class' || k === 'className') node.className = String(v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, String(v));
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function frag(...children) {
  const f = document.createDocumentFragment();
  children.flat().forEach((c) => { if (c != null) f.append(c instanceof Node ? c : document.createTextNode(String(c))); });
  return f;
}

// Delegate: on(container, 'click', '.selector', handler)
export function on(root, type, selector, handler, options) {
  root.addEventListener(type, (e) => {
    const t = e.target instanceof Element ? e.target.closest(selector) : null;
    if (t && root.contains(t)) handler(e, t);
  }, options);
}

