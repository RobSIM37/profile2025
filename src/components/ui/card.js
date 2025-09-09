// Simple card for gallery items
// Card({ title, tagline, img, link, alt }) -> string

export function Card({ title, tagline = '', img, link, alt }) {
  const safeTitle = esc(title);
  const safeTag = tagline ? `<p class="card-tagline">${esc(tagline)}</p>` : '';
  const safeAlt = esc(alt || tagline || title || '');
  return `
    <article class="card">
      <a href="${esc(link)}" class="card-link">
        <div class="card-media">
          <img loading="lazy" src="${esc(img)}" alt="${safeAlt}" />
        </div>
        <div class="card-body">
          <h3 class="card-title">${safeTitle}</h3>
          ${safeTag}
        </div>
      </a>
    </article>
  `;
}

function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

