import { MF_CANVAS_WIDTH, MF_CANVAS_HEIGHT } from '../canvas/constants.js';

export function createWorkingArea() {
  const workingArea = document.createElement('div');
  workingArea.className = 'mf-working-area';
  workingArea.style.position = 'relative';
  workingArea.style.display = 'flex';
  workingArea.style.alignItems = 'center';
  workingArea.style.justifyContent = 'center';
  workingArea.style.width = '100%';
  workingArea.style.maxWidth = '100%';
  workingArea.style.height = '100%';
  workingArea.style.minWidth = '0';
  workingArea.style.minHeight = '0';
  workingArea.style.flex = '1 1 auto';

  const frame = document.createElement('div');
  frame.className = 'mf-working-frame';
  frame.style.position = 'relative';
  frame.style.display = 'flex';
  frame.style.alignItems = 'stretch';
  frame.style.justifyContent = 'stretch';
  frame.style.width = '100%';
  frame.style.maxWidth = `${MF_CANVAS_WIDTH}px`;
  frame.style.maxHeight = '100%';
  frame.style.aspectRatio = `${MF_CANVAS_WIDTH} / ${MF_CANVAS_HEIGHT}`;
  frame.style.background = 'var(--bg-elev)';
  frame.style.borderRadius = 'var(--radius)';
  frame.style.boxSizing = 'border-box';
  frame.style.boxShadow = 'inset 0 0 0 1px var(--border)';
  frame.style.overflow = 'hidden';

  const canvasElement = document.createElement('canvas');
  canvasElement.className = 'mf-canvas';
  canvasElement.style.flex = '1 1 auto';
  canvasElement.style.width = '100%';
  canvasElement.style.maxWidth = '100%';
  canvasElement.style.height = '100%';
  canvasElement.style.maxHeight = '100%';
  canvasElement.style.display = 'block';
  canvasElement.style.imageRendering = 'pixelated';

  frame.append(canvasElement);
  workingArea.append(frame);

  return { workingArea, canvasHost: frame, canvasElement };
}
