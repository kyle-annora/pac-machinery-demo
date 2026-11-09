import {PDFDocument,StandardFonts,rgb} from './vendor/pdf-lib.mjs';

const clean = value => String(value??'').replace(/[–—]/g,'-').replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/≥/g,'>=').replace(/×/g,'x').replace(/[^\x20-\x7E]/g,' ');
const usd = value => value==null?'Pending':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
const colors={ink:rgb(.125,.153,.176),muted:rgb(.38,.42,.46),blue:rgb(.137,.376,.643),amber:rgb(.961,.675,.043),line:rgb(.87,.89,.91),soft:rgb(.96,.97,.975)};

/** Each document is generated from an issued customer projection, never working drafts. */
export async function createProposalPdf(publication,{logo:logoBytes}={}){
  if(!publication?.quotes?.a||!publication?.quotes?.b||!Number.isInteger(publication.version))throw Error('A published proposal is required.');
  const doc=await PDFDocument.create();
  doc.setTitle(`Harbor Components - Proposal V${publication.version}`);
  doc.setAuthor('PAC Machinery - illustrative demonstration');
  doc.setSubject('Frozen equipment and service quotation');
  const created=new Date(publication.createdAt||'2026-11-09T10:00:00Z');
  doc.setCreationDate(created);doc.setModificationDate(created);
  const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
  if(!logoBytes){const response=await fetch(new URL('../application/assets/pac-logo.png',import.meta.url));if(!response.ok)throw Error('The official logo could not be loaded.');logoBytes=await response.arrayBuffer();}
  const logo=await doc.embedPng(logoBytes);
  const wrap=(value,size,width,f=font)=>{const words=clean(value).split(/\s+/),lines=[];let line='';for(const word of words){if(f.widthOfTextAtSize((line?line+' ':'')+word,size)>width&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;};
  for(const [index,q] of Object.values(publication.quotes).entries()){
    const page=doc.addPage([612,792]);
    const text=(value,x,y,size=10,color=colors.ink,f=font)=>page.drawText(clean(value),{x,y,size,font:f,color});
    const rule=y=>page.drawLine({start:{x:42,y},end:{x:570,y},thickness:.6,color:colors.line});
    const right=(value,y,size=10,f=font)=>text(value,570-f.widthOfTextAtSize(clean(value),size),y,size,colors.ink,f);
    page.drawImage(logo,{x:42,y:735,width:170,height:170*logo.height/logo.width});
    right(`Proposal V${publication.version}  /  Option ${q.id.toUpperCase()}  /  Rev ${q.revision}`,748,10);
    page.drawRectangle({x:42,y:717,width:528,height:3,color:colors.amber});
    text(publication.customer.company,42,681,24,colors.ink,bold);
    text(`${q.name} - Rollbag R3200`,42,658,14);
    text('Prepared for '+publication.customer.contact,42,631,10,colors.muted);
    right('November 9, 2026 - sample case',631,10);
    page.drawRectangle({x:42,y:558,width:528,height:52,color:colors.soft});
    text('APPLICATION',54,593,8,colors.muted,bold);
    text(`${publication.scope.width} x ${publication.scope.length} in bags | ${publication.scope.material} | Manual loading`,54,576,10);
    text('Customer target: '+publication.scope.target+' - application fit subject to sample review',54,562,9,colors.muted);
    text('Equipment & services',42,534,11,colors.ink,bold);text('Qty',453,534,10,colors.muted);right('Amount (USD)',534,10,bold);rule(521);
    let y=501;
    for(const line of q.lines){
      text(line.name,42,y,10,colors.ink,bold);text(line.quantity,461,y,10);right(usd(line.total),y,10,bold);
      const details=wrap(line.detail,8.5,383).slice(0,3);
      details.forEach((row,j)=>text(row,42,y-15-j*11,8.5,colors.muted));
      y-=Math.max(46,27+details.length*11);rule(y+12);
    }
    text('Equipment & service subtotal',42,y-8,12,colors.ink,bold);right(usd(q.total),y-8,21,bold);
    const lead=q.planningLeadWeeks??q.leadWeeks??((q.baseLeadWeeks??6)+(q.engineering?.enabled?(q.engineering.leadWeeks??0):0));
    text(`Planning lead time: ${lead} weeks - illustrative`,42,y-37,10,colors.ink,bold);
    const note=q.engineering?.enabled?'Includes the stated engineering allowance. Final guide geometry and fit require PAC review of representative parts and bags.':'No custom loading guide is included. Review representative parts and bags with PAC before confirming application fit.';
    wrap(note,9,528).forEach((row,j)=>text(row,42,y-57-j*12,9,colors.muted));
    rule(124);
    text('DEMONSTRATION BASIS',42,107,8,colors.blue,bold);
    text('Source-template prices: January 29, 2025. Amounts and timing are illustrative.',42,91,9,colors.muted);
    text('Freight, tax and final commercial terms are excluded and require PAC confirmation.',42,77,9,colors.muted);
    text('Training is separately priced once per alternative and included in its subtotal.',42,63,9,colors.muted);
    text('Illustrative demonstration - not a commercial offer',42,33,8,colors.muted);
    right(`${index+1} / 2`,33,8);
  }
  return doc.save({useObjectStreams:false});
}
