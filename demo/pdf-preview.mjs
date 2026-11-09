/** Actual PDF canvas preview for browsers without an embedded PDF viewer.
 * Uses the identical bytes supplied to the download. No quotation HTML substitute.
 * API follows Mozilla PDF.js examples: https://mozilla.github.io/pdf.js/examples/
 */
import {getDocument, GlobalWorkerOptions} from './vendor/pdfjs/pdf.min.mjs';

GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
const fontURL = new URL('./vendor/pdfjs/standard_fonts/', import.meta.url).href;
const active = new WeakMap();
const styleId = 'pac-actual-pdf-preview-styles';
function styles() {
  if (document.getElementById(styleId)) return;
  const sheet = document.createElement('style'); sheet.id = styleId;
  sheet.textContent = `
  .pac-pdf-preview{color:#20272d;font:13px/1.45 Inter,system-ui,sans-serif;background:#eef1f3}
  .pac-pdf-preview-nav{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-bottom:1px solid #dce1e5;background:#f7f8f9}
  .pac-pdf-preview-nav [role=tablist]{display:flex;gap:5px}
  .pac-pdf-preview-nav button{border:1px solid transparent;border-radius:2px;background:transparent;color:#626c75;padding:7px 12px;font:inherit;cursor:pointer}
  .pac-pdf-preview-nav button[aria-selected=true]{background:#fff;border-color:#c4ced7;color:#2360a4}
  .pac-pdf-preview-nav button:focus-visible,.pac-pdf-accessible summary:focus-visible{outline:2px solid #2360a4;outline-offset:2px}
  .pac-pdf-page-count{font-size:11px;color:#626c75;white-space:nowrap}
  .pac-pdf-preview-scroll{max-height:480px;overflow:auto;padding:16px;overscroll-behavior:contain}
  .pac-pdf-sheet{margin:0 auto;max-width:700px;background:#fff;border:1px solid #dce1e5}
  .pac-pdf-sheet[hidden]{display:none}
  .pac-pdf-sheet canvas{display:block;width:100%;height:auto;background:#fff}
  .pac-pdf-accessible{border-top:1px solid #dce1e5;font-size:12px;background:#f7f8f9}
  .pac-pdf-accessible summary{padding:12px 15px;cursor:pointer;color:#4d606e}
  .pac-pdf-accessible pre{white-space:pre-wrap;padding:0 15px 16px;margin:0;font:12px/1.6 Inter,system-ui,sans-serif;color:#26343e}
  @media(max-width:600px){.pac-pdf-preview-scroll{padding:8px;max-height:420px}.pac-pdf-preview-nav{padding:8px}.pac-pdf-preview-nav button{padding:6px 8px}.pac-pdf-page-count{font-size:10px}}
  `;
  document.head.append(sheet);
}
function textFrom(content) {
  let text = '';
  for (const item of content.items) {
    if (!('str' in item)) continue;
    text += item.str;
    text += item.hasEOL ? '\n' : ' ';
  }
  return text.trim();
}

/** Resolves only after all pages have rendered to real canvases and text is extracted. */
export async function renderPdfPreview(container, bytes, {version} = {}) {
  if (!(container instanceof Element)) throw Error('Choose a PDF preview container.');
  if (!(bytes instanceof Uint8Array) && !(bytes instanceof ArrayBuffer)) throw Error('PDF bytes are not ready.');
  const previous = active.get(container);
  if (previous) {
    previous.cancelled = true;
    previous.renders.forEach(task => task.cancel());
    await previous.loading.destroy().catch(() => {});
  }
  styles();
  // PDF.js transfers its input buffer to the worker; protect the download bytes.
  const data = bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes.slice(0));
  const loading = getDocument({data, standardFontDataUrl:fontURL, useSystemFonts:false, isEvalSupported:false});
  const job = {loading, cancelled:false, renders:[]}; active.set(container,job);
  const current = () => {
    if (job.cancelled || active.get(container) !== job) throw new DOMException('The PDF preview was replaced.', 'AbortError');
  };
  const shell = document.createElement('section'); shell.className = 'pac-pdf-preview';
  shell.setAttribute('aria-label', `Actual Quote V${version ?? ''} PDF preview`);
  const nav = document.createElement('div'); nav.className = 'pac-pdf-preview-nav';
  const tabs = document.createElement('div'); tabs.setAttribute('role','tablist'); tabs.setAttribute('aria-label','Quote document pages');
  const counter = document.createElement('span'); counter.className = 'pac-pdf-page-count';
  nav.append(tabs,counter);
  const scroll = document.createElement('div'); scroll.className = 'pac-pdf-preview-scroll';
  const accessible = document.createElement('details'); accessible.className = 'pac-pdf-accessible';
  const summary = document.createElement('summary'); summary.textContent = 'Read the PDF text';
  const transcript = document.createElement('pre');
  accessible.append(summary,transcript);shell.append(nav,scroll,accessible);
  container.replaceChildren(shell);container.setAttribute('aria-busy','true');
  try {
    const pdf = await loading.promise;current();
    const pages = [], buttons = [], extracted = [];
    const choose = index => {
      pages.forEach((page,i) => {page.hidden = i !== index;});
      buttons.forEach((button,i) => {button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;});
      counter.textContent = `Page ${index+1} of ${pdf.numPages}`;
      transcript.textContent = extracted[index] || 'Reading this PDF page…';
      scroll.scrollTop = 0;
    };
    for (let pageNumber=1; pageNumber<=pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);current();
      const index = pageNumber-1;
      const base = page.getViewport({scale:1});
      // The runner prepares its iframe while hidden. Render at full resolution
      // in that case; CSS can safely reduce the finished canvas on small screens.
      const measuredWidth = container.clientWidth;
      const targetWidth = Math.min(700, Math.max(350, measuredWidth > 300 ? measuredWidth-34 : 700));
      const viewport = page.getViewport({scale:targetWidth/base.width});
      const outputScale = Math.min(2, window.devicePixelRatio || 1);
      const figure = document.createElement('figure');figure.className='pac-pdf-sheet';figure.hidden=index!==0;
      const panelId=`pac-pdf-v${version??'current'}-page-${pageNumber}`;
      figure.id=panelId;figure.setAttribute('role','tabpanel');
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width*outputScale);canvas.height=Math.ceil(viewport.height*outputScale);
      canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Quote V${version??''}, page ${pageNumber} of ${pdf.numPages}. Use Read the PDF text for the document contents.`);
      figure.append(canvas);scroll.append(figure);pages.push(figure);
      const button = document.createElement('button');button.type='button';button.setAttribute('role','tab');button.setAttribute('aria-controls',panelId);
      button.textContent=pdf.numPages===2?`Option ${index===0?'A':'B'}`:`Page ${pageNumber}`;
      button.addEventListener('click',()=>choose(index));
      button.addEventListener('keydown',event=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;event.preventDefault();event.stopPropagation();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;choose(next);buttons[next].focus();});
      tabs.append(button);buttons.push(button);
      const renderTask = page.render({canvas,canvasContext:canvas.getContext('2d'),viewport,transform:outputScale===1?null:[outputScale,0,0,outputScale,0,0],background:'#ffffff'});
      job.renders.push(renderTask);await renderTask.promise;current();
      extracted.push(textFrom(await page.getTextContent()));current();
      if(index===0)choose(0);
    }
    choose(0);container.setAttribute('aria-busy','false');container.dataset.pdfReady='true';container.dataset.pdfVersion=String(version??'');
    return {pageCount:pdf.numPages,version,document:pdf,destroy:async()=>{job.cancelled=true;active.delete(container);await loading.destroy();}};
  } catch (error) {
    if (active.get(container)===job) {container.setAttribute('aria-busy','false');container.dataset.pdfReady='false';}
    job.renders.forEach(task=>task.cancel());await loading.destroy().catch(()=>{});
    throw error;
  }
}
