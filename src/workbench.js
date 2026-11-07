// PAC's application frame follows the Mr Winter Workbench shell.
// It owns navigation preferences only; quote and deal data stay in sales-domain.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PREFERENCE = 'pac.rollbag.ui.sidebar.v1';
let context = {deals: []};
let initialized = false;
let returnFocus = null;
const paths = {
  hub: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  configure: '<path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  workflow: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 8 1 1 2-2m-3 8 1 1 2-2m3-6h3m-3 7h3"/>',
  cube: '<path d="m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 10 9-5M3 8l9 5m0 0v8M7.5 5.5l9 5"/>',
  catalog: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>',
  document: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  collapse: '<path d="m13 6-6 6 6 6m5-12-6 6 6 6"/>',
  expand: '<path d="m6 6 6 6-6 6m5-12 6 6-6 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
};
export function icon(name) { return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.document}</svg>`; }
function collapsed() { try { return localStorage.getItem(PREFERENCE) === 'collapsed'; } catch { return false; } }
function activeDeal() { return context.deals.find(d => d.id === context.dealId) || context.deals[0]; }
function destinations() {
  const deal = activeDeal();
  const quote = deal?.quotes.find(q => q.id === context.quoteId) || deal?.quotes[0];
  const quoteHash = quote ? `#quote/${deal.id}/${quote.id}` : deal ? `#deal/${deal.id}` : '#workspace';
  return [
    {name:'Sales hub', detail:'Deals, quotes and follow-up', href:'#workspace', icon:'hub', active:context.view==='workspace'},
    {name:'Configure', detail:'Machine, options and engineering', href:quoteHash, icon:'configure', active:context.view==='quote'},
    {name:'Workflow', detail:'Application, review and activity', href:deal ? `#deal/${deal.id}` : '#workspace', icon:'workflow', active:context.view==='deal'},
    {name:'3D Explorer', detail:'Capture evidence for this deal', href:deal ? `#deal-explorer/${deal.id}` : '#workspace', icon:'cube', active:context.view==='deal-explorer'},
    {name:'Product catalog', detail:'PAC machines and source options', href:'#machines', icon:'catalog', active:['machines','detail','requirements','configure','proposal','drafts'].includes(context.view)},
  ];
}
function crumb() {
  const deal = activeDeal();
  const labels = {workspace:'Sales hub',deal:'Workflow',quote:'Configure','deal-explorer':'3D Explorer',machines:'Product catalog',detail:'Product details',requirements:'Application',configure:'Catalog configuration',proposal:'Catalog proposal',drafts:'Saved drafts',discovery:'Reference walkthrough'};
  return `<a href="#workspace">PAC workspace</a><span aria-hidden="true">/</span><span>${esc(labels[context.view] || 'Workspace')}</span>${deal && ['deal','quote','deal-explorer'].includes(context.view) ? `<span aria-hidden="true">/</span><span class="winter-crumb-id">${esc(deal.number)}</span>` : ''}`;
}
export function render({view, body, footer = '', deals = [], dealId, quoteId}) {
  context = {view,deals,dealId,quoteId};
  if (view === 'demo' || view === 'present') return body + footer;
  const isCollapsed = collapsed();
  const deal = activeDeal();
  const proposal = deal ? `#present/${deal.id}` : '#demo';
  return `<div class="winter-shell${isCollapsed ? ' is-collapsed' : ''}">
    <button class="winter-sidebar-backdrop" data-winter-action="close-menu" aria-label="Close navigation menu" tabindex="-1"></button>
    <aside class="winter-sidebar" aria-label="Workspace navigation">
      <div class="winter-sidebar-head"><a class="winter-brand" href="#workspace" aria-label="PAC sales hub"><img src="/assets/pac-machinery-logo.png" alt="PAC Machinery"><span class="winter-brand-compact" aria-hidden="true">PAC</span></a><button class="winter-icon-button winter-collapse" data-winter-action="collapse" aria-label="${isCollapsed ? 'Expand' : 'Collapse'} sidebar" aria-expanded="${!isCollapsed}">${icon(isCollapsed ? 'expand' : 'collapse')}</button><button class="winter-icon-button winter-mobile-close" data-winter-action="close-menu" aria-label="Close navigation menu">${icon('close')}</button></div>
      <nav class="winter-nav" aria-label="Main navigation">${destinations().map(item=>`<a href="${esc(item.href)}" class="${item.active?'is-active':''}" ${item.active?'aria-current="page"':''} title="${esc(item.name)}"><span class="winter-nav-icon">${icon(item.icon)}</span><span class="winter-nav-label">${item.name}</span></a>`).join('')}</nav>
      <div class="winter-sidebar-footer"><a class="winter-proposal-link" href="${esc(proposal)}" title="Customer proposal"><span class="winter-nav-icon">${icon('document')}</span><span class="winter-nav-label">Customer proposal</span><span class="winter-nav-label">${icon('arrow')}</span></a><div class="winter-user"><span class="winter-avatar" aria-hidden="true">PC</span><div class="winter-nav-label"><strong>PAC sales team</strong><small>Browser demo</small></div></div></div>
    </aside>
    <div class="winter-shell-body"><header class="winter-topbar"><button class="winter-icon-button winter-mobile-toggle" data-winter-action="open-menu" aria-label="Open navigation menu" aria-expanded="false">${icon('menu')}</button><nav class="winter-crumbs" aria-label="Breadcrumb">${crumb()}</nav><button class="winter-search" data-winter-action="search" aria-label="Search workspace">${icon('search')}<span>Search workspace…</span><kbd>⌘K</kbd></button><div class="winter-topbar-actions"><span class="winter-local-status"><span aria-hidden="true"></span>Local demo</span><a href="${esc(proposal)}" class="winter-topbar-proposal">View proposal ${icon('arrow')}</a></div></header><div class="winter-content">${body}${footer}</div></div>
    <dialog class="winter-search-dialog" aria-labelledby="winter-search-title"><div class="winter-search-head"><h2 id="winter-search-title">Search workspace</h2><button class="winter-icon-button" data-winter-action="close-search" aria-label="Close search">${icon('close')}</button></div><label class="winter-search-field">${icon('search')}<input type="search" id="winter-navigation-search" aria-label="Find a page, deal or customer" placeholder="Find a page, deal or customer…" autocomplete="off"></label><div class="winter-search-results"></div></dialog>
  </div>`;
}
function searchResults(value = '') {
  const query = value.trim().toLowerCase();
  const items = [...destinations(), ...context.deals.map(deal=>({name:deal.title, detail:`${deal.number} · ${deal.customer}`,href:`#deal/${deal.id}`,icon:'workflow'}))];
  const matched = items.filter(item=>`${item.name} ${item.detail}`.toLowerCase().includes(query));
  const list = document.querySelector('.winter-search-results');
  if (list) list.innerHTML = matched.length ? matched.map(item=>`<a href="${esc(item.href)}">${icon(item.icon)}<span><strong>${esc(item.name)}</strong><small>${esc(item.detail)}</small></span>${icon('arrow')}</a>`).join('') : '<p>No matching pages or deals.</p>';
}
function openSearch() {
  const dialog = document.querySelector('.winter-search-dialog');
  if (!dialog || document.querySelector('dialog[open]')) return;
  if (document.querySelector('.winter-shell.is-menu-open')) menu(false);
  returnFocus = document.activeElement;
  searchResults(); dialog.showModal(); dialog.querySelector('input')?.focus();
}
function closeSearch() {
  document.querySelector('.winter-search-dialog')?.close();
  returnFocus?.isConnected && returnFocus.focus();
}
function menu(open) {
  const shell = document.querySelector('.winter-shell');
  if (!shell) return;
  shell.classList.toggle('is-menu-open',open);
  const toggle = shell.querySelector('.winter-mobile-toggle');
  toggle?.setAttribute('aria-expanded',String(open));
  shell.querySelector('.winter-shell-body').inert = open;
  if (open) shell.querySelector('.winter-mobile-close')?.focus(); else toggle?.focus();
}
export function init() {
  if (initialized) return;
  initialized = true;
  document.addEventListener('click',event=>{
    const button = event.target.closest('[data-winter-action]');
    if (button) {
      event.preventDefault();
      const action = button.dataset.winterAction;
      if (action==='collapse') {
        const shell = document.querySelector('.winter-shell');
        const value = !shell.classList.contains('is-collapsed');
        shell.classList.toggle('is-collapsed',value);
        button.setAttribute('aria-expanded',String(!value));
        button.setAttribute('aria-label',`${value?'Expand':'Collapse'} sidebar`);
        button.innerHTML=icon(value?'expand':'collapse');
        try { localStorage.setItem(PREFERENCE,value?'collapsed':'expanded'); } catch { /* The current window still works. */ }
      }
      if (action==='open-menu') menu(true);
      if (action==='close-menu') menu(false);
      if (action==='search') openSearch();
      if (action==='close-search') closeSearch();
    }
    if (event.target.closest('.winter-search-results a')) closeSearch();
    if (event.target.closest('.winter-sidebar a') && document.querySelector('.winter-shell.is-menu-open')) menu(false);
  });
  document.addEventListener('input',event=>{if(event.target.id==='winter-navigation-search')searchResults(event.target.value);});
  document.addEventListener('keydown',event=>{
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase()==='k' && !event.target.matches('input,textarea,select,[contenteditable="true"]')) { event.preventDefault(); openSearch(); }
    if (document.querySelector('.winter-shell.is-menu-open')) {
      if (event.key==='Escape') { event.preventDefault(); menu(false); }
      if (event.key==='Tab') {
        const focusable = [...document.querySelectorAll('.winter-sidebar a,.winter-sidebar button')].filter(node=>node.getClientRects().length);
        const first=focusable[0],last=focusable.at(-1);
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
      }
    }
  });
  window.addEventListener('resize',()=>{
    if(window.innerWidth>=768 && document.querySelector('.winter-shell.is-menu-open'))menu(false);
  });
}
