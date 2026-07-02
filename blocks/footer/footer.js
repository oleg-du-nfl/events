import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { getSiteConfig } from '../../scripts/config.js';

export default async function decorate(block) {
  // Page-level metadata overrides global config
  const pageFooterBg = getMetadata('footer-background');
  const config = await getSiteConfig();
  const bgColor = pageFooterBg || config['footer-background'];

  if (bgColor) {
    document.querySelector('footer').style.backgroundColor = bgColor;
  }

  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);
  block.append(footer);
}
