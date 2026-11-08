import {
  families,
  solutions,
  official,
  filterProducts,
  validateInquiry,
  referenceForProduct,
  escapeHTML as e,
  routeFromHash,
} from "./model.js";
import { loadingMethods, inquirySelectOptions, solutionContext, productPath, inquiryPath, prefillInquiry, inquirySnapshot, inquiryReceiptText, hasInquiryDraft, inquiryEntryNeedsChoice, archiveInquiryDraft } from "./inquiry-flow.js";
import { enrichProducts, explorerTopics, optionSummary, solutionGuides, sources } from "./content.js";
import { mountReferenceExplorer } from "./explorer.js";
import { renderHomeExplorer, mountHomeExplorer } from "./home-explorer.js";
import { renderHomeVideo, mountHomeVideo } from "./home-video.js";
const root = document.getElementById("website"),
  STORE = "pac-machinery-demo.pac.website.inquiry.v1";
let products = [],
  draft = {},
  receipt = null,
  submitted = null,
  requestId = crypto.randomUUID(),
  activeReference = null,
  cleanup = null,
  archivedDrafts = [],
  pendingReference = null,
  loadFailure = null;
try {
  const saved = JSON.parse(sessionStorage.getItem(STORE) || "null");
  if (saved) {
    draft = saved.fields && typeof saved.fields === "object" && !Array.isArray(saved.fields) ? saved.fields : {};
    requestId = saved.requestId || requestId;
    activeReference = saved.reference || null;
    receipt = saved.receipt || null;
    submitted = saved.submitted || null;
    archivedDrafts = Array.isArray(saved.archivedDrafts) ? saved.archivedDrafts.filter(item => item?.fields && typeof item.fields === "object" && typeof item.requestId === "string") : [];
    pendingReference = saved.pendingReference || null;
  }
} catch {}
const persist = () => {
  try {
    sessionStorage.setItem(
      STORE,
      JSON.stringify({
        fields: draft,
        requestId,
        reference: activeReference,
        receipt,
        submitted,
        archivedDrafts,
        pendingReference,
      }),
    );
    return true;
  } catch { return false; }
};
const icon = (name) =>
  `<img class="icon" src="/pac-machinery-demo/website/assets/icons/${name}.svg" alt="" aria-hidden="true">`;
const link = (href, label, cls = "button", outside = false) =>
  `<a class="${cls}" href="${e(href)}"${outside ? ' target="_blank" rel="noopener"' : ""}>${label}${icon(outside ? "arrow-up-right" : "arrow-right")}</a>`;
const photo = (p, { lazy = true, cls = "" } = {}) =>
  p?.photos?.[0]
    ? `<img class="${cls}" src="${e(p.photos[0].url)}" width="${p.photos[0].width}" height="${p.photos[0].height}" alt="${e(p.name)}" ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'}>`
    : `<div class="image-empty">Product image to confirm</div>`;
const product = (id) => products.find((p) => p.id === id);
const navItems = [
  ["products", "Products"],
  ["solutions", "Solutions"],
  ["resources", "Resources"],
  ["support", "Support"],
  ["about", "About"],
];
function shell(content, section = "") {
  const route = routeFromHash(location.hash);
  const currentProduct = ["products", "explorer"].includes(route.parts[0]) && product(route.parts[1]) ? route.parts[1] : "";
  const globalParams = new URLSearchParams({ entry: "global" });
  if (currentProduct) globalParams.set("product", currentProduct);
  const globalInquiry = `#/inquiry?${globalParams}`;
  return `<header class="site-header"><a class="brand" href="#/" aria-label="PAC Machinery home"><img src="/pac-machinery-demo/assets/pac-machinery-logo.png" alt="PAC Machinery" width="210" height="57"></a><nav id="main-nav" class="main-nav" aria-label="Main navigation">${navItems.map(([id, label]) => `<a href="#/${id}" ${section === id ? 'aria-current="page"' : ""}>${label}</a>`).join("")}</nav><a class="button button-yellow header-cta" href="${e(globalInquiry)}">Request a quote ${icon("arrow-up-right")}</a><button class="menu-toggle icon-button" data-menu aria-label="Open navigation" aria-expanded="false" aria-controls="main-nav">${icon("menu")}</button></header>${content}<footer class="site-footer"><div class="footer-statement"><p>More experience.<br>Better choices.</p><a href="${e(globalInquiry)}" class="text-link">Start a conversation ${icon("arrow-up-right")}</a></div><div class="footer-top"><div><a class="brand" href="#/"><img src="/pac-machinery-demo/assets/pac-machinery-logo.png" alt="PAC Machinery" width="210" height="57"></a><p>Equipment. Materials.<br> Application expertise.</p></div><div><h2>Explore</h2><a href="#/products">Packaging equipment</a><a href="#/solutions">Find your solution</a><a href="#/resources">Product resources</a></div><div><h2>We're here to help</h2><a href="${e(globalInquiry)}">Request a quote</a><a href="#/support">Technical support</a><a href="tel:18009859570">1-800-985-9570</a><a href="mailto:sales@pacmachinery.com">sales@pacmachinery.com</a></div><div><h2>PAC Machinery</h2><a href="#/about">About PAC</a><a href="#/contact">Contact us</a><a href="#/privacy">Privacy</a></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} PAC Machinery</span><span>Website demonstration</span></div></footer>`;
}
const crumb = (name, parent = null) =>
  `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/">Home</a>${parent ? `${icon("chevron-right")}<a href="#/${parent[0]}">${e(parent[1])}</a>` : ""}${icon("chevron-right")}<span aria-current="page">${e(name)}</span></nav>`;
function productCard(p, solutionId = "") {
  const href = productPath(p.id, solutionId);
  return `<article class="product-card"><a class="product-photo" href="${e(href)}" aria-label="View ${e(p.name)}">${photo(p)}</a><div class="product-card-info"><p class="product-type">${e(families[p.family])}</p><h3><a href="${e(href)}">${e(p.model)}</a></h3><p>${e(p.fit || p.subtitle)}</p><a class="text-link" href="${e(href)}">Explore equipment ${icon("arrow-right")}</a></div></article>`;
}
function cta(productId = "", solutionId = "") {
  return `<section class="contact-band"><div><h2>Let's start with <br>your product.</h2><p>Tell us what you pack and what needs to improve. We'll help you explore the equipment and options.</p></div>${link(inquiryPath(productId, solutionId), "Discuss your application", "button button-yellow")}</section>`;
}
function home() {
  const p = product("r3200"), fulfillment = product("r3200_fulfillment");
  return shell(
    `<main id="main" class="website-home refined-home">
      <section class="hero" aria-labelledby="home-title">
        <div class="hero-copy">
          <h1 id="home-title">Packaging <br>that works for <br>your product.</h1>
          <p>Equipment, materials and application expertise. Find a better way to pack with PAC Machinery.</p>
          <div class="actions">${link("#/solutions", "Find your solution", "button button-yellow")}<a href="#home-explorer" data-scroll="home-explorer" class="text-link">Explore the equipment ${icon("arrow-right")}</a></div>
          <div class="hero-proof"><span>Over 60 years of packaging experience</span><a href="#/about">Meet PAC ${icon("arrow-up-right")}</a></div>
        </div>
        <div class="hero-product">
          <div class="hero-stage-heading"><span>Rollbag R3200</span><span>Automatic bagging system</span></div>
          <a href="#/products/r3200" aria-label="View original Rollbag R3200 product photos and details"><img class="hero-studio-image" src="/pac-machinery-demo/website/assets/r3200-studio-v2.png" alt="AI-assisted studio visualization based on the PAC Rollbag R3200 product photograph" width="1448" height="1086" fetchpriority="high"></a>
          <div class="hero-caption"><div><strong>Built around the way you pack.</strong><span>Explore the machine. Discuss your application.</span><span class="hero-studio-note">AI-assisted studio visualization · Original photos in product details</span></div><a class="round-link" href="#/products/r3200" aria-label="View Rollbag R3200 details">${icon("arrow-right")}</a></div>
        </div>
      </section>
      <nav class="portfolio-band" aria-label="Packaging processes"><p>Equipment for the way you pack.</p><div><a href="#/products">Bagging ${icon("arrow-up-right")}</a><a href="https://www.pacmachinery.com/products/" target="_blank" rel="noopener">Sealing ${icon("arrow-up-right")}</a><a href="https://www.pacmachinery.com/products/" target="_blank" rel="noopener">Flow wrapping ${icon("arrow-up-right")}</a><a href="https://www.pacmachinery.com/products/" target="_blank" rel="noopener">Shrink wrapping ${icon("arrow-up-right")}</a></div></nav>
      ${renderHomeExplorer(p)}
      <section class="section"><div class="section-heading"><h2>What are <br>you packing?</h2><p>Your product is the starting point. Find the application that feels familiar, then explore the equipment and questions that matter.</p></div><div class="solution-grid home-solutions">${solutions.map(s => `<a class="solution-item" href="#/solutions/${s.id}"><div class="solution-image">${photo(product(s.products[0]))}</div><div><h3>${e(s.name)}${icon("arrow-up-right")}</h3><p>${e(s.summary)}</p></div></a>`).join("")}</div></section>
      <section class="explore-feature">
        ${renderHomeVideo(photo(fulfillment, {cls: "detail-photo"}))}
        <div class="feature-copy"><h2>Look closer. <br>Pack smarter.</h2><p>Loading. Sealing. Moving on to the next order. The details of your process matter.</p><p>Explore the Rollbag R3200 Fulfillment system, then discuss the equipment and options for your application.</p>${link("#/products/r3200_fulfillment", "Explore fulfillment packaging", "text-link")}</div>
      </section>
      <section class="section home-family"><div class="section-heading"><h2>The Rollbag family.</h2><p>Explore automatic bagging systems for your product and process.</p>${link("#/products", "View all equipment", "text-link")}</div><div class="home-equipment-list">${["r3200", "r3200_fulfillment", "r1285_med"].map(id => { const item=product(id); return `<a class="home-equipment-row" href="#/products/${id}"><div class="home-equipment-photo">${photo(item)}</div><div><h3>Rollbag ${e(item.model)}</h3><p>${e(item.subtitle)}</p></div><span class="home-equipment-action">View equipment ${icon("arrow-up-right")}</span></a>`; }).join("")}</div></section>
      <section class="experience-section"><h2>More than <br>a machine.</h2><div class="experience-list"><article><h3>Application expertise</h3><p>Work through product handling, materials, loading and sealing requirements with an experienced equipment specialist.</p></article><article><h3>Equipment and materials</h3><p>Explore packaging machines alongside the bags and materials they use, with options to suit your process.</p></article><article><h3>Support after installation</h3><p>PAC provides equipment training, parts and technical support to help you get the most from your system.</p></article></div></section>
      ${cta()}
    </main>`,
  );
}
function comparisonRows(items) {
  return items.map((p) => `<tr><th scope="row"><a href="${e(productPath(p.id))}">${e(p.model)}</a></th><td>${e(p.fit)}</td><td>${e(p.material)}</td><td>${e(p.facts?.[0]?.[1] || "Discuss with PAC")}</td></tr>`).join("");
}
function resourceLinks(p) {
  return (p.resources || []).map((r) => `<article class="equipment-resource">${link(r.url, e(r.title), "text-link", true)}<p class="small muted">${e(r.scope)}</p></article>`).join("");
}
function listing(params) {
  const query = params.get("q") || "", family = params.get("type") || "all";
  const items = filterProducts(products, { query, family });
  return shell(`<main id="main" class="page-content catalog-page">${crumb("Products")}
    <div class="page-heading"><h1>Find your packaging system.</h1><p>Compare the process, material and bag range. Then discuss the equipment that fits your application.</p></div>
    <form class="catalog-tools" id="catalog-filter"><label class="search-field">${icon("search")}<input aria-label="Search equipment" name="q" type="search" value="${e(query)}" placeholder="Search model or application"><button class="button button-dark" type="submit">Search</button></label><label class="filter-label">Equipment type<select name="type"><option value="all">All equipment</option>${Object.entries(families).map(([id,label])=>`<option value="${id}" ${family===id?'selected':''}>${label}</option>`).join("")}</select></label></form>
    <div class="results-heading"><p role="status">${items.length} ${items.length===1?'system':'systems'}${query?` matching “${e(query)}”`:''}</p>${query||family!=="all"?'<a class="text-link" href="#/products">Clear filters</a>':'<a class="text-link" href="#/solutions">Choose by application</a>'}</div>
    ${items.length ? `<details class="model-comparison"><summary>Compare model fit ${icon("chevron-down")}</summary><p class="small muted">Catalog configurations are a starting point. PAC confirms material, product clearance and current specifications.</p><div class="comparison-scroll" role="region" aria-label="Equipment comparison" tabindex="0"><table><caption class="sr-only">Equipment fit and catalog bag range</caption><thead><tr><th scope="col">Equipment</th><th scope="col">Consider for</th><th scope="col">Material / role</th><th scope="col">Key boundary</th></tr></thead><tbody>${comparisonRows(items)}</tbody></table></div></details><div class="product-grid listing-grid">${items.map((p)=>productCard(p)).join("")}</div>` : `<section class="empty-state"><h2>No equipment matches this search.</h2><p>Try a model name such as R3200, or explore all equipment.</p>${link("#/products","View all equipment","button button-dark")}</section>`}
    <section class="other-equipment"><h2>Looking for another packaging process?</h2><p>PAC also offers sealing, shrink wrapping, flow wrapping and packaging materials.</p>${link(official.products,"Explore the complete PAC portfolio","text-link",true)}</section>${cta()}</main>`,"products");
}
function detail(id, params) {
  const p = product(id), context = solutionContext(params.get("solution"));
  if (!p) return notFound();
  const features = p.benefits.filter((b) => b.items.length);
  const featureSection = features.length ? `<section id="features" class="product-section"><div><h2>How the system works.</h2></div><div class="feature-groups">${features.map((b)=>`<section><h3>${e(b.name.charAt(0).toUpperCase()+b.name.slice(1))}</h3><ul>${b.items.map((x)=>`<li>${e(x)}</li>`).join("")}</ul></section>`).join("")}</div></section>` : "";
  return shell(`<main id="main" class="page-content product-detail">${crumb(p.model,["products","Products"])}${context?`<p class="application-context">Exploring equipment for <a href="#/solutions/${context.id}">${e(context.name)}</a></p>`:""}
    <section class="product-intro"><div class="product-gallery"><div class="detail-image">${p.photos.length?`<img id="detail-photo" src="${e(p.photos[0].url)}" alt="${e(p.name)}" width="${p.photos[0].width}" height="${p.photos[0].height}"><button class="image-enlarge icon-button" data-enlarge aria-label="Enlarge product image">${icon("maximize-2")}</button>`:'<div class="image-empty">Equipment photograph unavailable. Ask PAC for the current configuration.</div>'}</div>${p.photos.length>1?`<div class="gallery-thumbnails">${p.photos.map((ph,i)=>`<button class="thumbnail ${i===0?'selected':''}" data-photo="${e(ph.url)}" aria-label="View photograph ${i+1}" aria-pressed="${i===0}"><img src="${e(ph.url)}" alt="" width="80" height="70" loading="lazy"></button>`).join("")}</div>`:""}<p class="small muted">${e(p.photoNote)}</p>${id==="r3200_bag_maker"?`<a class="text-link" href="${e(sources.r3200)}" target="_blank" rel="noopener">See PAC's tubing demonstrations ${icon("arrow-up-right")}</a>`:""}</div>
    <div class="product-intro-copy"><h1>${e(p.model)}</h1><p class="product-subtitle">${e(p.subtitle)}</p><p class="product-intro-summary">${e(p.description)}</p><dl class="product-fit-facts">${(p.facts||[]).map(([label,value])=>`<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join("")}</dl><div class="actions">${link(inquiryPath(id,context?.id),"Request a quote","button button-yellow")}${link(productPath(id,context?.id,"explorer"),"Explore the equipment","text-link")}</div><p class="small muted">PAC confirms suitability, configuration and current specifications for your application.</p></div></section>
    <section class="model-difference"><h2>Why this configuration?</h2><p>${e(p.distinction)}</p><a href="#/products?type=${e(p.family)}" class="text-link">Compare the equipment range ${icon("arrow-right")}</a></section>
    <nav class="section-nav" aria-label="Product sections"><a href="#specifications" data-scroll="specifications">Specifications</a>${features.length?'<a href="#features" data-scroll="features">Features</a>':''}<a href="#options" data-scroll="options">Options</a><a href="#resources" data-scroll="resources">Resources</a></nav>
    <section id="specifications" class="product-section"><div><h2>At a glance.</h2><p>Specifications from the supplied PAC catalog configuration. Actual output depends on product, material, loading and printing. Confirm the current configuration with PAC.</p></div><dl class="spec-table">${p.specs.map((x)=>`<div><dt>${e(x.name)}</dt><dd>${e(x.value)}</dd></div>`).join("")||'<div><dt>Application review</dt><dd>Discuss your requirements with PAC.</dd></div>'}</dl></section>
    ${featureSection}<section id="options" class="product-section"><div><h2>Make it work for your process.</h2><p>Discuss availability and compatibility with PAC before choosing an option.</p></div><div class="option-list">${p.options.map((o,i)=>`<details ${i>=12?'hidden data-extra-option':''}><summary>${e(o.name)}${icon("plus")}</summary><p>${e(o.description)}</p>${o.photo?`<img src="${e(o.photo.url)}" alt="${e(o.name)} reference" width="${o.photo.width}" height="${o.photo.height}" loading="lazy"><p class="small muted">${e(o.applicability)}</p>`:''}${link(inquiryPath(id,context?.id,"I would like to discuss "+o.name+"."),"Ask about this option","text-link")}</details>`).join("")||`<div class="option-consultation"><h3>Review your application with PAC.</h3><p>${e(p.facts?.at(-1)?.[1]||'Confirm the equipment and integration requirements.')}.</p>${link(inquiryPath(id,context?.id,"Please help confirm options for "+p.model+"."),"Discuss the configuration","text-link")}</div>`}${p.options.length>12?`<button class="text-button" data-all-options>Show ${p.options.length-12} more options ${icon("chevron-down")}</button>`:''}</div></section>
    <section id="resources" class="resource-strip"><h2>See the equipment in context.</h2><div>${resourceLinks(p)}${link(productPath(id,context?.id,"explorer"),"Explore this system","text-link")}</div></section>
    <section class="section related"><div class="section-heading inline"><h2>Explore related equipment.</h2>${link("#/products","All equipment","text-link")}</div><div class="product-grid">${products.filter(x=>x.family===p.family&&x.id!==id).slice(0,3).map(item=>productCard(item,context?.id)).join("")}</div></section>${cta(id,context?.id)}</main>`,"products");
}
function solutionPage(id) {
  if (!id)
    return shell(
      `<main id="main" class="page-content">${crumb("Solutions")}<div class="page-heading"><h1>Start with your <br>packaging challenge.</h1><p>Different products ask different things of a packaging system. Choose an application to begin the conversation.</p></div><div class="solution-grid large">${solutions.map((s) => `<a class="solution-item" href="#/solutions/${s.id}"><div class="solution-image">${photo(product(s.products[0]))}</div><div><h2>${e(s.name)}${icon("arrow-up-right")}</h2><p>${e(s.summary)}</p></div></a>`).join("")}</div><div class="other-equipment"><h2>A different application?</h2><p>Tell us about your product. PAC works across industrial, medical, food, fulfillment and other packaging applications.</p>${link("#/inquiry", "Discuss your application", "button button-yellow")}</div></main>`,
      "solutions",
    );
  const s = solutions.find((s) => s.id === id);
  const guide = solutionGuides[id];
  if (!s) return notFound();
  return shell(
    `<main id="main" class="page-content">${crumb(s.name, ["solutions", "Solutions"])}<section class="solution-intro"><div><h1>${e(s.name)}</h1><p>${e(guide.lead)}</p><p>${e(s.body)}</p>${link(inquiryPath("", s.id), "Discuss your application", "button button-yellow")}</div><div class="solution-hero-image">${photo(product(s.products[0]), { lazy: false })}</div></section><section class="application-process"><h2>Follow the packaging process.</h2><ol>${guide.stages.map(([name,description])=>`<li><h3>${e(name)}</h3><p>${e(description)}</p></li>`).join("")}</ol></section><section class="application-choices"><h2>Choose a starting point.</h2>${guide.choices.map(([need,productId,why])=>`<article><h3>${e(need)}</h3><div><p>${e(why)}</p>${link(productPath(productId,s.id),e(product(productId).model),"text-link")}</div></article>`).join("")}<p class="small muted">These are discussion starting points, not an automatic equipment recommendation.</p>${link(guide.proof.url,e(guide.proof.title),"text-link",true)}</section><section class="product-section"><div><h2>The right questions <br>come first.</h2></div><ol class="questions">${s.questions.map((q) => `<li>${e(q)}</li>`).join("")}</ol></section><section class="section related"><h2>Equipment to explore.</h2><p class="muted">A starting point for discussion. PAC confirms the fit for your product and process.</p><div class="product-grid">${s.products.map((id) => productCard(product(id), s.id)).join("")}</div></section>${cta("", s.id)}</main>`,
    "solutions",
  );
}
function explorer(id, params) {
  const context = solutionContext(params.get("solution"));
  const p = product(id);
  if (!p) return notFound();
  const topics = explorerTopics(p);
  return shell(
    `<main id="main" class="page-content explorer-page">${crumb("Explorer", ["products/" + id, p.model])}<div class="explorer-heading"><div><h1>Explore ${e(p.model)}.</h1><p>Understand the equipment, then make the conversation specific.</p></div>${link(productPath(id, context?.id), "Back to product", "text-link")}</div><div class="explorer-layout"><section class="viewer-section"><div class="viewer-tabs" role="group" aria-label="View type"><button class="active" data-view="photo" aria-pressed="true">Product photographs</button><button data-view="3d" aria-pressed="false">3D reference</button></div><div class="photo-viewer" id="photo-viewer"><img id="explorer-photo" ${p.photos[0]?`src="${e(p.photos[0].url)}"`:"hidden"} alt="${e(p.name)}" width="${p.photos[0]?.width||600}" height="${p.photos[0]?.height||600}"><div class="photo-tools"><button class="icon-button" data-zoom="out" aria-label="Zoom out">${icon("minus")}</button><span id="zoom-value">100%</span><button class="icon-button" data-zoom="in" aria-label="Zoom in">${icon("plus")}</button><button class="text-button" data-zoom="reset">Reset</button></div></div><div id="reference-viewer" hidden><div class="reference-label"><strong>Reference assembly · Not PAC CAD</strong><span>This mechanism illustrates the exploration capability. It does not represent the ${e(p.model)}.</span></div><div class="iframe-stage"><iframe id="reference-frame" title="Interactive reference assembly" allow="fullscreen" loading="lazy"></iframe></div><div class="reference-controls"><label>Component<select id="reference-component" disabled><option>Loading reference…</option></select></label><button class="button button-small" id="reference-frame-button" disabled>Frame component</button><button class="button button-small" id="reference-capture" disabled>Capture view</button></div><button id="reference-retry" class="text-button" hidden>Retry connection</button><p id="reference-status" class="small" role="status">The reference loads when selected. Product photographs remain available.</p></div><p id="explorer-caption" class="small muted">${e(topics[0].note)}</p><div class="topic-selector" id="photo-topics"><label>Equipment or option view<select id="explorer-topic">${topics.map((t,i)=>`<option value="${i}">${e(t.name)}</option>`).join("")}</select></label><div class="topic-arrows"><button class="icon-button" data-topic-step="-1" aria-label="Previous equipment view">${icon("arrow-right").replace('class="icon"','class="icon previous-icon"')}</button><button class="icon-button" data-topic-step="1" aria-label="Next equipment view">${icon("arrow-right")}</button></div></div></section><aside class="explorer-notes"><h2 id="topic-title">Machine overview</h2><p id="topic-copy">${e(p.description)}</p><hr><h3>What would you like to understand?</h3><label for="explorer-question">Your application question</label><textarea id="explorer-question" rows="5" maxlength="2000" placeholder="For example: What clearance does this loading setup need?">${e(activeReference?.productId === id ? activeReference.note : "")}</textarea><div id="capture-preview"></div><button class="button button-yellow" data-save-reference>Add to my inquiry ${icon("arrow-right")}</button><p class="small muted">Keep this reference with your question. PAC can use your question to discuss the application.</p><div id="reference-saved" role="status"></div></aside></div></main>`,
    "products",
  );
}
function formField(
  name,
  label,
  {
    type = "text",
    required = false,
    value = draft[name] || "",
    placeholder = "",
    full = false,
    rows = 4,
  } = {},
) {
  return `<label class="field ${full ? "full" : ""}"><span>${label}${required ? ' <span aria-hidden="true">*</span>' : ""}</span>${type === "textarea" ? `<textarea name="${name}" aria-describedby="error-${name}" rows="${rows}" ${required ? "required" : ""} maxlength="${name === "application" ? 6000 : 2000}" placeholder="${e(placeholder)}">${e(value)}</textarea>` : `<input name="${name}" aria-describedby="error-${name}" type="${type}" value="${e(value)}" ${required ? "required" : ""} maxlength="${({ name: 150, company: 200, email: 254, phone: 80, bagDimensions: 200 })[name] || 320}" ${type === "number" ? 'min="1"' : ""} placeholder="${e(placeholder)}" autocomplete="${{ name: "name", email: "email", company: "organization", phone: "tel" }[name] || "off"}">`}<span id="error-${name}" class="field-error" data-error="${name}"></span></label>`;
}
function savedDraftLinks() {
  return archivedDrafts.length ? `<details class="saved-drafts"><summary>Saved drafts (${archivedDrafts.length}) ${icon("chevron-down")}</summary><ul>${archivedDrafts.map((item,i)=>`<li><div><strong>${e(product(item.fields.productId)?.model || "Application discussion")}</strong><p>${e((item.fields.application || "Equipment inquiry").slice(0,160))}</p></div><button type="button" class="text-button" data-restore-draft="${i}">Continue this draft</button></li>`).join("")}</ul></details>` : "";
}
function inquiryChoice(params) {
  const next = product(params.get("product")), current = product(draft.productId), context = solutionContext(params.get("solution"));
  return shell(`<main id="main" class="page-content inquiry-entry">${crumb("Request a quote")}<div class="page-heading"><h1>You have an inquiry in progress.</h1><p>Continue your existing draft or begin a separate inquiry${next?` for ${e(next.model)}`:context?` for ${e(context.name)}`:""}. Your saved details stay available in this browser tab.</p></div><div class="inquiry-choice-grid"><section><h2>Continue ${e(current?.model || "your application inquiry")}</h2><p>${e(draft.application ? draft.application.slice(0,320)+(draft.application.length>320?"…":"") : "Your equipment and contact details are saved.")}</p>${activeReference?`<p class="small muted">Saved reference: ${e(activeReference.title)}</p>`:""}<button class="button button-yellow" data-inquiry-choice="continue">Continue existing inquiry ${icon("arrow-right")}</button></section><section><h2>${next?`Start an inquiry for ${e(next.model)}`:context?`Discuss ${e(context.name)}`:"Start a separate inquiry"}</h2><p>Your existing draft will be kept in Saved drafts. The new inquiry starts with separate application and contact details.</p><button class="button button-dark" data-inquiry-choice="new">Start new inquiry ${icon("arrow-right")}</button></section></div>${savedDraftLinks()}</main>`);
}
function archiveCurrentInquiry() {
  archivedDrafts = archiveInquiryDraft(archivedDrafts, { fields: draft, reference: activeReference, requestId });
}
function inquiry(params) {
  if (inquiryEntryNeedsChoice(draft, params, activeReference)) return inquiryChoice(params);
  const before = JSON.stringify(draft);
  draft = prefillInquiry(draft, params, products);
  const productId = draft.productId || "";
  if (params.get("entry") !== "reference") pendingReference = null;
  if (pendingReference?.productId === productId) {
    if (activeReference) archiveCurrentInquiry();
    activeReference = pendingReference;
    pendingReference = null;
    requestId = crypto.randomUUID();
  }
  const referenceRemoved = Boolean(activeReference && !referenceForProduct(activeReference, productId));
  if (referenceRemoved) activeReference = null;
  if (referenceRemoved || JSON.stringify(draft) !== before) requestId = crypto.randomUUID();
  // Entry links prefill only once; subsequent edits and refreshes retain the draft.
  if (params.size) history.replaceState(null, "", `${location.pathname}${location.search}#/inquiry`);
  const stored = persist();
  const p = product(productId);
  return shell(
    `<main id="main" class="page-content">${crumb("Request a quote")}<div class="inquiry-layout"><aside><h1>Tell us what <br>you're packaging.</h1><p>A useful conversation starts with your product, your process and what you want to improve.</p>${p ? `<div class="inquiry-product">${photo(p)}<div><h2>${e(p.model)}</h2><a class="text-link" href="#equipment-choice" data-scroll="equipment-choice">Change equipment</a></div></div>` : '<p class="small muted">Not sure which machine you need? Describe your application and start there.</p>'}${referenceRemoved ? '<p class="small reference-notice" role="status">Your previous product reference was removed because the equipment changed.</p>' : ""}<div class="inquiry-help"><h2>Prefer to talk?</h2><a href="tel:18009859570">1-800-985-9570</a><a href="mailto:sales@pacmachinery.com">sales@pacmachinery.com</a></div>${activeReference ? `<details class="saved-reference reference-disclosure"><summary>Saved reference · ${e(activeReference.title)} ${icon("chevron-down")}</summary><div><strong>${e(activeReference.title)}</strong><p class="saved-reference-source">${e(activeReference.source || "Product reference")}</p><p>${e(activeReference.note || "A product view to discuss.")}</p>${activeReference.preview ? `<img src="${e(activeReference.preview)}" alt="Saved reference view">` : ""}<button class="text-button" data-remove-reference>Remove reference</button></div></details>` : ""}</aside><form id="inquiry-form" class="inquiry-form" novalidate>${savedDraftLinks()}<p class="inquiry-progress">1. Your details <span>2. Review &amp; save</span></p><p id="draft-status" class="small muted" role="status">${stored?"Your draft is kept in this browser tab.":"Browser storage is unavailable. Keep this page open to retain your draft."}</p><h2>Your application</h2><div class="form-grid"><label id="equipment-choice" class="field full"><span>Equipment of interest</span><select name="productId">${inquirySelectOptions([{ value: "", label: "Help me choose the right equipment" }, ...products.map((item) => ({ value: item.id, label: item.name }))], productId)}</select></label>${formField("application", "What are you packaging?", { type: "textarea", required: true, full: true, placeholder: "Describe the product, your current process and what needs to improve." })}${formField("bagDimensions", "Bag dimensions", { placeholder: "Width × length, including units" })}${formField("targetThroughput", "Target bags per minute", { type: "number", placeholder: "For example, 25" })}<label class="field full"><span>How will products be loaded?</span><select name="loadingMethod">${inquirySelectOptions([{ value: "", label: "To be discussed" }, ...loadingMethods.map((value) => ({ value, label: value }))], draft.loadingMethod || "")}</select></label></div><h2>Your details</h2><div class="form-grid">${formField("name", "Full name", { required: true })}${formField("company", "Company", { required: true })}${formField("email", "Work email", { type: "email", required: true })}${formField("phone", "Phone", { type: "tel" })}${formField("message", "Anything else we should know?", { type: "textarea", full: true, placeholder: "Materials, special requirements, drawings or a question about the equipment." })}</div><p class="small">This demonstration saves your inquiry for review. It does not email PAC. For an active project, <a href="mailto:sales@pacmachinery.com">contact PAC directly</a>.</p><p id="form-error" class="form-error" role="alert" hidden></p><div class="form-submit"><button class="button button-yellow" type="submit">Review inquiry ${icon("arrow-right")}</button><span class="small muted">Required fields are marked *</span></div><p class="small muted">Review your details before saving them to this demonstration. <a href="#/privacy">Privacy information</a></p></form></div></main>`,
  );
}
function inquirySummary(snapshot, { editable = false } = {}) {
  const p = product(snapshot.productId);
  const ref = snapshot.reference;
  const rows = (items) => items.filter(([, value]) => value).map(([label, value]) => `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join("");
  const edit = editable ? '<a class="text-link" href="#/inquiry">Edit details</a>' : "";
  return `<div class="inquiry-summary">
    <section class="inquiry-summary-section"><div class="summary-heading"><h2>Equipment &amp; application</h2>${edit}</div>
      ${p ? `<div class="summary-equipment">${photo(p)}<div><h3>${e(p.name)}</h3><p class="small muted">${e(p.photoNote)}</p></div></div>` : '<p class="muted">Help me choose the right equipment.</p>'}
      <dl>${rows([["Application", snapshot.application], ["Bag dimensions", snapshot.bagDimensions], ["Target output", snapshot.targetThroughput ? `${snapshot.targetThroughput} bags per minute` : ""], ["Loading method", snapshot.loadingMethod || "To be discussed"], ["Additional details", snapshot.message]])}</dl>
    </section>
    <section class="inquiry-summary-section"><div class="summary-heading"><h2>Your details</h2>${edit}</div><dl>${rows([["Name", snapshot.name], ["Company", snapshot.company], ["Email", snapshot.email], ["Phone", snapshot.phone]])}</dl></section>
    ${ref ? `<section class="inquiry-summary-section"><div class="summary-heading"><h2>Explorer reference</h2>${edit}</div><div class="summary-reference">${ref.preview || ref.inspection?.preview?.dataUrl ? `<img src="${e(ref.preview || ref.inspection.preview.dataUrl)}" alt="Saved Explorer reference">` : ""}<div><h3>${e(ref.title || "Saved view")}</h3><p class="small muted">${e(ref.source || "Product reference")}</p><p>${e(ref.note || "A product view to discuss.")}</p></div></div></section>` : ""}
  </div>`;
}
function reviewInquiry() {
  const snapshot = inquirySnapshot(draft, activeReference);
  const errors = validateInquiry(snapshot);
  if (Object.keys(errors).length) return shell(`<main id="main" class="page-content"><section class="confirmation"><h1>Finish your inquiry.</h1><p>Add your application and contact details before reviewing the inquiry.</p>${link("#/inquiry", "Return to your draft", "button button-yellow")}</section></main>`);
  return shell(`<main id="main" class="page-content inquiry-review">${crumb("Review inquiry")}<div class="review-intro"><p class="inquiry-progress"><a href="#/inquiry">1. Your details</a><span aria-current="step">2. Review &amp; save</span></p><h1>Ready for a useful <br>conversation.</h1><p>Check the equipment, application and contact details you want to keep together.</p></div><div class="inquiry-review-layout">${inquirySummary(snapshot, { editable: true })}<aside class="inquiry-save-panel"><h2>Save your inquiry</h2><p>Your details will be stored in this demonstration. Email delivery to PAC is not connected.</p><form id="inquiry-review-form"><p id="form-error" class="form-error" role="alert" hidden></p><button type="submit" class="button button-yellow">Save inquiry ${icon("arrow-right")}</button></form><a class="text-link" href="#/inquiry">Back to editing</a><p class="small muted">For an active project, contact <a href="mailto:sales@pacmachinery.com">sales@pacmachinery.com</a>.</p></aside></div></main>`);
}
function confirmation() {
  return shell(`<main id="main" class="page-content"><section class="confirmation inquiry-receipt"><div class="confirmation-mark">${icon("check")}</div><h1>${receipt ? "Your inquiry is saved." : "Your inquiry confirmation."}</h1><p>${receipt ? "Your product and application details have been received in this demonstration. Nothing has been emailed to PAC." : "A saved inquiry confirmation will appear here after you save your inquiry."}</p>${receipt ? `<dl class="receipt-meta"><div><dt>Reference</dt><dd>${e(receipt.reference || receipt.id)}</dd></div><div><dt>Status</dt><dd>Stored · Email delivery not connected</dd></div></dl>${submitted ? `${inquirySummary(submitted)}<button class="text-link download-inquiry" data-download-inquiry>Download inquiry summary ${icon("download")}</button>` : '<p class="small muted">The detailed snapshot is unavailable for this earlier inquiry. Its receipt is retained above.</p>'}` : ""}<div class="actions">${link("#/products", "Continue exploring", "button button-dark")}<button class="text-button" data-new-inquiry>Start a new inquiry ${icon("arrow-right")}</button></div><p class="small muted">For a live equipment request, contact <a href="mailto:sales@pacmachinery.com">sales@pacmachinery.com</a>.</p></section></main>`);
}
function resources(params = new URLSearchParams()) {
  const selected = product(params.get("product"));
  const items = selected ? [selected] : products;
  return shell(`<main id="main" class="page-content resources-page">${crumb("Resources")}<div class="page-heading"><h1>Resources for your equipment.</h1><p>Open the official PAC material for the model or process you are considering. Current models and the supplied catalog configuration can differ.</p></div><form id="resource-filter" class="catalog-tools"><label class="filter-label">Equipment<select name="product"><option value="">All equipment</option>${products.map(p=>`<option value="${p.id}" ${selected?.id===p.id?"selected":""}>${e(p.model)}</option>`).join("")}</select></label><button type="submit" class="button button-dark">Show resources</button></form><div class="resource-directory">${items.map(p=>`<article><div class="resource-equipment">${photo(p)}<div><h2>${e(p.model)}</h2><p>${e(p.fit)}</p><a class="text-link" href="${e(productPath(p.id))}">Product details ${icon("arrow-right")}</a></div></div><div>${resourceLinks(p)}</div></article>`).join("")}</div><section class="resource-strip"><h2>Explore the full PAC library.</h2><div>${link(official.videos,"All equipment videos","text-link",true)}${link(official.brochures,"All brochures","text-link",true)}</div></section></main>`,"resources");
}
function support(contact = false) {
  if (contact) return shell(`<main id="main" class="page-content contact-page">${crumb("Contact")}<div class="page-heading"><h1>Let’s talk packaging.</h1><p>Choose the right conversation for your project or equipment.</p></div><div class="contact-routes"><section><h2>Plan a new packaging project.</h2><p>Share your product, packaging material and the process you want to improve.</p>${link("#/inquiry?entry=global","Prepare an inquiry","button button-yellow")}<p class="small muted">The demonstration saves your inquiry for review. It does not email PAC.</p></section><section><h2>Contact PAC directly.</h2><a class="contact-value" href="tel:18009859570">1-800-985-9570</a><a class="text-link" href="mailto:sales@pacmachinery.com">sales@pacmachinery.com ${icon("arrow-up-right")}</a><p>For live sales questions, use PAC's phone, email or official contact page.</p>${link(sources.contact,"PAC contact information","text-link",true)}</section></div><section class="contact-service"><div><h2>Already have equipment?</h2><p>Find technical support, parts and training for the machine you operate.</p></div>${link("#/support","Go to equipment support","text-link")}</section></main>`,"contact");
  return shell(`<main id="main" class="page-content support-page">${crumb("Support")}<div class="page-heading"><h1>Keep your equipment working.</h1><p>Get help with a machine issue, replacement parts or training. Start with the equipment you operate.</p></div><section class="support-primary"><div><h2>Technical support</h2><p>Use PAC's official support request form to describe the issue and provide your model and serial number.</p>${link(sources.support,"Open PAC support request","button button-yellow",true)}<a class="text-link" href="mailto:support@pacmachinery.com">support@pacmachinery.com ${icon("arrow-up-right")}</a><p class="small muted">Opens PAC's live service. No support ticket is created in this demonstration.</p></div><div><h2>Have these details ready.</h2><ul class="support-checklist"><li>Machine model and serial number</li><li>What happens, and when it started</li><li>Product, bag material and relevant settings</li><li>Photos or supporting documentation</li></ul></div></section><div class="support-secondary"><section><h2>Parts and service</h2><p>Identify the machine and the part or issue before contacting PAC. Its support team can advise on the next service step.</p>${link(sources.support,"Discuss parts or service","text-link",true)}</section><section><h2>Start-up and training</h2><p>PAC offers on-site start-up, training and retraining. Discuss availability and the service appropriate for your equipment.</p>${link(sources.support,"Explore training and support","text-link",true)}</section></div><section class="contact-service"><div><h2>Choosing new equipment?</h2><p>Start with your product and packaging application.</p></div>${link("#/contact","Talk about a new project","text-link")}</section></main>`,"support");
}
function about() {
  return shell(`<main id="main" class="page-content about-page">${crumb("About")}<section class="about-intro"><h1>More experience. <br>Better choices.</h1><p>PAC Machinery brings more than 60 years of packaging experience to equipment, materials and application support.</p><p>Its portfolio includes automatic baggers, flow wrappers, shrink wrappers, vacuum and heat sealers, medical packaging equipment, and bags and materials.</p>${link(sources.about,"Read PAC's company story","text-link",true)}</section><div class="about-equipment">${photo(product("r3200"))}${photo(product("r3200_hs_hybrid"))}${photo(product("r1285_med"))}</div><section class="experience-section"><h2>See the process before you choose.</h2><div class="experience-list"><article><h3>Review equipment and materials together</h3><p>PAC supplies packaging equipment and materials. Discuss the product, bag and loading process as a complete application.</p>${link(sources.about,"Explore PAC's capabilities","text-link",true)}</article><article><h3>Arrange an equipment demonstration</h3><p>PAC's LiveDemo service supports remote product demonstrations, with questions and adjustments discussed in real time.</p>${link(sources.support,"Learn about live demonstrations","text-link",true)}</article><article><h3>Plan for operation</h3><p>Technical support, on-site start-up and operator retraining are available through PAC. Confirm the service scope for your installation.</p>${link("#/support","Explore equipment support","text-link")}</article></div></section>${cta()}</main>`,"about");
}
function privacy() {
  return shell(
    `<main id="main" class="page-content"><article class="prose">${crumb("Privacy")}<h1>About this demonstration.</h1><p>This is a demonstration of a proposed PAC Machinery website experience.</p><h2>Inquiry information</h2><p>When you submit an inquiry, the application stores your name, company, contact details, requirements and any saved reference on the demonstration server. The inquiry is not emailed to PAC and does not create a sales deal.</p><p>Use illustrative information while evaluating the demonstration. Do not include confidential technical or personal information.</p><h2>Your browser</h2><p>Your unfinished inquiry is retained in this browser tab so you can return to it. Starting a separate inquiry keeps your previous draft under Saved drafts in this browser tab. Product exploration does not require a Sales Workspace account.</p><h2>PAC's live website</h2><p>Links to PAC's existing site open a separate website governed by its own privacy information.</p>${link(official.privacy, "Read PAC’s privacy policy", "text-link", true)}</article></main>`,
  );
}
function notFound() {
  return shell(
    `<main id="main" class="page-content"><section class="empty-state"><h1>We couldn't find that page.</h1><p>The equipment or link may have changed. Explore the product collection or return home.</p><div class="actions">${link("#/products", "Explore equipment", "button button-yellow")}${link("#/", "Back to home", "text-link")}</div></section></main>`,
  );
}
function render(focusPage = false) {
  if (loadFailure) { showLoadFailure(loadFailure); return; }
  cleanup?.();
  cleanup = null;
  const { parts, params } = routeFromHash(location.hash);
  const [view, id] = parts;
  root.innerHTML = !view
    ? home()
    : view === "products"
      ? id
        ? detail(id, params)
        : listing(params)
      : view === "solutions"
        ? solutionPage(id)
        : view === "explorer"
          ? explorer(id, params)
          : view === "inquiry"
            ? id === "review" ? reviewInquiry() : inquiry(params)
            : view === "confirmation"
              ? confirmation()
              : view === "resources"
                ? resources(params)
                : view === "support"
                  ? support()
                  : view === "contact"
                    ? support(true)
                    : view === "about"
                      ? about()
                      : view === "privacy"
                        ? privacy()
                        : notFound();
  document.title = `${document.querySelector("main h1")?.innerText.replace(/\s+/g, " ").trim() || "Packaging equipment"} | PAC Machinery`;
  bind(view, id, params);
  window.scrollTo({ top: 0, behavior: "instant" });
  document.getElementById("site-announcement").textContent = document.title;
  if (focusPage) {
    const heading = document.querySelector("main h1");
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }
}
function bind(view, id, params) {
  document.querySelectorAll(".detail-image > img, .product-photo > img, .photo-viewer > img").forEach(image => image.addEventListener("error", () => {
    image.hidden = true;
    const parent = image.parentElement;
    parent.classList.add("media-unavailable");
    if (!parent.querySelector(".image-error")) {
      const note = document.createElement("p"); note.className = "image-error";
      note.textContent = "This photograph is unavailable. Product details and inquiry remain available.";
      parent.append(note);
    }
  }));
  document.querySelector(".reference-disclosure")?.toggleAttribute("open", !matchMedia("(max-width: 900px)").matches);
  document.querySelectorAll("[data-inquiry-choice]").forEach(button => button.addEventListener("click", () => {
    if (button.dataset.inquiryChoice === "new") {
      archiveCurrentInquiry(); draft = {}; activeReference = null; requestId = crypto.randomUUID();
      const seed = new URLSearchParams(params); if (seed.get("entry") !== "reference") seed.delete("entry"); seed.delete("choice");
      persist(); location.hash = `/inquiry${seed.size?`?${seed}`:""}`;
    } else {
      pendingReference = null; persist(); location.hash = "/inquiry";
    }
  }));
  document.querySelectorAll("[data-restore-draft]").forEach(button => button.addEventListener("click", () => {
    const saved = archivedDrafts[Number(button.dataset.restoreDraft)];
    if (!saved) return;
    archiveCurrentInquiry();
    archivedDrafts = archivedDrafts.filter(item => item.requestId !== saved.requestId);
    draft = structuredClone(saved.fields); activeReference = structuredClone(saved.reference); requestId = saved.requestId;
    pendingReference = null; persist();
    if (location.hash === "#/inquiry") render(true); else location.hash = "/inquiry";
  }));
  document
    .querySelector("[data-all-options]")
    ?.addEventListener("click", (event) => {
      document
        .querySelectorAll("[data-extra-option]")
        .forEach((item) => (item.hidden = false));
      const first = document.querySelector("[data-extra-option] summary");
      event.currentTarget.remove();
      first?.focus();
    });
  document.querySelector("[data-menu]")?.addEventListener("click", (ev) => {
    const button = ev.currentTarget,
      open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation",
    );
    document.getElementById("main-nav").classList.toggle("open", open);
  });
  document.getElementById("main-nav")?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.getElementById("main-nav").classList.remove("open");
      const toggle = document.querySelector("[data-menu]"); toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-label", "Open navigation"); toggle.focus();
    }
  });
  document.querySelectorAll("[data-scroll]").forEach((a) =>
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      const target = document.getElementById(a.dataset.scroll);
      const focusTarget = target?.querySelector("input,select,textarea") || target;
      if (focusTarget) { if (!focusTarget.matches("input,select,textarea")) focusTarget.tabIndex = -1; focusTarget.focus({ preventScroll: true }); }
      target?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
    }),
  );
  const resourceFilter = document.getElementById("resource-filter");
  resourceFilter?.addEventListener("submit", (event) => {
    event.preventDefault();
    const params = new URLSearchParams(new FormData(resourceFilter));
    location.hash = `/resources?${params}`;
  });
  resourceFilter?.querySelector("select").addEventListener("change", () => resourceFilter.requestSubmit());
  const filter = document.getElementById("catalog-filter");
  filter?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = new FormData(filter);
    location.hash = "/products?" + new URLSearchParams([...f]).toString();
  });
  filter
    ?.querySelector("select")
    .addEventListener("change", () => filter.requestSubmit());
  document.querySelectorAll("[data-photo]").forEach((b) =>
    b.addEventListener("click", () => {
      document.getElementById("detail-photo").src = b.dataset.photo;
      document.querySelectorAll("[data-photo]").forEach((x) => {
        x.classList.toggle("selected", x === b);
        x.setAttribute("aria-pressed", String(x === b));
      });
    }),
  );
  document.querySelector("[data-enlarge]")?.addEventListener("click", () => {
    const dialog = document.createElement("dialog");
    dialog.className = "photo-dialog";
    dialog.innerHTML = `<form method="dialog"><button class="icon-button" aria-label="Close enlarged photo">${icon("x")}</button></form><img src="${e(document.getElementById("detail-photo").src)}" alt="${e(product(id).name)}">`;
    document.body.append(dialog);
    dialog.showModal();
    dialog.addEventListener("close", () => dialog.remove());
    dialog.addEventListener("click", (ev) => {
      if (ev.target === dialog) dialog.close();
    });
  });
  if (!view && product("r3200")) cleanup = mountHomeExplorer({
    product: product("r3200"),
    onContinue: (reference) => {
      pendingReference = reference;
      persist();
      location.hash = `/inquiry?product=${reference.productId}&entry=reference`;
    },
  });
  if (!view) {
    const disposeExplorer = cleanup;
    const disposeVideo = mountHomeVideo();
    cleanup = () => {
      disposeExplorer?.();
      disposeVideo();
    };
  }
  if (view === "explorer" && product(id)) bindExplorer(product(id), params);
  const form = document.getElementById("inquiry-form");
  if (form) {
    const keepDraft = () => {
      const next = Object.fromEntries(new FormData(form));
      if (next.productId !== draft.productId && hasInquiryDraft(draft, activeReference)) archiveCurrentInquiry();
      if (JSON.stringify(next) !== JSON.stringify(draft)) requestId = crypto.randomUUID();
      draft = next;
      const stored = persist();
      document.getElementById("draft-status").textContent = stored
        ? "Draft saved in this browser tab."
        : "Your draft is available while this page stays open. Browser storage is unavailable; keep this tab open.";
    };
    form.addEventListener("input", keepDraft);
    form.addEventListener("change", (event) => {
      keepDraft();
      if (event.target.name === "productId") {
        render();
        document.querySelector('[name="productId"]')?.focus();
      }
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      keepDraft();
      const errors = validateInquiry(draft);
      form.querySelectorAll("[data-error]").forEach((node) => {
        node.textContent = errors[node.dataset.error] || "";
        form.elements[node.dataset.error]?.setAttribute("aria-invalid", String(Boolean(errors[node.dataset.error])));
      });
      const first = Object.keys(errors)[0];
      if (first) { form.elements[first]?.focus(); return; }
      location.hash = "/inquiry/review";
    });
  }
  document.getElementById("inquiry-review-form")?.addEventListener("submit", submitInquiry);
  document.querySelector("[data-download-inquiry]")?.addEventListener("click", () => {
    if (!receipt || !submitted) return;
    const url = URL.createObjectURL(new Blob([inquiryReceiptText(receipt, submitted, product(submitted.productId)?.name)], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${String(receipt.reference || receipt.id).replace(/[^a-zA-Z0-9_-]/g, "-")}.txt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document
    .querySelector("[data-remove-reference]")
    ?.addEventListener("click", () => {
      activeReference = null;
      requestId = crypto.randomUUID();
      persist();
      render();
    });
  document
    .querySelector("[data-new-inquiry]")
    ?.addEventListener("click", () => {
      archiveCurrentInquiry();
      draft = {};
      pendingReference = null;
      receipt = null;
      submitted = null;
      activeReference = null;
      requestId = crypto.randomUUID();
      persist();
      location.hash = "/inquiry";
    });
}
function bindExplorer(p, params) {
  const topics = explorerTopics(p);
  let topic = topics[0],
    zoom = 1,
    captured = null,
    mode = "photo",
    referenceCleanup = null;
  function selectTopic(index) {
    topic = topics[index];
    const photo = document.getElementById("explorer-photo");
    if (topic.photo) photo.src = topic.photo.url; else photo.removeAttribute("src");
    photo.alt = topic.name;
    photo.hidden = !topic.photo;
    photo.parentElement.classList.remove("media-unavailable");
    photo.parentElement.querySelector(".image-error")?.remove();
    document.getElementById("topic-title").textContent = topic.name;
    document.getElementById("topic-copy").textContent = topic.description;
    document.getElementById("explorer-caption").textContent = topic.note;
    document.getElementById("explorer-topic").value = String(index);
    document.querySelector('[data-topic-step="-1"]').disabled = index === 0;
    document.querySelector('[data-topic-step="1"]').disabled = index === topics.length - 1;
    zoom = 1; photo.style.transform = "scale(1)";
    document.getElementById("zoom-value").textContent = "100%";
  }
  document.getElementById("explorer-topic").addEventListener("change", event => selectTopic(Number(event.target.value)));
  document.querySelectorAll("[data-topic-step]").forEach(button => button.addEventListener("click", () => {
    const index = topics.indexOf(topic) + Number(button.dataset.topicStep);
    if (index >= 0 && index < topics.length) selectTopic(index);
  }));
  selectTopic(0);
  document.querySelectorAll("[data-zoom]").forEach((b) =>
    b.addEventListener("click", () => {
      zoom =
        b.dataset.zoom === "reset"
          ? 1
          : Math.max(
              1,
              Math.min(2.5, zoom + (b.dataset.zoom === "in" ? 0.25 : -0.25)),
            );
      document.getElementById("explorer-photo").style.transform =
        `scale(${zoom})`;
      document.getElementById("zoom-value").textContent =
        Math.round(zoom * 100) + "%";
    }),
  );
  document.querySelectorAll("[data-view]").forEach((b) =>
    b.addEventListener("click", () => {
      mode = b.dataset.view;
      document.getElementById("photo-viewer").hidden = mode !== "photo";
      document.getElementById("reference-viewer").hidden = mode !== "3d";
      document.getElementById("photo-topics").hidden = mode !== "photo";
      document.getElementById("explorer-caption").hidden = mode !== "photo";
      document.querySelectorAll("[data-view]").forEach((x) => {
        x.classList.toggle("active", x === b);
        x.setAttribute("aria-pressed", String(x === b));
      });
      if (mode === "3d" && !referenceCleanup)
        referenceCleanup = mountReferenceExplorer({
          onCapture: (item) => {
            captured = item;
            document.getElementById("capture-preview").innerHTML =
              `${item.preview ? `<img src="${e(item.preview)}" alt="Captured reference view">` : ""}<p class="small">Captured ${e(item.title)} · reference assembly</p>`;
          },
        });
    }),
  );
  document
    .querySelector("[data-save-reference]")
    .addEventListener("click", () => {
      const note = document.getElementById("explorer-question").value.trim();
      if (mode === "3d" && !captured) {
        document.getElementById("reference-saved").textContent =
          "Capture a reference view before adding it to your inquiry.";
        return;
      }
      pendingReference = {
        productId: p.id,
        title: mode === "3d" ? captured.title : topic.name,
        note,
        source: mode === "3d" ? "Reference assembly — not PAC CAD" : topic.note,
        preview: mode === "3d" ? captured.preview : topic.photo?.url,
        ...(mode === "3d"
          ? { inspection: captured.inspection }
          : { photo: topic.photo?.url }),
      };
      persist();
      location.hash = `${inquiryPath(p.id, params.get("solution")).slice(1)}&entry=reference`;
    });
  cleanup = () => referenceCleanup?.();
}
async function submitInquiry(ev) {
  ev.preventDefault();
  const form = ev.currentTarget;
  if (form.dataset.submitting === "true") return;
  const snapshot = inquirySnapshot(draft, activeReference);
  if (Object.keys(validateInquiry(snapshot)).length) {
    location.hash = "/inquiry";
    return;
  }
  const submissionId = requestId;
  const button = form.querySelector('[type="submit"]'),
    message = document.getElementById("form-error");
  form.dataset.submitting = "true";
  const controls = [...form.elements];
  controls.forEach((input) => (input.disabled = true));
  button.textContent = "Saving inquiry…";
  message.hidden = true;
  persist();
  try {
    const response = await fetch("/pac-machinery-demo/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: submissionId, ...snapshot }),
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(
        "The inquiry service is unavailable. Your details are retained; please try again.",
      );
    }
    if (!response.ok)
      throw new Error(
        data.error?.message ||
          data.message ||
          "The inquiry could not be saved. Please try again.",
      );
    receipt = data;
    submitted = snapshot;
    persist();
    location.hash = "/confirmation";
  } catch (error) {
    message.textContent = error.message;
    message.hidden = false;
    form.dataset.submitting = "false";
    controls.forEach((input) => (input.disabled = false));
    button.innerHTML = `Try again ${icon("arrow-right")}`;
  }
}
function showLoadFailure(error) {
  root.innerHTML = shell(`<main id="main" class="page-content"><section class="empty-state"><h1>Equipment information is unavailable.</h1><p>We could not load the equipment catalog. Reload to try again; your inquiry draft is retained in this browser tab.</p><div class="actions"><button class="button button-yellow" data-reload>Reload equipment</button>${link(sources.contact,"Contact PAC directly","text-link",true)}</div></section></main>`);
  document.querySelector("[data-reload]").addEventListener("click", () => location.reload());
  document.querySelector("[data-menu]").hidden = true;
  document.title = "Equipment unavailable | PAC Machinery";
  document.getElementById("site-announcement").textContent = document.title;
}
document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  const main = document.getElementById("main");
  main.tabIndex = -1;
  main.focus();
  main.scrollIntoView();
});
window.addEventListener("hashchange", () => render(true));
try {
  const response = await fetch(
    new URL("./data/products.json", import.meta.url),
  );
  if (!response.ok)
    throw new Error("Equipment information could not be loaded.");
  const data = await response.json();
  if (!Array.isArray(data.products) || !data.products.length || data.products.some(p => !p.id || !Array.isArray(p.photos) || !Array.isArray(p.options) || !Array.isArray(p.specs) || !Array.isArray(p.benefits))) throw new Error("The catalog is incomplete.");
  products = enrichProducts(data.products);
  render();
 } catch (error) {
  loadFailure = error;
  showLoadFailure(error);
}
