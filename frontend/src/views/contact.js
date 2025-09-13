import { setAppTransparent } from '../lib/appShell.js';

export const meta = {
  title: 'Contact',
  description: 'How to reach me',
};

export function render() {
  setAppTransparent();
  return `
    <section class="stack">
      <p>Best way to reach me:</p>
      <ul class="list">
        <li>Email: <a href="mailto:robsim37@gmail.com">robsim37@gmail.com</a></li>
        <!-- Replace with Formspree/Netlify/Basin later if desired. -->
      </ul>
    </section>
  `;
}
