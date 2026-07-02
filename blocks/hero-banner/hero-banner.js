export default function decorate(block) {
  const rows = [...block.children];

  const bgColor = rows[0]?.querySelector('p')?.textContent?.trim() || '#8B0000';
  const badgeImg = rows[1]?.querySelector('img');
  const leftLogoImg = rows[2]?.querySelector('img');
  const headline = rows[3]?.querySelector('p')?.textContent?.trim() || '';
  const rightLogoImg = rows[4]?.querySelector('img');
  const subtext = rows[5]?.querySelector('p')?.textContent?.trim() || '';

  block.innerHTML = '';
  block.style.backgroundColor = bgColor;

  // Badge
  if (badgeImg) {
    const badge = document.createElement('div');
    badge.className = 'hero-banner-badge';
    badge.appendChild(badgeImg.cloneNode(true));
    block.appendChild(badge);
  }

  // Desktop: teams row with logos flanking headline
  const teamsRow = document.createElement('div');
  teamsRow.className = 'hero-banner-teams';

  if (leftLogoImg) {
    const left = document.createElement('div');
    left.className = 'hero-banner-logo hero-banner-logo-left';
    left.appendChild(leftLogoImg.cloneNode(true));
    teamsRow.appendChild(left);
  }

  const headlineEl = document.createElement('h1');
  headlineEl.className = 'hero-banner-headline';
  headlineEl.textContent = headline;
  teamsRow.appendChild(headlineEl);

  if (rightLogoImg) {
    const right = document.createElement('div');
    right.className = 'hero-banner-logo hero-banner-logo-right';
    right.appendChild(rightLogoImg.cloneNode(true));
    teamsRow.appendChild(right);
  }

  block.appendChild(teamsRow);

  // Mobile: logos side by side below headline
  if (leftLogoImg || rightLogoImg) {
    const mobileLogos = document.createElement('div');
    mobileLogos.className = 'hero-banner-logos-mobile';

    if (leftLogoImg) {
      const left = document.createElement('div');
      left.className = 'hero-banner-logo';
      left.appendChild(leftLogoImg.cloneNode(true));
      mobileLogos.appendChild(left);
    }

    if (rightLogoImg) {
      const right = document.createElement('div');
      right.className = 'hero-banner-logo';
      right.appendChild(rightLogoImg.cloneNode(true));
      mobileLogos.appendChild(right);
    }

    block.appendChild(mobileLogos);
  }

  // Subtext
  if (subtext) {
    const sub = document.createElement('p');
    sub.className = 'hero-banner-subtext';
    sub.textContent = subtext;
    block.appendChild(sub);
  }
}
