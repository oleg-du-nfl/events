import {
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  getMetadata,
} from './aem.js';
import { getSiteConfig } from './config.js';

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
function decorateMain(main) {
  decorateButtons(main);
  decorateIcons(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Loads fonts.
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Applies page-level background and text-color metadata.
 *
 * da.live Metadata keys:
 * - Form Background: #FFFFFF
 * - Page Background Image: /path/to/image.jpg
 * - Text Color: #111111
 *
 * Form Background controls the form surface. When an image is also set,
 * the same color is used as an overlay across the header/hero width.
 * Text Color, when present, overrides body/heading/form text color site-wide.
 * @param {Document} doc The document
 * @param {object} config Site configuration
 */
function applyPageBackgroundMetadata(doc, config = {}) {
  const formBackground = getMetadata('form-background') || config['form-background'];
  const pageBackgroundImage = getMetadata('page-background-image')
    || config['page-background-image'];
  const textColor = getMetadata('text-color') || config['text-color'];

  if (formBackground) {
    document.documentElement.style.setProperty('--page-form-background', formBackground);
    document.body.classList.add('has-form-background');
  }

  if (pageBackgroundImage) {
    document.documentElement.style.setProperty(
      '--page-background-image',
      `url("${pageBackgroundImage}")`,
    );
    document.body.classList.add('has-page-background');
  }

  if (formBackground && pageBackgroundImage) {
    document.body.classList.add('has-header-background-overlay');
  }

  if (textColor) {
    document.documentElement.style.setProperty('--page-text-color', textColor);
    document.body.classList.add('has-text-color');
  }

  if (!pageBackgroundImage && config['main-background']) {
    const main = doc.querySelector('main');
    if (main) {
      main.style.backgroundColor = config['main-background'];
      main.style.color = textColor || '#fff';
    }
    document.body.style.backgroundColor = config['main-background'];
  }
}

/**
 * Loads everything needed to get to LCP.
 * @param {Document} doc The document
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();

  const config = await getSiteConfig();
  applyPageBackgroundMetadata(doc, config);

  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  if (sessionStorage.getItem('fonts-loaded')) loadFonts();
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Document} doc The document
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));
  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads delayed functionality.
 */
function loadDelayed() {
  window.setTimeout(() => import('./delayed.js'), 3000);
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
