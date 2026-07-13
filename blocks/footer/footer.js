import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { getSiteConfig } from '../../scripts/config.js';

export default async function decorate(block) {
  // Footer styling remains independent from Form Background and Text Color.
  const pageFooterBg = getMetadata('footer-background');
  const config = await getSiteConfig();
  const backgroundColor = pageFooterBg || config['footer-background'];

  const footer = document.querySelector('footer');
  if (footer && backgroundColor) {
    footer.style.backgroundColor = backgroundColor;
  }

  // Load the footer fragment path from the block content.
  const footerPath = block.textContent.trim();
  block.textContent = '';

  if (footerPath) {
    const fragment = await loadFragment(footerPath);
    if (fragment) block.append(...fragment.childNodes);
  }
}
