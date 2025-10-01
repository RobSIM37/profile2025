import { MF_CANVAS_WIDTH, MF_CANVAS_HEIGHT } from './constants.js';

export function createMasterFloristCanvasSizer({ canvas, container, onResize } = {}) {
  if (!canvas) throw new Error('createMasterFloristCanvasSizer requires a canvas element.');
  const host = container || canvas.parentElement || canvas;
  const ctx = canvas.getContext('2d');
  const metrics = createDefaultMetrics();
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => updateSize()) : null;

  function createDefaultMetrics() {
    return {
      logicalWidth: MF_CANVAS_WIDTH,
      logicalHeight: MF_CANVAS_HEIGHT,
      displayWidth: MF_CANVAS_WIDTH,
      displayHeight: MF_CANVAS_HEIGHT,
      scaleX: 1,
      scaleY: 1,
      devicePixelRatio: window.devicePixelRatio || 1,
    };
  }

  function updateSize() {
    const dpr = window.devicePixelRatio || 1;
    const hostRect = host.getBoundingClientRect();
    const availableWidth = hostRect.width || MF_CANVAS_WIDTH;
    const availableHeight = hostRect.height || MF_CANVAS_HEIGHT;
    const aspect = MF_CANVAS_WIDTH / MF_CANVAS_HEIGHT;
    const maxWidthByHeight = availableHeight * aspect;
    const displayWidth = Math.max(1, Math.min(availableWidth, maxWidthByHeight, MF_CANVAS_WIDTH));
    const displayHeight = displayWidth / aspect;

    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const internalWidth = Math.round(displayWidth * dpr);
    const internalHeight = Math.round(displayHeight * dpr);
    if (canvas.width !== internalWidth || canvas.height !== internalHeight) {
      canvas.width = internalWidth;
      canvas.height = internalHeight;
    }

    const scaleX = internalWidth / MF_CANVAS_WIDTH;
    const scaleY = internalHeight / MF_CANVAS_HEIGHT;

    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    ctx.imageSmoothingEnabled = true;

    metrics.logicalWidth = MF_CANVAS_WIDTH;
    metrics.logicalHeight = MF_CANVAS_HEIGHT;
    metrics.displayWidth = displayWidth;
    metrics.displayHeight = displayHeight;
    metrics.scaleX = scaleX;
    metrics.scaleY = scaleY;
    metrics.devicePixelRatio = dpr;

    onResize?.({ ...metrics });
  }

  function toCanvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = MF_CANVAS_WIDTH / (rect.width || 1);
    const scaleY = MF_CANVAS_HEIGHT / (rect.height || 1);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function mount() {
    updateSize();
    if (ro) ro.observe(host);
    window.addEventListener('resize', updateSize, { passive: true });
  }

  function unmount() {
    if (ro) ro.disconnect();
    window.removeEventListener('resize', updateSize);
  }

  function getMetrics() {
    return { ...metrics };
  }

  return { mount, unmount, toCanvasPoint, getMetrics, updateSize };
}