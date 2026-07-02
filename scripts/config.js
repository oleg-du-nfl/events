let siteConfig = null;

export async function getSiteConfig() {
  if (siteConfig) return siteConfig;
  try {
    const resp = await fetch('/config.json');
    const json = await resp.json();
    siteConfig = {};
    json.data.forEach(({ key, value }) => {
      siteConfig[key] = value;
    });
  } catch (e) {
    siteConfig = {};
  }
  return siteConfig;
}
