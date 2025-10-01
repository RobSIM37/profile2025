export function createWorkingArea() {
  const workingArea = document.createElement('div');
  workingArea.className = 'mf-working-area';
  workingArea.style.position = 'relative';
  workingArea.style.display = 'flex';
  workingArea.style.alignItems = 'stretch';
  workingArea.style.justifyContent = 'center';
  workingArea.style.width = '100%';
  workingArea.style.height = 'auto';
  workingArea.style.minHeight = '0';
  workingArea.style.background = 'var(--bg-elev)';
  workingArea.style.borderRadius = 'var(--radius)';
  workingArea.style.boxShadow = '0 0 0 1px var(--border)';
  workingArea.style.overflow = 'hidden';
  workingArea.style.marginBottom = 'var(--space-2)';

  const canvasElement = document.createElement('canvas');
  canvasElement.className = 'mf-canvas';
  canvasElement.style.flex = '1 1 auto';
  canvasElement.style.width = '100%';
  canvasElement.style.height = 'auto';
  canvasElement.style.display = 'block';
  canvasElement.style.imageRendering = 'pixelated';

  workingArea.append(canvasElement);

  return { workingArea, canvasHost: workingArea, canvasElement };
}
