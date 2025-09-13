export function setAppSolid(solid = true) {
  const app = document.getElementById('app');
  if (!app) return;
  app.classList.toggle('app-solid', !!solid);
}

export function setAppTransparent() {
  setAppSolid(false);
}

