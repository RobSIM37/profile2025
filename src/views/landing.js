import { setAppTransparent } from '../lib/appShell.js';

export const meta = {
  title: 'Home',
  description: 'Developer profile and project launchpad',
};

export function render() {
  setAppTransparent();
  return `
    <section class="hero">
      <h1 class="hero-title">I love coding beautiful things.<br>I hope we can collaborate.</h1>
    </section>
  `;
}
