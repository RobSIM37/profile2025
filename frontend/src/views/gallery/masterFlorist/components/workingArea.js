export function createWorkingArea() {
  const workingArea = document.createElement('div');
  workingArea.className = 'mf-working-area';

  const frame = document.createElement('div');
  frame.className = 'mf-working-frame';

  const canvasElement = document.createElement('canvas');
  canvasElement.className = 'mf-canvas';

  frame.append(canvasElement);
  workingArea.append(frame);

  return { workingArea, canvasHost: frame, canvasElement };
}
