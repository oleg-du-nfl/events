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
 * Returns true when a metadata value should be treated as "on".
 * Accepts true/yes/on/y (case-insensitive). Anything else, including
 * missing values, is treated as false.
 * @param {string} value The raw metadata string
 * @returns {boolean}
 */
function isEnabled(value) {
  if (!value) return false;
  return ['true', 'yes', 'on', 'y'].includes(String(value).trim().toLowerCase());
}

/**
 * Applies page-level background and text-color metadata.
 *
 * da.live Metadata keys:
 * - Form Background: #FFFFFF
 *     Colors the form fields section only. Never affects the hero/header.
 * - Page Background Image: /path/to/image.jpg
 *     Renders full-bleed behind the hero banner (or the first section
 *     when no hero banner is present).
 * - Header Overlay: true
 *     Opt-in only. When explicitly set to true/yes/on, and both Form
 *     Background and Page Background Image are also set, the form color
 *     is layered as a translucent tint across the header/hero image.
 *     Leave unset (the default) to show the header image with no tint,
 *     even when Form Background is set for the form fields below it.
 * - Text Color: #111111
 *     Overrides body/heading/form text color site-wide.
 * @param {Document} doc The document
 * @param {object} config Site configuration
 */
function applyPageBackgroundMetadata(doc, config = {}) {
  const formBackground = getMetadata('form-background') || config['form-background'];
  const pageBackgroundImage = getMetadata('page-background-image')
    || config['page-background-image'];
  const textColor = getMetadata('text-color') || config['text-color'];
  const headerOverlayRequested = isEnabled(
    getMetadata('header-overlay') || config['header-overlay'],
  );

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

  // Header Overlay is opt-in: Form Background + Page Background Image alone
  // do NOT tint the header image. Explicitly set Header Overlay to enable it.
  if (formBackground && pageBackgroundImage && headerOverlayRequested) {
    document.body.classList.add('has-header-overlay-enabled');
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
