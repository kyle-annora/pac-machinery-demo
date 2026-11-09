/** Actual PDF canvas preview for browsers without an embedded PDF viewer.
 * Uses the identical bytes supplied to the download. No quotation HTML substitute.
 * API follows Mozilla PDF.js examples: https://mozilla.github.io/pdf.js/examples/
 * Scoped text-layer CSS adapts Mozilla PDF.js text_layer_builder.css (2014
 * Mozilla Foundation), Apache-2.0: https://www.apache.org/licenses/LICENSE-2.0
 * https://github.com/mozilla/pdf.js/blob/v6.5.438/web/text_layer_builder.css
 */
import {getDocument, GlobalWorkerOptions, TextLayer} from './vendor/pdfjs/pdf.min.mjs';

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
  .pac-pdf-zoom{width:106px;min-height:32px;padding:5px 8px;border:1px solid #c4ced7;border-radius:2px;background:#fff;color:#43515d;font:12px/1.4 Inter,system-ui,sans-serif;flex-shrink:0}
  .pac-pdf-zoom:focus-visible{outline:2px solid #2360a4;outline-offset:2px}
  .pac-pdf-page-count{font-size:11px;color:#626c75;white-space:nowrap}
  .pac-pdf-preview-scroll{max-height:480px;overflow:auto;padding:16px;overscroll-behavior:contain}
  .pac-pdf-sheet{position:relative;margin:0 auto;max-width:700px;background:#fff;border:1px solid #dce1e5}
  .pac-pdf-sheet[hidden]{display:none}
  .pac-pdf-sheet canvas{display:block;width:100%;height:auto;background:#fff}
  /* Native PDF.js 6.5 text-layer rules, scoped to this reader. Layout remains
     tied to the real PDF viewport, not an HTML recreation of the quotation. */
  .pac-pdf-text-layer{position:absolute;inset:0;overflow:clip;line-height:1;text-align:initial;letter-spacing:normal;word-spacing:normal;text-size-adjust:none;forced-color-adjust:none;transform-origin:0 0;z-index:1;--min-font-size:1;--text-scale-factor:calc(var(--total-scale-factor) * var(--min-font-size));--min-font-size-inv:calc(1 / var(--min-font-size))}
  .pac-pdf-text-layer :is(span,br){position:absolute;color:transparent;white-space:pre;cursor:text;transform-origin:0 0;user-select:text}
  .pac-pdf-text-layer > :not(.markedContent),.pac-pdf-text-layer .markedContent span:not(.markedContent){--font-height:0;--scale-x:1;--rotate:0deg;font-size:calc(var(--text-scale-factor) * var(--font-height));transform:rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv))}
  .pac-pdf-text-layer .markedContent{display:contents}
  .pac-pdf-text-layer ::selection{background:rgb(245 172 11 / .35);color:transparent}
  .pac-pdf-text-layer br::selection{background:transparent}
  .pac-pdf-annotations{position:absolute;inset:0;pointer-events:none;z-index:2}
  .pac-pdf-highlight{position:absolute;background:rgb(245 172 11 / .18);border-bottom:1px solid rgb(173 113 0 / .45);pointer-events:none}
  .pac-pdf-highlight.is-active{background:rgb(245 172 11 / .3);border-bottom-color:#aa7100}
  .pac-pdf-highlight.is-resolved{background:rgb(35 96 164 / .08);border-bottom-color:#9aaebe}
  .pac-pdf-comment-pin{position:absolute;right:3px;min-width:24px;height:24px;padding:2px 5px;border:1px solid #c7d6e3;border-radius:2px;background:#fff;color:#2360a4;font:600 11px/1 Inter,system-ui,sans-serif;pointer-events:auto;cursor:pointer;box-shadow:0 1px 3px #0001}
  .pac-pdf-comment-pin.is-active{background:#f5ac0b;border-color:#f5ac0b;color:#20272d}
  .pac-pdf-comment-pin:focus-visible{outline:2px solid #2360a4;outline-offset:2px}
  .pac-pdf-accessible{border-top:1px solid #dce1e5;font-size:12px;background:#f7f8f9}
  .pac-pdf-accessible summary{padding:12px 15px;cursor:pointer;color:#4d606e}
  .pac-pdf-accessible pre{white-space:pre-wrap;padding:0 15px 16px;margin:0;font:12px/1.6 Inter,system-ui,sans-serif;color:#26343e}
  @media(max-width:450px){.pac-pdf-preview-nav{gap:4px}.pac-pdf-preview-nav .pac-pdf-page-count{display:none}.pac-pdf-zoom{width:100px}}
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
export async function renderPdfPreview(container, bytes, {version, onSelection, onPageChange} = {}) {
  if (!(container instanceof Element)) throw Error('Choose a PDF preview container.');
  if (!(bytes instanceof Uint8Array) && !(bytes instanceof ArrayBuffer)) throw Error('PDF bytes are not ready.');
  const previous = active.get(container);
  if (previous) {
    await previous.destroy();
  }
  styles();
  // PDF.js transfers its input buffer to the worker; protect the download bytes.
  const data = bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes.slice(0));
  const loading = getDocument({data, standardFontDataUrl:fontURL, useSystemFonts:false, isEvalSupported:false});
  const job = {loading, cancelled:false, renders:[], textLayers:[], cleanups:[]};
  job.destroy = async () => {
    if (job.cancelled) return;
    job.cancelled = true;
    job.renders.forEach(task => task.cancel());
    job.textLayers.forEach(layer => layer.cancel());
    job.cleanups.splice(0).forEach(cleanup => cleanup());
    if (active.get(container) === job) active.delete(container);
    await loading.destroy().catch(() => {});
  };
  active.set(container,job);
  const current = () => {
    if (job.cancelled || active.get(container) !== job) throw new DOMException('The PDF preview was replaced.', 'AbortError');
  };
  const shell = document.createElement('section'); shell.className = 'pac-pdf-preview';
  shell.setAttribute('aria-label', `Actual Quote V${version ?? ''} PDF preview`);
  const nav = document.createElement('div'); nav.className = 'pac-pdf-preview-nav';
  const tabs = document.createElement('div'); tabs.setAttribute('role','tablist'); tabs.setAttribute('aria-label','Quote document pages');
  const counter = document.createElement('span'); counter.className = 'pac-pdf-page-count';
  const zoomSelect=document.createElement('select');zoomSelect.className='pac-pdf-zoom';zoomSelect.setAttribute('aria-label','Document zoom');
  for(const [value,label] of [['1','Fit width'],['1.25','125%'],['1.5','150%'],['2','200%']]){const option=document.createElement('option');option.value=value;option.textContent=label;zoomSelect.append(option);}
  nav.append(tabs,zoomSelect,counter);
  const scroll = document.createElement('div'); scroll.className = 'pac-pdf-preview-scroll';
  const accessible = document.createElement('details'); accessible.className = 'pac-pdf-accessible';
  const summary = document.createElement('summary'); summary.textContent = 'Read the PDF text';
  const transcript = document.createElement('pre');
  accessible.append(summary,transcript);shell.append(nav,scroll,accessible);
  container.replaceChildren(shell);container.setAttribute('aria-busy','true');
  // The document contents are not a live status message. Only loading failures
  // and comment receipts should be announced by the surrounding reader.
  if (container.getAttribute('role') === 'status') container.removeAttribute('role');
  try {
    const pdf = await loading.promise;current();
    const pages = [], buttons = [], extracted = [], textLayers = [], annotationLayers = [], pageText = [];
    let selectedPage = 0, ownedSelection = false, selectionFrame = 0, zoom = 1;
    let pinGroups = annotationLayers.map(() => []);
    const positionPins = () => {
      pinGroups.forEach((pins, index) => {
        if (!pins.length) return;
        const height = annotationLayers[index].getBoundingClientRect().height || annotationLayers.find(layer => layer.getBoundingClientRect().height)?.getBoundingClientRect().height || parseFloat(textLayers[index]?.style.height) || 900;
        const top = 4, bottom = Math.max(top, height - 28);
        const gap = pins.length > 1 ? Math.min(28, (bottom-top)/(pins.length-1)) : 28;
        const ordered = [...pins].sort((a,b) => a.anchor-b.anchor);
        ordered.forEach((entry,i) => {entry.y=Math.max(top, Math.min(bottom,entry.anchor*height), i?ordered[i-1].y+gap:top);});
        if (ordered.at(-1).y > bottom) {
          ordered.at(-1).y=bottom;
          for(let i=ordered.length-2;i>=0;i--)ordered[i].y=Math.min(ordered[i].y,ordered[i+1].y-gap);
        }
        ordered.forEach(entry => {entry.pin.style.top=`${entry.y/height*100}%`;});
      });
    };
    const fitLayer = index => {
      const layer = textLayers[index], figure = pages[index];
      if (!layer || figure.hidden) return;
      const width = figure.clientWidth;
      if (width > 0) layer.style.transform = `scale(${width / Number(layer.dataset.viewportWidth)})`;
    };
    const sizePages = () => {
      const computed=getComputedStyle(scroll);
      const available=scroll.clientWidth-parseFloat(computed.paddingLeft)-parseFloat(computed.paddingRight);
      pages.forEach(figure=>{
        if(zoom===1){figure.style.removeProperty('width');figure.style.removeProperty('max-width');}
        else if(available>0){figure.style.width=`${Math.round(available*zoom)}px`;figure.style.maxWidth='none';}
      });
    };
    const observer = new ResizeObserver(() => {sizePages();pages.forEach((_, index) => fitLayer(index));positionPins();});
    observer.observe(scroll);
    job.cleanups.push(() => observer.disconnect());
    zoomSelect.addEventListener('change',()=>{
      const figure=pages[selectedPage-1],oldHeight=figure?.clientHeight||1,oldWidth=figure?.clientWidth||1;
      const vertical=scroll.scrollTop/oldHeight,horizontal=scroll.scrollLeft/oldWidth;
      zoom=Number(zoomSelect.value);sizePages();pages.forEach((_,index)=>fitLayer(index));positionPins();
      scroll.scrollTop=vertical*(figure?.clientHeight||1);scroll.scrollLeft=zoom===1?0:horizontal*(figure?.clientWidth||1);
      onSelection?.(null);
    });
    // Arrow keys belong to the native select, not the presentation runner.
    zoomSelect.addEventListener('keydown',event=>event.stopPropagation());
    const choose = index => {
      if (!Number.isInteger(index) || index < 0 || index >= pages.length) return;
      const changed = selectedPage !== index + 1;
      if (changed && ownedSelection) {document.getSelection()?.removeAllRanges();ownedSelection = false;onSelection?.(null);}
      selectedPage = index + 1;
      pages.forEach((page,i) => {page.hidden = i !== index;});
      buttons.forEach((button,i) => {button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;});
      counter.textContent = `Page ${index+1} of ${pdf.numPages}`;
      transcript.textContent = extracted[index] || 'Reading this PDF page…';
      container.dataset.pdfPage = String(selectedPage);
      sizePages();fitLayer(index);positionPins();
      if (changed) {scroll.scrollTop = 0;onPageChange?.(selectedPage);}
    };
    for (let pageNumber=1; pageNumber<=pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);current();
      const index = pageNumber-1;
      const base = page.getViewport({scale:1});
      // The runner prepares its iframe while hidden. Render at full resolution
      // in that case; CSS can safely reduce the finished canvas on small screens.
      const targetWidth = 700;
      const viewport = page.getViewport({scale:targetWidth/base.width});
      const outputScale = Math.min(2, window.devicePixelRatio || 1);
      const figure = document.createElement('figure');figure.className='pac-pdf-sheet';figure.hidden=index!==0;
      const panelId=`pac-pdf-v${version??'current'}-page-${pageNumber}`;
      figure.id=panelId;figure.setAttribute('role','tabpanel');
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width*outputScale);canvas.height=Math.ceil(viewport.height*outputScale);
      canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Quote V${version??''}, page ${pageNumber} of ${pdf.numPages}. Use Read the PDF text for the document contents.`);
      const textLayer = document.createElement('div');textLayer.className='pac-pdf-text-layer textLayer';
      textLayer.dataset.viewportWidth=String(viewport.width);
      textLayer.style.setProperty('--total-scale-factor',String(viewport.scale));
      textLayer.style.setProperty('--scale-round-x','1px');textLayer.style.setProperty('--scale-round-y','1px');
      const annotationLayer=document.createElement('div');annotationLayer.className='pac-pdf-annotations';
      figure.append(canvas,textLayer,annotationLayer);scroll.append(figure);pages.push(figure);
      textLayers.push(textLayer);annotationLayers.push(annotationLayer);observer.observe(figure);
      const button = document.createElement('button');button.type='button';button.setAttribute('role','tab');button.setAttribute('aria-controls',panelId);
      button.textContent=pdf.numPages===2?`Option ${index===0?'A':'B'}`:`Page ${pageNumber}`;
      button.addEventListener('click',()=>choose(index));
      button.addEventListener('keydown',event=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;event.preventDefault();event.stopPropagation();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;choose(next);buttons[next].focus();});
      tabs.append(button);buttons.push(button);
      const renderTask = page.render({canvas,canvasContext:canvas.getContext('2d'),viewport,transform:outputScale===1?null:[outputScale,0,0,outputScale,0,0],background:'#ffffff'});
      job.renders.push(renderTask);await renderTask.promise;current();
      const content=await page.getTextContent();current();extracted.push(textFrom(content));
      const nativeLayer=new TextLayer({textContentSource:content,container:textLayer,viewport});
      // A prepared iframe may be display:none. PDF.js measures the browser's
      // minimum font size in the body; zero is a hidden-surface measurement,
      // not a usable font scale. One is the native default on modern browsers.
      if (!(parseFloat(textLayer.style.getPropertyValue('--min-font-size')) > 0)) textLayer.style.setProperty('--min-font-size','1');
      job.textLayers.push(nativeLayer);await nativeLayer.render();current();
      // The parent is responsively sized; this layer keeps its canonical PDF
      // coordinates and scales as a unit with the canvas.
      textLayer.style.width=`${viewport.width}px`;textLayer.style.height=`${viewport.height}px`;
      pageText.push({base,items:content.items.filter(item=>'str' in item),spans:nativeLayer.textDivs});
      fitLayer(index);
      if(index===0)choose(0);
    }
    const normalizedRects = (range, layer) => {
      const box=layer.getBoundingClientRect();if (!box.width || !box.height) return [];
      const result=[];
      for(const rect of range.getClientRects()) {
        const left=Math.max(box.left,rect.left),top=Math.max(box.top,rect.top);
        const right=Math.min(box.right,rect.right),bottom=Math.min(box.bottom,rect.bottom);
        if(right-left<1 || bottom-top<1)continue;
        const item=[(left-box.left)/box.width,(top-box.top)/box.height,(right-left)/box.width,(bottom-top)/box.height];
        if(!result.some(existing=>existing.every((n,i)=>Math.abs(n-item[i])<.0001)))result.push(item);
      }
      return result;
    };
    const reportSelection = () => {
      cancelAnimationFrame(selectionFrame);
      selectionFrame=requestAnimationFrame(()=>{
        if(job.cancelled)return;
        const selection=document.getSelection();
        if(!selection || selection.isCollapsed || !selection.rangeCount) {
          if(ownedSelection){ownedSelection=false;onSelection?.(null);}return;
        }
        const range=selection.getRangeAt(0),index=textLayers.findIndex(layer=>layer.contains(range.startContainer)&&layer.contains(range.endContainer));
        if(index<0){if(ownedSelection){ownedSelection=false;onSelection?.(null);}return;}
        const quote=selection.toString().trim().slice(0,1000),rects=normalizedRects(range,textLayers[index]);
        if(!quote || !rects.length)return;
        const box=range.getBoundingClientRect();ownedSelection=true;
        onSelection?.({page:index+1,quote,rects,clientRect:{left:box.left,top:box.top,right:box.right,bottom:box.bottom}});
      });
    };
    document.addEventListener('selectionchange',reportSelection);
    job.cleanups.push(()=>{document.removeEventListener('selectionchange',reportSelection);cancelAnimationFrame(selectionFrame);});
    const getAnchorForText = (pageNumber, quote) => {
      const index=pageNumber-1,layer=textLayers[index],figure=pages[index];
      if(!layer || !String(quote||'').trim())return null;
      const spans=[...layer.querySelectorAll('span')].filter(el=>el.firstChild?.nodeType===Node.TEXT_NODE);
      const needle=String(quote).trim().toLowerCase();
      const span=spans.find(el=>el.textContent.toLowerCase().includes(needle));
      if(!span)return null;
      const start=span.textContent.toLowerCase().indexOf(needle),range=document.createRange();
      range.setStart(span.firstChild,start);range.setEnd(span.firstChild,start+needle.length);
      // A hidden Option still needs stable anchors before its first visit.
      // Temporarily measure off-flow at the same canonical viewport size.
      const hidden=figure.hidden,figureStyle=figure.getAttribute('style'),layerTransform=layer.style.transform;
      if(hidden){figure.hidden=false;figure.style.cssText=`position:absolute;visibility:hidden;width:${layer.dataset.viewportWidth}px;max-width:none;`;layer.style.transform='none';}
      let rects=normalizedRects(range,layer);
      if (!rects.length) {
        // The whole iframe can still be hidden during preparation. Derive the
        // canonical anchor from the very same PDF text item in that case.
        const info=pageText[index],item=info.items[info.spans.indexOf(span)];
        if(item){
          const ctx=document.createElement('canvas').getContext('2d');
          ctx.font=`100px ${span.style.fontFamily}`;
          const full=ctx.measureText(span.textContent).width||1;
          const before=ctx.measureText(span.textContent.slice(0,start)).width/full;
          const part=ctx.measureText(span.textContent.slice(start,start+needle.length)).width/full;
          const width=item.width/info.base.width;
          rects=[[parseFloat(span.style.left)/100+before*width,parseFloat(span.style.top)/100,part*width,parseFloat(span.style.getPropertyValue('--font-height'))/info.base.height]];
        }
      }
      if(hidden){figure.hidden=true;figureStyle===null?figure.removeAttribute('style'):figure.setAttribute('style',figureStyle);layer.style.transform=layerTransform;}
      return rects.length?{page:pageNumber,quote:String(quote),rects}:null;
    };
    const focusAnchor = anchor => {
      const index=Number(anchor?.page)-1;if(!pages[index])return;
      choose(index);
      const rects=anchor.rects?.length?anchor.rects:getAnchorForText(index+1,anchor.quote)?.rects;
      if(rects?.length){const box=textLayers[index].getBoundingClientRect(),view=scroll.getBoundingClientRect();scroll.scrollTop+=box.top-view.top+rects[0][1]*box.height-Math.min(120,scroll.clientHeight/3);}
    };
    const setAnnotations = (annotations=[],onSelect) => {
      annotationLayers.forEach(layer=>layer.replaceChildren());
      pinGroups=annotationLayers.map(()=>[]);
      annotations.forEach((annotation,index)=>{
        const layer=annotationLayers[Number(annotation.page)-1];if(!layer)return;
        const rects=annotation.rects?.length?annotation.rects:getAnchorForText(annotation.page,annotation.quote)?.rects||[];
        for(const [x,y,width,height] of rects){
          const mark=document.createElement('span');mark.className=`pac-pdf-highlight${annotation.active?' is-active':''}${annotation.resolved?' is-resolved':''}`;
          mark.style.cssText=`left:${x*100}%;top:${y*100}%;width:${width*100}%;height:${height*100}%;`;
          layer.append(mark);
        }
        const draft=annotation.id==='draft';
        const pin=document.createElement(draft?'span':'button');
        if(!draft)pin.type='button';
        pin.className=`pac-pdf-comment-pin${annotation.active?' is-active':''}`;
        pin.textContent=draft?'+':String(index+1);
        pin.setAttribute('aria-label',draft?`New comment selection, page ${annotation.page}`:`Open comment ${index+1}, ${annotation.resolved?'resolved':'open'}, page ${annotation.page}`);
        if(draft){pin.style.pointerEvents='none';pin.style.display='grid';pin.style.placeItems='center';}
        else pin.addEventListener('click',()=>onSelect?.(annotation.id));
        layer.append(pin);
        pinGroups[Number(annotation.page)-1].push({pin,anchor:rects[0]?.[1]??.04});
      });
      positionPins();
    };
    choose(0);container.setAttribute('aria-busy','false');container.dataset.pdfReady='true';container.dataset.pdfVersion=String(version??'');
    return {pageCount:pdf.numPages,version,document:pdf,selectPage:pageNumber=>choose(Number(pageNumber)-1),getPage:()=>selectedPage,setAnnotations,focusAnchor,getAnchorForText,destroy:job.destroy};
  } catch (error) {
    if (active.get(container)===job) {container.setAttribute('aria-busy','false');container.dataset.pdfReady='false';}
    await job.destroy();
    throw error;
  }
}
