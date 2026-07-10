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
 * load fonts.css and set a session storage flag
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
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks() {
  try {
    // TODO: add auto block, if needed
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();

  // Apply site-wide background: page metadata overrides global config,
  // and an image (if configured) takes precedence over a solid color.
  const config = await getSiteConfig();
  const pageBgImage = getMetadata('page-background-image');
  const bgImage = pageBgImage || config['page-background-image'];

  if (bgImage) {
    document.documentElement.style.setProperty(
      '--page-background-image',
      `url('${bgImage}')`,
    );
    document.body.classList.add('has-page-background');
  } else if (config['main-background']) {
    doc.querySelector('main').style.backgroundColor = config['main-background'];
    document.body.style.backgroundColor = config['main-background'];
    doc.querySelector('main').style.color = '#ffffff';
  }

  const main = doc.querySelector('main');
  const formBackground = getMetadata('form-background');
const pageBackgroundImage = getMetadata('page-background-image');

if (main && formBackground) {
  main.style.setProperty('--page-form-background', formBackground);
  document.body.classList.add('has-form-background');
}

if (main && pageBackgroundImage) {
  main.style.setProperty(
    '--page-form-background-image',
    `url("${pageBackgroundImage}")`,
  );
  document.body.classList.add('has-form-background-image');
}

  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }
  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
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
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
