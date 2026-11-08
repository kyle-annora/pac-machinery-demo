// PAC-owned entry point. The upstream bundle and source geometry stay intact.
// Only the homepage explicitly opts into this illustrative branding treatment.
if (new URLSearchParams(location.search).get('surface') === 'website') {
  document.documentElement.dataset.pacSurface = 'website';
  // Load before the renderer measures its available scene area for framing.
  await new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./pac-website.css', import.meta.url).href;
    link.onload = link.onerror = resolve;
    document.head.append(link);
  });
}
if (new URLSearchParams(location.search).get('branding') === 'pac') {
  const { installPacBranding } = await import('./pac-branding.js');
  installPacBranding();
}
await import('./assets/explorer-DjmcOZCN.js');
