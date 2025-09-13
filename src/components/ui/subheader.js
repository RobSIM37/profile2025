import { makeTabs } from './tabs.js';

// Gallery subheader with left-aligned title link and centered tabs
// API: makeGallerySubheader({ title, href, onChange?, activeId? })
// Returns: { root, setActive(id, emit?), getActive() }
export function makeGallerySubheader({ title, href, onChange, activeId = 'demo', emitInitial = true }) {
  // Outer container to allow the divider to sit BELOW the bottom margin
  const container = document.createElement('div');
  container.style.width = '100%';

  const topbar = document.createElement('div');
  topbar.style.position = 'relative';
  topbar.style.display = 'flex';
  topbar.style.justifyContent = 'center';
  topbar.style.alignItems = 'center';
  topbar.style.width = '100%';
  // Slightly smaller, symmetric vertical margins; keep content alignment
  topbar.style.padding = '4px 0';
  topbar.style.marginTop = 'var(--space-3)';
  topbar.style.marginBottom = 'var(--space-3)';

  const titleLink = document.createElement('a');
  titleLink.href = href || '#';
  titleLink.textContent = title || '';
  titleLink.style.position = 'absolute';
  titleLink.style.left = '0';
  titleLink.style.top = '50%';
  titleLink.style.transform = 'translateY(-50%)';
  titleLink.style.color = 'inherit';
  titleLink.style.textDecoration = 'none';
  titleLink.style.fontWeight = '800';
  titleLink.style.fontSize = '1.6rem';
  titleLink.addEventListener('mouseover', () => titleLink.style.textDecoration = 'underline');
  titleLink.addEventListener('mouseout', () => titleLink.style.textDecoration = 'none');

  const tabs = makeTabs({
    items: [{ id: 'demo', label: 'Demo' }, { id: 'source', label: 'Source' }],
    activeId,
    onChange,
  });
  // Align the tabs with the title baseline by removing default gap
  tabs.root.style.marginBottom = '0';

  topbar.append(titleLink, tabs.root);

  // Thin highlight divider sits below the bottom margin now
  const divider = document.createElement('div');
  divider.style.height = '1px';
  divider.style.width = '100%';
  divider.style.background = 'var(--primary)';
  // Add breathing room below the divider before page content
  divider.style.marginBottom = 'var(--space-4)';

  container.append(topbar, divider);

  // Optionally emit initial onChange once to mount content
  try { if (emitInitial && typeof onChange === 'function') queueMicrotask(() => onChange(activeId)); } catch {}
  return { root: container, setActive: tabs.setActive, getActive: tabs.getActive };
}
