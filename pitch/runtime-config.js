// Deployment-owned links. Do not take product destinations from query parameters.
(() => {
  const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname);
  window.PAC_PITCH_RUNTIME = Object.freeze({
    websiteUrl: local ? 'http://127.0.0.1:4361/website/#/' : '/pac-machinery-demo/website/#/',
    workspaceUrl: local ? 'http://127.0.0.1:4361/#present/deal-pac-demo' : '/pac-machinery-demo/#present/deal-pac-demo',
    local,
  });
})();

window.PAC_PITCH_RUNTIME = Object.freeze({...window.PAC_PITCH_RUNTIME, staticPreview: true});
