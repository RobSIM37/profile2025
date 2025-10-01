export function createWorkingArea() {
  const workingArea = document.createElement('div');
  workingArea.className = 'mf-working-area';
  workingArea.style.display = 'grid';
  workingArea.style.gridTemplateRows = '1fr';
  workingArea.style.height = '100%';
  workingArea.style.maxHeight = '100%';
  workingArea.style.minHeight = '0';

  const canvasHost = document.createElement('div');
  canvasHost.className = 'mf-canvas-host';
  canvasHost.style.position = 'relative';
  canvasHost.style.display = 'flex';
  canvasHost.style.alignItems = 'stretch';
  canvasHost.style.justifyContent = 'center';
  canvasHost.style.width = '100%';
  canvasHost.style.height = '100%';
  canvasHost.style.maxHeight = '100%';
  canvasHost.style.minHeight = '0';
  canvasHost.style.background = 'var(--bg-elev)';
  canvasHost.style.borderRadius = 'var(--radius)';
  canvasHost.style.boxShadow = '0 0 0 1px var(--border)';
  canvasHost.style.overflow = 'hidden';

  const canvasElement = document.createElement('canvas');
  canvasElement.className = 'mf-canvas';
  canvasElement.style.flex = '1 1 auto';
  canvasElement.style.width = '100%';
  canvasElement.style.height = '100%';
  canvasElement.style.display = 'block';
  canvasElement.style.imageRendering = 'pixelated';

  canvasHost.append(canvasElement);
  workingArea.append(canvasHost);

  return { workingArea, canvasHost, canvasElement };
}
