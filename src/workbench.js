// PAC navigation separates the sales workspace from the active deal's tools.
// It owns navigation preferences only; quote and deal data stay in sales-domain.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PREFERENCE = 'pac-machinery-demo.pac.rollbag.ui.sidebar.v1';
let context = {deals: []};
let initialized = false;
let returnFocus = null;
// Unmodified Feather Icons 4.29.2 (MIT); see assets/icons/feather/SOURCE.txt.
const iconAliases = {hub:'tag',configure:'sliders',overview:'file-text',cube:'box',catalog:'box',document:'file-text',collapse:'chevrons-left',expand:'chevrons-right',close:'x',arrow:'arrow-up-right',help:'help-circle'};
const iconNames = new Set(['tag','box','search','chevrons-left','chevrons-right','menu','x','arrow-up-right','help-circle','file-text','sliders','circle','arrow-right','chevron-down','message-square','link','trash-2','edit-2','plus','more-horizontal','calendar','check','info','save','external-link','clock','user','arrow-left','download','alert-circle','monitor']);
export function icon(name) { const file=iconAliases[name] || (iconNames.has(name)?name:'file-text'); return `<img class="pac-library-icon" src="/pac-machinery-demo/assets/icons/feather/${file}.svg" width="18" height="18" alt="" aria-hidden="true">`; }
function collapsed() { try { return localStorage.getItem(PREFERENCE) === 'collapsed'; } catch { return false; } }
function activeDeal() { return context.deals.find(d => d.id === context.dealId) || context.deals[0]; }
function destinations() {
  const deal = activeDeal();
  const quote = deal?.quotes.find(q => q.id === context.quoteId) || deal?.quotes[0];
  const global = [
    {name:'Deals', detail:'Sales opportunities and follow-up', href:'#workspace', icon:'hub', active:['workspace','deal','quote','deal-explorer','demo'].includes(context.view)},
    {name:'Review queue',detail:'Application, engineering and commercial approvals',href:'#reviews',icon:'check',active:context.view==='reviews'},
    {name:'Catalog admin',detail:'Controlled prices and option rules',href:'#catalog-admin',icon:'sliders',active:context.view==='catalog-admin'},
    {name:'Product catalog', detail:'PAC machines, options and source media', href:'#machines', icon:'catalog', active:['machines','detail','requirements','configure','proposal','drafts'].includes(context.view)},
  ];
  const scoped = deal ? [
    {name:'Overview', detail:`${deal.title} · Application, alternatives and activity`, href:`#deal/${deal.id}`, icon:'overview', active:context.view==='deal'},
    {name:'Quote builder', detail:'Configure and review this deal’s alternatives', href:quote ? `#quote/${deal.id}/${quote.id}` : `#deal/${deal.id}`, icon:'configure', active:context.view==='quote'},
    {name:'3D Explorer', detail:'Inspect and capture references for this deal', href:`#deal-explorer/${deal.id}${quote?`/${quote.id}`:''}`, icon:'cube', active:context.view==='deal-explorer'},
    {name:'Present proposal', detail:'Sales presentation of the published version', href:`#present/${deal.id}`, icon:'document', external:true},
  ] : [];
  return {global, scoped};
}
function crumb() {
  const deal = activeDeal();
  const separator='<span aria-hidden="true">/</span>';
  if(['reviews','catalog-admin'].includes(context.view))return `<span aria-current="page">${context.view==='reviews'?'Review queue':'Catalog administration'}</span>`;
  if(context.view==='workspace')return '<span aria-current="page">Deals</span>';
  if(deal && ['deal','quote','deal-explorer','demo'].includes(context.view)) {
    const quote=deal.quotes.find(q=>q.id===context.quoteId);
    const index=deal.quotes.indexOf(quote);
    const label=context.view==='deal-explorer'?'Explorer':index>=0?`Alternative ${index<26?String.fromCharCode(65+index):index+1}`:'Quote builder';
    return `<a href="#workspace">Deals</a>${separator}${['deal','demo'].includes(context.view)?`<span aria-current="page">${esc(deal.number)}</span>`:`<a class="pac-crumb-deal" href="#deal/${esc(deal.id)}">${esc(deal.number)}</a>${separator}<span aria-current="page">${esc(label)}</span>`}`;
  }
  const labels={machines:'Product catalog',detail:'Product details',requirements:'Application',configure:'Catalog configuration',proposal:'Recover configuration',drafts:'Previous browser drafts','catalog-start':'Add to a deal',discovery:'Reference walkthrough'};
  return `${context.view==='machines'?'':`<a href="#machines">Product catalog</a>${separator}`}<span aria-current="page">${esc(labels[context.view]||'Workspace')}</span>`;
}
function navLink(item) {
  return `<a href="${esc(item.href)}" class="pac-nav-link${item.active?' is-active':''}" ${item.active?'aria-current="page"':''} title="${esc(item.name)}" aria-label="${esc(item.name)}"><span class="pac-nav-icon">${icon(item.icon)}</span><span class="pac-nav-label">${item.name}</span>${item.external?`<span class="pac-nav-external">${icon('arrow')}</span>`:''}</a>`;
}
export function render({view, body, footer = '', deals = [], dealId, quoteId,user = null}) {
  context = {view,deals,dealId,quoteId,user};
  if (view === 'present') return body + footer;
  const isCollapsed = collapsed();
  const deal = activeDeal();
  const navigation = destinations();
  return `<div class="pac-shell${isCollapsed ? ' is-collapsed' : ''}">
    <button class="pac-sidebar-backdrop" data-pac-action="close-menu" aria-label="Close navigation menu" tabindex="-1"></button>
    <aside class="pac-sidebar" aria-label="Workspace navigation">
      <div class="pac-sidebar-head"><a class="pac-brand" href="#workspace" aria-label="PAC sales workspace"><img src="/pac-machinery-demo/assets/pac-machinery-logo.png" alt="PAC Machinery"><span class="pac-brand-compact" aria-hidden="true">PAC</span></a><button class="pac-icon-button pac-mobile-close" data-pac-action="close-menu" aria-label="Close navigation menu">${icon('close')}</button></div>
      <div class="pac-sidebar-scroll"><button class="pac-search" data-pac-action="search" aria-label="Search workspace">${icon('search')}<span class="pac-nav-label">Search</span><kbd>⌘K</kbd></button><div class="pac-space-label">Workspace</div>
        <nav class="pac-nav" aria-label="Main navigation">${navigation.global.map(navLink).join('')}</nav>
        ${deal ? `<section class="pac-deal-navigation" aria-label="Recent deal"><div class="pac-nav-section-label">Recent</div><a class="pac-deal-context" href="#deal/${esc(deal.id)}" title="${esc(deal.customer)} · ${esc(deal.title)}" aria-label="Open ${esc(deal.customer)} deal"><span class="pac-deal-dot" aria-hidden="true"></span><span class="pac-nav-label">${esc(deal.customer)}</span></a></section>` : ''}
      </div>
      <div class="pac-sidebar-footer"><div class="pac-user"><span class="pac-avatar" aria-hidden="true">${user?esc(user.name.split(/\s+/).map(s=>s[0]).join('').slice(0,2)):"KX"}</span><div class="pac-nav-label"><strong>${esc(user?.name||"Kyle Xu")}</strong><small>${user?esc(user.role):"Demo workspace"}</small></div></div><button class="pac-icon-button pac-collapse" data-pac-action="collapse" aria-label="${isCollapsed ? 'Expand' : 'Collapse'} sidebar" aria-expanded="${!isCollapsed}">${icon(isCollapsed ? 'expand' : 'collapse')}</button></div>
    </aside>
    <div class="pac-shell-body"><header class="pac-topbar"><button class="pac-icon-button pac-mobile-toggle" data-pac-action="open-menu" aria-label="Open navigation menu" aria-expanded="false">${icon('menu')}</button><nav class="pac-crumbs" aria-label="Breadcrumb">${crumb()}</nav><div class="pac-topbar-actions">${user?`<div class="sw-server-status"><span>Shared workspace</span><button type="button" data-service-logout>Sign out</button></div>`:""}<button class="pac-icon-button" data-pac-action="help" aria-label="Workspace help">${icon('help')}</button></div></header><div class="pac-content">${body}${footer}</div></div>
    <dialog class="pac-search-dialog" aria-labelledby="pac-search-title"><div class="pac-search-head"><h2 id="pac-search-title">Search workspace</h2><button class="pac-icon-button" data-pac-action="close-search" aria-label="Close search">${icon('close')}</button></div><label class="pac-search-field">${icon('search')}<input type="search" id="pac-navigation-search" aria-label="Find a page, deal or customer" placeholder="Find a page, deal or customer…" autocomplete="off"></label><div class="pac-search-results"></div><div class="pac-search-hint">Select a result to open it <span><kbd>Esc</kbd> to close</span></div></dialog>
    <dialog class="pac-help-dialog" aria-labelledby="pac-help-title"><div class="pac-search-head"><h2 id="pac-help-title">Using this workspace</h2><button class="pac-icon-button" data-pac-action="close-help" aria-label="Close workspace help">${icon('close')}</button></div><div class="pac-help-content"><p>Keep the application, quote alternatives and customer conversation together in one deal.</p><ol><li>Open a quote to configure equipment and save your changes.</li><li>Review and issue a revision, then publish a customer proposal.</li><li>Start a revision from a customer request. Earlier issued versions stay unchanged.</li></ol><p>Explorer references stay attached to the originating deal and quote.</p><p class="pac-help-note">${user?"Changes are saved to the local service. Share a recipient link after publishing. PAC SSO and email are not connected.":"This demo saves in this browser. Publishing does not send an email or place an order."}</p><a class="pac-help-action" href="#workspace">Open deals</a></div></dialog>
  </div>`;
}
function searchResults(value = '') {
  const query = value.trim().toLowerCase();
  const navigation = destinations();
  const items = [...navigation.global, ...navigation.scoped, ...context.deals.map(deal=>({name:deal.title, detail:`${deal.number} · ${deal.customer}`,href:`#deal/${deal.id}`,icon:'overview'}))];
  const matched = items.filter(item=>`${item.name} ${item.detail}`.toLowerCase().includes(query));
  const list = document.querySelector('.pac-search-results');
  if (list) list.innerHTML = matched.length ? matched.map(item=>`<a href="${esc(item.href)}">${icon(item.icon)}<span><strong>${esc(item.name)}</strong><small>${esc(item.detail)}</small></span>${icon('arrow')}</a>`).join('') : '<p>No matching pages or deals.</p>';
}
function openSearch() {
  const dialog = document.querySelector('.pac-search-dialog');
  if (!dialog || document.querySelector('dialog[open]')) return;
  if (document.querySelector('.pac-shell.is-menu-open')) menu(false);
  returnFocus = document.activeElement;
  searchResults(); dialog.showModal(); dialog.querySelector('input')?.focus();
  dialog.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();},{once:true});
}
function closeSearch() { document.querySelector('.pac-search-dialog')?.close(); }
function openHelp() {
  const dialog=document.querySelector('.pac-help-dialog');
  if(!dialog || document.querySelector('dialog[open]'))return;
  returnFocus=document.activeElement;
  dialog.showModal();
  dialog.querySelector('button')?.focus();
  dialog.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();},{once:true});
}
function closeHelp() { document.querySelector('.pac-help-dialog')?.close(); }
function menu(open) {
  const shell = document.querySelector('.pac-shell');
  if (!shell) return;
  shell.classList.toggle('is-menu-open',open);
  const toggle = shell.querySelector('.pac-mobile-toggle');
  toggle?.setAttribute('aria-expanded',String(open));
  shell.querySelector('.pac-shell-body').inert = open;
  if (open) shell.querySelector('.pac-mobile-close')?.focus(); else if (toggle?.getClientRects().length) toggle.focus();
}
export function init() {
  if (initialized) return;
  initialized = true;
  document.addEventListener('click',event=>{
    const button = event.target.closest('[data-pac-action]');
    if (button) {
      event.preventDefault();
      const action = button.dataset.pacAction;
      if (action==='collapse') {
        const shell = document.querySelector('.pac-shell');
        const value = !shell.classList.contains('is-collapsed');
        shell.classList.toggle('is-collapsed',value);
        button.setAttribute('aria-expanded',String(!value));
        button.setAttribute('aria-label',`${value?'Expand':'Collapse'} sidebar`);
        button.innerHTML=icon(value?'expand':'collapse');
        try { localStorage.setItem(PREFERENCE,value?'collapsed':'expanded'); } catch { /* Navigation remains usable in this window. */ }
      }
      if (action==='open-menu') menu(true);
      if (action==='close-menu') menu(false);
      if (action==='search') openSearch();
      if (action==='close-search') closeSearch();
      if (action==='help') openHelp();
      if (action==='close-help') closeHelp();
    }
    if (event.target.closest('.pac-search-results a')) closeSearch();
    if (event.target.closest('.pac-help-content a')) closeHelp();
    if (event.target.closest('.pac-sidebar a') && document.querySelector('.pac-shell.is-menu-open')) menu(false);
  });
  document.addEventListener('input',event=>{if(event.target.id==='pac-navigation-search')searchResults(event.target.value);});
  document.addEventListener('keydown',event=>{
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase()==='k' && !event.target.matches('input,textarea,select,[contenteditable="true"]')) { event.preventDefault(); openSearch(); }
    if (document.querySelector('.pac-shell.is-menu-open')) {
      if (event.key==='Escape') { event.preventDefault(); menu(false); }
      if (event.key==='Tab') {
        const focusable = [...document.querySelectorAll('.pac-sidebar a,.pac-sidebar button')].filter(node=>node.getClientRects().length);
        const first=focusable[0],last=focusable.at(-1);
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
      }
    }
  });
  window.addEventListener('resize',()=>{
    if(window.innerWidth>=768 && document.querySelector('.pac-shell.is-menu-open'))menu(false);
  });
}
