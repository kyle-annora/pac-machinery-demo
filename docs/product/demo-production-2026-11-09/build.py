#!/usr/bin/env python3
"""Render the PAC production-script review pack. This does not operate either artifact.

Inputs are the three adjacent JSON files. Outputs stay in this documentation
directory; no app, pitch, browser storage or remote service is changed.
"""
from pathlib import Path
import base64
import html
import json
import re


HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]


def load(name):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def label(name):
    return re.sub(r"(?<=[a-z])(?=[A-Z])", " ", str(name)).replace("_", " ").capitalize()


def scalar(value):
    if value is None:
        return "Not specified"
    if isinstance(value, bool):
        return "Yes" if value else "No"
    return str(value)


def md_tree(value, level=0):
    lines = []
    if isinstance(value, dict):
        for key, item in value.items():
            prefix = "  " * level + "- **" + label(key) + ":**"
            if isinstance(item, (dict, list)):
                lines.append(prefix)
                lines.extend(md_tree(item, level + 1))
            else:
                lines.append(prefix + " " + scalar(item).replace("\n", "\n" + "  " * (level + 1)))
    elif isinstance(value, list):
        for item in value:
            if isinstance(item, (dict, list)):
                lines.extend(md_tree(item, level))
            else:
                lines.append("  " * level + "- " + scalar(item))
    else:
        lines.append(scalar(value))
    return lines


def bullets(values):
    return "\n".join(md_tree(values))


def markdown_step(step):
    page = step.get("page", {})
    out = [
        f"### {step['id']} {step['title']}",
        f"**Role:** {step.get('role', '')}  \n**Page:** {page.get('artifact', '')} / {page.get('name', '')}  \n**Target:** {page.get('target', '')}  \n**Current readiness:** {page.get('readiness', '')}  \n**Suggested pace:** {step.get('seconds', 0)} seconds",
        "**Preset action on entry**\n\n" + step.get("action", ""),
        "**Prepared input**\n\n" + bullets(step.get("preset", {})),
        "**Before**\n\n" + bullets(step.get("before", [])),
        "**After**\n\n" + bullets(step.get("after", [])),
        "**Audience should see**\n\n" + bullets(step.get("visible", [])),
        "**Spoken script**\n\n" + "\n\n".join("> " + p.replace("\n", "\n> ") for p in step.get("script", [])),
        "**PAC requirements:** " + ", ".join(step.get("requirements", [])),
        "**Patrick feedback:** " + ", ".join(step.get("feedback", [])),
    ]
    if step.get("checkpoint"):
        out.append("**Checkpoint:** " + step["checkpoint"])
    if step.get("buildNotes"):
        out.append("**Production notes**\n\n" + bullets(step["buildNotes"]))
    return "\n\n".join(out)


def markdown_script(script):
    out = [f"# {script['title']}", "**Draft for script approval. Script review only.**", script.get("summary", ""),
           "This document defines the future demonstration. Advancing the review reader changes the script card only; it does not run or approve any action in the Website or Sales Workspace.",
           "## Agreed production boundaries", bullets(script.get("decisions", [])),
           "## Scenario and fixed inputs", bullets(script.get("scenario", {})),
           "## Playback contract", bullets(script.get("playback", {}))]
    for act in script.get("acts", []):
        out += [f"## {act['id']} {act['title']}", act.get("summary", ""),
                f"**Target time:** {sum(float(step.get('seconds', 0)) for step in act.get('steps', [])):g} seconds  \n**Entry checkpoint:** {act.get('entryCheckpoint', '')}  \n**Exit checkpoint:** {act.get('exitCheckpoint', '')}"]
        out += [markdown_step(step) for step in act.get("steps", [])]
    if script.get("alternatives"):
        out.append("## Optional presets and supplementary demonstrations")
        for alternative in script["alternatives"]:
            out += [f"### {alternative['id']} {alternative['title']}", alternative.get("summary", "")]
            if alternative.get("steps"):
                out += [markdown_step(step) for step in alternative["steps"]]
            extra = {k: v for k, v in alternative.items() if k not in {"id", "title", "summary", "steps"}}
            if extra:
                out.append(bullets(extra))
    out += ["## Production gates", bullets(script.get("productionGates", [])),
            "## Acceptance checks", bullets(script.get("acceptance", [])),
            "## Related documents", "- [Requirements coverage](REQUIREMENTS-COVERAGE.md)\n- [Patrick feedback alignment](FEEDBACK-ALIGNMENT.md)\n- [Interactive script reader](index.html)\n- [Canonical script data](script.json)"]
    return "\n\n".join(out) + "\n"


def markdown_requirements(data):
    out = ["# PAC requirements coverage", "**Draft production coverage. This is not a claim of implemented functionality.**",
           "Planned proof in the script and the current implementation baseline are recorded separately.",
           "## Coverage definitions", bullets(data.get("coverageDefinitions", {}))]
    for key, heading in [
        ("metadata", "Source metadata"),
        ("source", "Source and scope"),
        ("interpretation", "How to interpret this coverage"),
        ("currentStatusDefinitions", "Current implementation status definitions"),
        ("sampleBoundaries", "Sample boundaries"),
        ("contextThatMustSurviveProduction", "Context that must survive production"),
    ]:
        if data.get(key):
            out += ["## " + heading, bullets(data[key])]
    for requirement in data.get("requirements", []):
        out += [f"## {requirement['id']} {requirement.get('requirement', '')}",
                bullets({k: v for k, v in requirement.items() if k not in {"id", "requirement"}})]
    if data.get("annoraBuildDirection"):
        out += ["## Annora build direction from section 10", bullets(data["annoraBuildDirection"])]
    return "\n\n".join(out) + "\n"


def markdown_feedback(data):
    out = ["# Patrick feedback alignment", "**Draft for script approval.**", "## Source register"]
    for source in data.get("sources", []):
        out += [f"### {source['id']} {source.get('title', '')}", bullets({k: v for k, v in source.items() if k not in {"id", "title"}})]
    out.append("## Feedback and production decisions")
    for item in data.get("feedback", []):
        out += [f"### {item['id']} {item.get('request', '')}", bullets({k: v for k, v in item.items() if k not in {"id", "request"}})]
    return "\n\n".join(out) + "\n"


CSS = r"""
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f6f5f1;color:#18232b;font:15px/1.65 Manrope,system-ui,sans-serif}button,input,select{font:inherit}button,a,input,select{-webkit-tap-highlight-color:transparent}button{cursor:pointer}a{color:#2464a6;text-underline-offset:3px}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #d99700;outline-offset:3px}button:disabled{cursor:default;opacity:.4}h1,h2,h3,p{margin:0}h1{font-size:38px;line-height:1.2;letter-spacing:-1px;font-weight:600;max-width:900px}h2{font-size:23px;line-height:1.3;letter-spacing:-.35px;font-weight:600}h3{font-size:17px;line-height:1.4;font-weight:600}p+p{margin-top:14px}ul{margin:12px 0;padding-left:22px}li+li{margin-top:6px}.masthead{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:22px;padding:18px 32px;background:#f6f5f1f5;border-bottom:1px solid #d4d8da}.brand{font-weight:600;font-size:17px;white-space:nowrap}.brand span{font-weight:400;color:#62717b;margin-left:14px}.topnav{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.topnav a{padding:7px 11px;text-decoration:none;color:#4a5964;font-size:13px}.topnav a[aria-current=page]{background:#e5ebee;color:#18232b}.review-band{padding:10px 32px;background:#fff0ce;color:#5d4200;font-size:12px;display:flex;justify-content:space-between;gap:20px}.shell{display:grid;grid-template-columns:270px minmax(0,1fr);min-height:calc(100vh - 120px)}.sidebar{border-right:1px solid #d4d8da;padding:26px 18px 60px;height:calc(100vh - 110px);position:sticky;top:110px;overflow:auto}.nav-group+.nav-group{margin-top:26px}.nav-group>summary,.nav-label{font-weight:600;font-size:12px;color:#566671;padding:0 10px 10px}.nav-group summary{cursor:pointer}.step-link{display:flex;align-items:baseline;gap:10px;text-decoration:none;color:#53636e;font-size:12px;padding:9px 10px;line-height:1.45}.step-link .step-id{font-size:11px;color:#788690;flex:none;width:30px}.step-link[aria-current=step]{background:#e3e9ed;color:#18232b;box-shadow:inset 3px 0 #2464a6}.step-link:hover{background:#eaedee}.main{max-width:1180px;width:100%;padding:44px 48px 72px}.eyebrow{font-size:12px;font-weight:600;color:#64757f;display:block;margin-bottom:12px}.lead{font-size:18px;line-height:1.65;max-width:850px;color:#52636e;margin-top:20px}.section{margin-top:36px}.section>h2{margin-bottom:18px}.box{background:#fff;padding:26px 28px;border:1px solid #d6dcdf}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.act-card{display:flex;flex-direction:column;gap:15px}.act-card .start{margin-top:auto;align-self:flex-start}.small{font-size:12px;color:#63747e}.tag{display:inline-block;font-size:11px;line-height:1.4;padding:5px 8px;background:#e8edef;color:#445763;margin-right:6px}.tag.amber{background:#fff0ce;color:#6e4d00}.tag.blue{background:#dfebf5;color:#1a5687}.action{display:inline-flex;gap:12px;align-items:center;justify-content:center;padding:11px 18px;border:1px solid #2464a6;color:#fff;background:#2464a6;text-decoration:none;font-weight:600;font-size:13px}.action:hover{background:#1d527f}.secondary{display:inline-flex;align-items:center;justify-content:center;padding:11px 16px;border:1px solid #b5c1c9;background:transparent;color:#354954;text-decoration:none;font-size:13px}.secondary:hover{background:#e5ebee}.meta-row{display:grid;grid-template-columns:1.5fr 1fr;gap:24px;margin-top:28px;border-top:1px solid #ccd5da;border-bottom:1px solid #ccd5da;padding:18px 0}.meta-row strong{font-size:16px;font-weight:600}.meta-row .small{display:block;margin-top:3px}.field-label{display:block;font-size:11px;font-weight:600;color:#667984;margin-bottom:6px}.step-action{border-left:4px solid #f7aa00;background:#fff8e7;padding:20px 24px;margin-top:24px}.step-action p{font-size:17px}.state-pair{margin-top:24px;align-items:stretch}.state-pair .box{padding:22px 24px}.state-pair h2{font-size:18px}.state-pair ul{color:#425762}.speech{background:#18232b;color:#f4f6f8;padding:28px 32px;margin-top:28px}.speech .eyebrow{color:#aebdc6}.speech p{font-size:21px;line-height:1.65}.speech p+p{margin-top:20px}.proof{margin-top:26px;padding:0 0 24px;border-bottom:1px solid #ccd5da}.proof h2{font-size:18px}.detail{margin-top:20px;border:1px solid #cbd5db;background:#fff}.detail>summary{cursor:pointer;padding:17px 21px;font-weight:600;font-size:14px}.detail[open]>summary{border-bottom:1px solid #e0e5e8}.detail-body{padding:20px 24px}.detail-body>*+*{margin-top:16px}.tree{margin:0;padding-left:20px}.tree li{margin-top:7px;overflow-wrap:anywhere}.tree .tree{margin-top:8px}.inline-refs{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.inline-refs a{font-size:12px;background:#e8edf0;padding:5px 9px;text-decoration:none}.main.is-step{padding-bottom:156px}.step-controls{position:fixed;left:270px;right:0;bottom:0;z-index:4;max-width:1180px;display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:84px;padding:18px 48px calc(18px + env(safe-area-inset-bottom));background:#f6f5f1;border-top:1px solid #ccd5da;box-shadow:0 -8px 24px #18232b06}.step-controls .control-copy{font-size:12px;color:#61727d;flex:1;text-align:center}.filters{display:flex;gap:12px;align-items:center;margin:26px 0;flex-wrap:wrap}.filters input{flex:1;min-width:230px;padding:11px 14px;background:#fff;border:1px solid #bdcbd2;color:#18232b}.filters select{padding:11px 14px;background:#fff;border:1px solid #bdcbd2;color:#18232b;max-width:100%}.coverage-summary{display:flex;gap:8px;flex-wrap:wrap;margin-top:22px}.requirement{margin-top:16px;border-top:1px solid #c8d1d7;padding-top:20px}.requirement .req-heading{display:flex;gap:12px;align-items:baseline}.req-id{font-weight:600;color:#2464a6;white-space:nowrap}.requirement h2{font-size:18px;line-height:1.5}.req-status{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.requirement details{margin-top:14px}.requirement summary{cursor:pointer;color:#2464a6;font-size:13px}.requirement dl{display:grid;grid-template-columns:160px minmax(0,1fr);gap:12px 22px;margin:18px 0 24px}.requirement dt{font-size:12px;font-weight:600;color:#63747e}.requirement dd{margin:0;overflow-wrap:anywhere}.feedback-item{margin-top:22px;border-top:1px solid #c8d1d7;padding-top:22px}.feedback-item h2{font-size:20px;margin-bottom:12px}.feedback-item p{color:#405762}.feedback-item .source-line{font-size:12px;color:#657985;margin:10px 0}.source-card{border-top:1px solid #cad4da;padding:20px 0}.source-card h3{margin:0 0 10px}.source-card p{font-size:13px;color:#5d717d;overflow-wrap:anywhere}.file-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:28px}.file-list a{display:block;background:#fff;padding:24px;border:1px solid #d0dade;text-decoration:none}.file-list strong{display:block;margin-bottom:6px}.file-list span{font-size:13px;color:#627580}.finish{max-width:760px}.finish .action{margin-top:26px}.print-book{display:none}.empty{padding:32px 0;color:#607582}.scope-note{font-size:13px;color:#586f7b;margin-top:18px}.nav-toggle{display:none}.anchor-target{scroll-margin-top:100px}pre{white-space:pre-wrap;overflow-wrap:anywhere}.mono{font-variant-numeric:tabular-nums}.checklist{list-style:none;padding:0}.checklist li{padding:12px 0;border-bottom:1px solid #dbe1e4}.checklist li:before{content:'○';color:#2464a6;margin-right:12px}.subsection{margin-top:24px}.subsection>h3{margin-bottom:10px}
@media(max-width:1100px){.masthead{padding:16px 22px}.brand span{display:none}.shell{grid-template-columns:225px minmax(0,1fr)}.sidebar{padding:24px 12px}.main{padding:34px 30px 60px}h1{font-size:32px}.grid{gap:16px}.box{padding:22px}.speech p{font-size:19px}.step-controls{left:225px;padding-left:30px;padding-right:30px}}
@media(max-width:760px){.masthead{position:static;display:block;padding:17px 20px}.brand{font-size:16px}.topnav{gap:0;margin-top:12px}.topnav a{padding:6px 9px}.review-band{padding:10px 20px;display:block}.review-band span+span{display:block;margin-top:4px}.shell{display:block}.sidebar{position:static;display:none;height:auto;border-right:0;border-bottom:1px solid #ccd5da;max-height:48vh;overflow:auto;padding:20px}.sidebar.open{display:block}.nav-toggle{display:block;width:calc(100% - 40px);margin:18px 20px 0;padding:10px;border:1px solid #b7c5ce;background:transparent;color:#354c5b}.main{padding:28px 20px 48px}h1{font-size:30px;letter-spacing:-.7px}.lead{font-size:16px}.grid,.meta-row,.file-list{grid-template-columns:1fr}.meta-row{gap:16px}.speech{padding:22px}.speech p{font-size:18px}.box{padding:20px}.requirement .req-heading{display:block}.requirement h2{margin-top:6px}.requirement dl{grid-template-columns:1fr;gap:6px}.requirement dd{margin-bottom:14px}.step-controls .control-copy{display:none}.step-controls{left:0;right:0;gap:10px;min-height:76px;padding:12px 20px calc(12px + env(safe-area-inset-bottom))}.main.is-step{padding-bottom:152px}.step-controls button{flex:1}.filters input{min-width:0;width:100%;flex-basis:100%}.filters select{width:100%}.detail-body{padding:18px}.req-status{gap:4px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media print{body{background:#fff;color:#111;font-size:10pt}.masthead,.review-band,.shell,.nav-toggle,.step-controls{display:none!important}.print-book{display:block;padding:0}.print-book h1{font-size:24pt}.print-book h2{font-size:17pt;margin:20pt 0 10pt}.print-book h3{font-size:13pt;margin:14pt 0 7pt}.print-book p{margin-bottom:8pt}.print-step{break-before:page}.print-step .speech{background:#f0f2f3;color:#111;border-left:2pt solid #657c8a;padding:12pt;margin:12pt 0}.print-step .speech p{font-size:11pt}.print-step .speech .eyebrow{color:#444}.print-step .grid{display:block}.print-step .box{padding:8pt 0;border:0}.print-book .tree{margin-bottom:10pt}.print-book a{color:#111}.print-section{break-before:page}.print-book .req-heading{display:block}.print-book .requirement dl{display:block}.print-book .requirement dd{margin-bottom:6pt}}
"""


JS = r"""
const DATA=JSON.parse(document.getElementById('reviewData').textContent),S=DATA.script,R=DATA.requirements,F=DATA.feedback;
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=value=>value===null?'Not specified':typeof value==='boolean'?(value?'Yes':'No'):String(value??'');
const pretty=value=>String(value).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());
const arr=value=>Array.isArray(value)?value:value===undefined||value===null?[]:[value];
function tree(value){if(Array.isArray(value))return `<ul class="tree">${value.map(item=>`<li>${typeof item==='object'&&item!==null?tree(item):escapeHTML(text(item))}</li>`).join('')}</ul>`;if(value&&typeof value==='object')return `<ul class="tree">${Object.entries(value).map(([key,item])=>`<li><strong>${escapeHTML(pretty(key))}:</strong> ${typeof item==='object'&&item!==null?tree(item):escapeHTML(text(item))}</li>`).join('')}</ul>`;return `<p>${escapeHTML(text(value))}</p>`;}
const paragraphs=value=>arr(value).map(p=>`<p>${escapeHTML(p)}</p>`).join('');
const refs=(ids,type)=>`<div class="inline-refs">${arr(ids).map(id=>`<a href="#${type}/${encodeURIComponent(id)}">${escapeHTML(id)}</a>`).join('')||'<span class="small">No direct reference assigned</span>'}</div>`;
const sourceRefs=ids=>refs(ids,'source');
const allActs=arr(S.acts),alternativeActs=arr(S.alternatives),mainSteps=allActs.flatMap(act=>arr(act.steps).map((step,index)=>({...step,act,index,optional:false}))),optionalSteps=alternativeActs.flatMap(act=>arr(act.steps).map((step,index)=>({...step,act,index,optional:true}))),steps=[...mainSteps,...optionalSteps],byId=new Map(steps.map(step=>[step.id,step]));
const requirementList=arr(R.requirements),feedbackList=arr(F.feedback),sourceList=arr(F.sources),sourceMap=new Map(sourceList.map(s=>[s.id,s]));
const main=document.getElementById('main'),sidebar=document.getElementById('sidebar');
let route={type:'overview'},requirementQuery='',requirementCoverage='all';
function stepLinks(act){return `<div class="nav-group"><div class="nav-label">${escapeHTML(act.id)} · ${escapeHTML(act.title)}</div>${arr(act.steps).map(step=>`<a class="step-link" href="#${encodeURIComponent(step.id)}" ${route.id===step.id?'aria-current="step"':''}><span class="step-id">${escapeHTML(step.id)}</span><span>${escapeHTML(step.title)}</span></a>`).join('')}</div>`;}
function navigation(){sidebar.innerHTML=allActs.map(stepLinks).join('')+(optionalSteps.length?`<details class="nav-group" ${route.type==='step'&&byId.get(route.id)?.optional?'open':''}><summary>Optional presets</summary>${alternativeActs.map(stepLinks).join('')}</details>`:'');document.querySelectorAll('.topnav a').forEach(a=>{const key=a.dataset.view,active=key===route.type||(key==='script'&&route.type==='step')||(key==='feedback'&&route.type==='source');a.toggleAttribute('aria-current',active);if(active)a.setAttribute('aria-current','page')});}
function optionalPresets(printing=false){return `<section class="section"><h2>Optional presets and supplementary demonstrations</h2><p class="small">These sit outside the two main linear walkthroughs. They do not add branches to Patrick’s Next-only route.</p>${arr(S.alternatives).map(item=>`<${printing?'section':'details'} class="${printing?'section':'detail'}">${printing?`<h3>${escapeHTML(item.id)} · ${escapeHTML(item.title)}</h3>`:`<summary>${escapeHTML(item.id)} · ${escapeHTML(item.title)}</summary>`}<div class="detail-body"><p>${escapeHTML(item.summary)}</p>${item.contract?tree(item.contract):''}${arr(item.steps).length?`<p><a href="#${encodeURIComponent(item.steps[0].id)}">Review ${arr(item.steps).length} optional steps →</a></p>`:'<p class="small">Production contract only; no step-by-step demonstration is included in the main route.</p>'}</div></${printing?'section':'details'}>`).join('')}</section>`;}
function actSeconds(act){return arr(act.steps).reduce((sum,step)=>sum+Number(step.seconds||0),0);}
function overview(){return `<span class="eyebrow">Production script · ${mainSteps.length} main steps · ${requirementList.length} requirement records</span><h1>${escapeHTML(S.title)}</h1><p class="lead">${escapeHTML(S.summary)}</p><p class="scope-note">Review the future sequence here. The Next button changes script cards only; it does not run, save, publish or approve actions in either artifact.</p><section class="section grid">${allActs.map(act=>`<article class="box act-card"><span class="eyebrow">${escapeHTML(act.id)} · ${Math.round(actSeconds(act)/60*10)/10} minutes</span><h2>${escapeHTML(act.title)}</h2><p>${escapeHTML(act.summary)}</p><p class="small">${arr(act.steps).length} steps · ${escapeHTML(act.entryCheckpoint||'')} → ${escapeHTML(act.exitCheckpoint||'')}</p><a class="action start" href="#${encodeURIComponent(act.steps?.[0]?.id||'overview')}">Review ${escapeHTML(act.id)} <span aria-hidden="true">→</span></a></article>`).join('')}</section><section class="section"><h2>Production boundaries</h2><div class="box">${tree(S.decisions||[])}</div></section><details class="detail"><summary>Scenario and fixed inputs</summary><div class="detail-body">${tree(S.scenario||{})}</div></details><details class="detail"><summary>Playback and recovery contract</summary><div class="detail-body">${tree(S.playback||{})}</div></details>${optionalPresets()}<section class="section"><h2>Before this can become the live demo</h2>${arr(S.productionGates).map(g=>`<div class="requirement"><div class="req-heading"><span class="req-id">${escapeHTML(g.id)}</span><h2>${escapeHTML(g.title)}</h2></div><p>${escapeHTML(g.criterion)}</p></div>`).join('')}</section><section class="section"><h2>Acceptance checks</h2><ul class="checklist">${arr(S.acceptance).map(item=>`<li>${escapeHTML(typeof item==='object'?JSON.stringify(item):item)}</li>`).join('')}</ul></section>`;}
function stepBody(step,printing=false){const page=step.page||{};return `<span class="eyebrow">${escapeHTML(step.act?.id||'')} · ${escapeHTML(step.id)} · ${step.seconds||0} seconds${step.optional?' · Optional preset':''}</span><h1>${escapeHTML(step.title)}</h1><div class="meta-row"><div><span class="field-label">Page</span><strong>${escapeHTML(page.artifact)} / ${escapeHTML(page.name)}</strong>${page.target&&String(page.target).trim()!==String(page.name||'').trim()?`<span class="small">${escapeHTML(page.target)}</span>`:''}</div><div><span class="field-label">Role</span><strong>${escapeHTML(step.role)}</strong><span class="small">Current readiness: ${escapeHTML(page.readiness)}</span></div></div><section class="step-action"><span class="eyebrow">Preset action on entry</span><p>${escapeHTML(step.action)}</p></section><div class="grid state-pair"><section class="box"><h2>Before</h2>${tree(step.before||[])}</section><section class="box"><h2>After</h2>${tree(step.after||[])}</section></div><section class="proof"><h2>Audience should see</h2>${tree(step.visible||[])}</section><section class="speech"><span class="eyebrow">Spoken script · English</span>${paragraphs(step.script||[])}</section>${printing?`<section class="section"><h2>Prepared input</h2>${tree(step.preset||{})}${step.checkpoint?`<p><strong>Checkpoint:</strong> ${escapeHTML(step.checkpoint)}</p>`:''}</section><section class="section"><h2>Production notes</h2>${tree(step.buildNotes||[])}</section><p>Requirements: ${escapeHTML(arr(step.requirements).join(', '))} · Feedback: ${escapeHTML(arr(step.feedback).join(', '))}</p>`:`<details class="detail"><summary>Prepared input and checkpoint</summary><div class="detail-body">${tree(step.preset||{})}${step.checkpoint?`<p><strong>Checkpoint:</strong> ${escapeHTML(step.checkpoint)}</p>`:''}</div></details><details class="detail"><summary>Requirements, feedback and production notes</summary><div class="detail-body"><div><h3>PAC requirements</h3>${refs(step.requirements,'requirements')}</div><div><h3>Patrick feedback</h3>${refs(step.feedback,'feedback')}</div><div><h3>Production notes</h3>${tree(step.buildNotes||[])}</div></div></details>`}`;}
function sequenceFor(step){return step.optional?optionalSteps.filter(s=>s.act.id===step.act.id):mainSteps;}
function stepPage(step){const sequence=sequenceFor(step),index=sequence.findIndex(s=>s.id===step.id),next=sequence[index+1]||(step.id==='H04'?byId.get('A06'):undefined);return stepBody(step)+`<nav class="step-controls" aria-label="Script navigation"><button class="secondary" id="previous" ${index===0?'disabled':''}>← Previous</button><span class="control-copy">${index+1} / ${sequence.length}${step.optional?' optional steps':' main steps'} · Script review only</span><button class="action" id="next">${next?(next.act.id!==step.act.id?'Next: '+escapeHTML(next.act.id):'Next'):(step.optional?'Back to overview':'Finish script review')} <span aria-hidden="true">→</span></button></nav>`;}
function stepRefLinks(ids){return `<div class="inline-refs">${arr(ids).map(id=>byId.has(id)?`<a href="#${encodeURIComponent(id)}">${escapeHTML(id)}</a>`:`<span class="tag">${escapeHTML(id)}</span>`).join('')||'<span class="small">Outside the main demonstration</span>'}</div>`;}
function requirementCard(req,open=false){return `<article class="requirement anchor-target" id="req-${escapeHTML(req.id)}"><div class="req-heading"><span class="req-id">${escapeHTML(req.id)}</span><h2>${escapeHTML(req.requirement)}</h2></div><div class="req-status"><span class="tag blue">Planned: ${escapeHTML(req.coverage)}</span><span class="tag">Current: ${escapeHTML(req.currentStatus)}</span><span class="tag">${escapeHTML(req.sourceType||'')}</span></div>${stepRefLinks(req.stepIds)}<details ${open?'open':''}><summary>Proof, remaining gap and source</summary><dl><dt>Required visible proof</dt><dd>${escapeHTML(req.proof)}</dd><dt>Remaining gap</dt><dd>${escapeHTML(req.gap)}</dd><dt>Source</dt><dd>${escapeHTML(typeof req.sourceRef==='object'?JSON.stringify(req.sourceRef):req.sourceRef)}</dd></dl></details></article>`;}
function requirementContext(){const sections=[['metadata','Source metadata'],['source','Source and scope'],['interpretation','How to interpret coverage'],['coverageDefinitions','Planned coverage definitions'],['currentStatusDefinitions','Current implementation status definitions'],['sampleBoundaries','Sample boundaries'],['contextThatMustSurviveProduction','Context that must survive production']];return sections.filter(([key])=>R[key]).map(([key,title])=>`<section class="subsection"><h3>${escapeHTML(title)}</h3>${tree(R[key])}</section>`).join('');}
function requirementsPage(id){const selected=id?requirementList.filter(r=>r.id===id):requirementList,values=[...new Set(requirementList.map(r=>r.coverage))];return `<span class="eyebrow">PAC requirements · Sections 4.1–4.6</span><h1>${id?'Requirement '+escapeHTML(id):'Every requirement has a destination.'}</h1><p class="lead">Planned demonstration coverage and the current implementation baseline are separate. A step in this script is not evidence that its functionality has been built.</p>${id?'<p class="section"><a href="#requirements">← All requirements</a></p>':`<div class="coverage-summary">${values.map(value=>`<span class="tag">${escapeHTML(value)} · ${requirementList.filter(r=>r.coverage===value).length}</span>`).join('')}</div><div class="filters"><label class="sr-only" for="requirementSearch">Search requirements</label><input id="requirementSearch" type="search" placeholder="Search by requirement, ID or topic" value="${escapeHTML(requirementQuery)}"><label class="sr-only" for="coverageFilter">Planned coverage</label><select id="coverageFilter"><option value="all">All planned coverage</option>${values.map(value=>`<option ${requirementCoverage===value?'selected':''} value="${escapeHTML(value)}">${escapeHTML(pretty(value))}</option>`).join('')}</select></div>`}<div id="requirementResults">${selected.map(req=>requirementCard(req,Boolean(id))).join('')}</div><details class="detail"><summary>Coverage definitions and source scope</summary><div class="detail-body">${requirementContext()}</div></details>${R.annoraBuildDirection?`<details class="detail"><summary>Annora build direction · Section 10</summary><div class="detail-body">${tree(R.annoraBuildDirection)}</div></details>`:''}`;}
function feedbackCard(item){return `<article class="feedback-item anchor-target" id="feedback-${escapeHTML(item.id)}"><span class="eyebrow">${escapeHTML(item.id)}</span><h2>${escapeHTML(item.request)}</h2><p>${escapeHTML(item.implementation)}</p>${stepRefLinks(item.stepIds)}<p class="source-line">${escapeHTML(item.locator)}</p>${sourceRefs(item.sourceIds)}${item.limits?`<div class="scope-note">${typeof item.limits==='object'?tree(item.limits):escapeHTML(item.limits)}</div>`:''}</article>`;}
function feedbackPage(id){const selected=id?feedbackList.filter(f=>f.id===id):feedbackList;return `<span class="eyebrow">Patrick feedback and current decisions</span><h1>${id?'Feedback '+escapeHTML(id):'The narrative follows the source intent.'}</h1><p class="lead">Patrick’s direction informs the story. Later user decisions control artifact independence, the forward sequence and the free trial terms.</p>${id?'<p class="section"><a href="#feedback">← All feedback</a></p>':''}${selected.map(feedbackCard).join('')}<section class="section"><h2>Source register</h2>${sourceList.map(sourceCard).join('')}</section>`;}
function sourceCard(source){return `<article class="source-card anchor-target" id="source-${escapeHTML(source.id)}"><h3>${escapeHTML(source.id)} · ${escapeHTML(source.title)}</h3><p>${escapeHTML(source.date)} · ${escapeHTML(source.authority)}</p><p>${/^https?:\/\//.test(source.location||'')?`<a href="${escapeHTML(source.location)}" target="_blank" rel="noopener">Open original source ↗</a>`:escapeHTML(source.location)}</p><p>${escapeHTML(source.note)}</p></article>`;}
function filesPage(){const files=[['README.md','Read this first','How to review, approve and hand off this production pack.'],['PRODUCTION-SCRIPT.md','Full production script','Every step, preset, state change and spoken line.'],['REQUIREMENTS-COVERAGE.md','PAC requirements coverage','Planned proof, current gaps and source citations.'],['FEEDBACK-ALIGNMENT.md','Patrick feedback alignment','Source register and explicit production decisions.'],['script.json','Canonical script data','Structured source for the production handoff.'],['requirements.json','Requirements data','Requirement-by-requirement records.'],['feedback.json','Feedback data','Source register and feedback records.']];return `<span class="eyebrow">Editable handoff files</span><h1>Read, annotate and approve the script.</h1><p class="lead">These are production documents. The Website, Sales Workspace and Pitch remain unchanged by this review pack.</p><div class="file-list">${files.map(([path,title,summary])=>`<a href="${path}" download><strong>${title} ↓</strong><span>${summary}</span></a>`).join('')}</div><section class="section"><button class="secondary" id="printScript">Print full script and coverage</button></section>`;}
function finishPage(){return `<div class="finish"><span class="eyebrow">End of the main script</span><h1>Ready for a production decision.</h1><p class="lead">Confirm the sequence, the fixed scenario, the acceptance evidence and the remaining production gates before building either artifact.</p><p class="section">Finishing this reader does not approve the script or execute a demo action. Record agreed changes in the source documents.</p><a class="action" href="#requirements">Review requirement coverage →</a><p class="section"><a href="#${encodeURIComponent(mainSteps[0]?.id||'overview')}">Return to the first step</a> · <a href="#overview">Overview</a></p></div>`;}
function navigateStep(direction){if(route.type!=='step')return;const step=byId.get(route.id),sequence=sequenceFor(step),index=sequence.findIndex(s=>s.id===step.id),target=sequence[index+direction]||(direction>0&&step.id==='H04'?byId.get('A06'):undefined);if(target)location.hash=target.id;else if(direction>0)location.hash=step.optional?'overview':'complete';}
function filterRequirements(){const q=requirementQuery.trim().toLowerCase(),filtered=requirementList.filter(r=>(requirementCoverage==='all'||r.coverage===requirementCoverage)&&(!q||JSON.stringify(r).toLowerCase().includes(q)));document.getElementById('requirementResults').innerHTML=filtered.map(r=>requirementCard(r)).join('')||'<p class="empty">No matching requirements.</p>';}
function render(){let hash=decodeURIComponent(location.hash.slice(1)||'overview'),parts=hash.split('/');route=byId.has(hash)?{type:'step',id:hash}:{type:parts[0],id:parts[1]};if(!['step','overview','requirements','feedback','source','files','complete'].includes(route.type))route={type:'overview'};main.classList.toggle('is-step',route.type==='step');if(route.type==='step')main.innerHTML=stepPage(byId.get(route.id));else if(route.type==='requirements')main.innerHTML=requirementsPage(route.id);else if(route.type==='feedback')main.innerHTML=feedbackPage(route.id);else if(route.type==='source')main.innerHTML=`<span class="eyebrow">Source register</span><h1>Source context</h1>${sourceMap.has(route.id)?sourceCard(sourceMap.get(route.id)):'<p class="empty">Source not found.</p>'}<p class="section"><a href="#feedback">← Feedback alignment</a></p>`;else if(route.type==='files')main.innerHTML=filesPage();else if(route.type==='complete')main.innerHTML=finishPage();else main.innerHTML=overview();navigation();document.getElementById('previous')?.addEventListener('click',()=>navigateStep(-1));document.getElementById('next')?.addEventListener('click',()=>navigateStep(1));document.getElementById('printScript')?.addEventListener('click',()=>window.print());document.getElementById('requirementSearch')?.addEventListener('input',event=>{requirementQuery=event.target.value;filterRequirements()});document.getElementById('coverageFilter')?.addEventListener('change',event=>{requirementCoverage=event.target.value;filterRequirements()});if(route.type==='requirements'&&!route.id)filterRequirements();sidebar.classList.remove('open');document.getElementById('navToggle').setAttribute('aria-expanded','false');window.scrollTo(0,0);document.title=(route.type==='step'?byId.get(route.id).id+' · '+byId.get(route.id).title:'PAC demo production script')+' · Script review';document.getElementById('announcer').textContent=route.type==='step'?byId.get(route.id).id+': '+byId.get(route.id).title:pretty(route.type);}
document.querySelector('[data-view=script]').href='#'+(mainSteps[0]?.id||'overview');document.getElementById('navToggle').addEventListener('click',()=>{const open=sidebar.classList.toggle('open');document.getElementById('navToggle').setAttribute('aria-expanded',String(open))});document.addEventListener('keydown',event=>{if(event.altKey||event.ctrlKey||event.metaKey||event.target.isContentEditable||/^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName))return;if(event.key==='ArrowRight'&&route.type==='step'){event.preventDefault();navigateStep(1)}if(event.key==='ArrowLeft'&&route.type==='step'){event.preventDefault();navigateStep(-1)}});window.addEventListener('hashchange',render);
document.getElementById('printBook').innerHTML=`<h1>${escapeHTML(S.title)}</h1><p>Draft for script approval · Script review only</p><p>${escapeHTML(S.summary)}</p><h2>Production boundaries</h2>${tree(S.decisions||[])}<h2>Scenario</h2>${tree(S.scenario||{})}<h2>Playback contract</h2>${tree(S.playback||{})}${steps.map(step=>`<article class="print-step">${stepBody(step,true)}</article>`).join('')}${optionalPresets(true)}<section class="print-section"><h1>Production gates and acceptance</h1>${tree(S.productionGates||[])}${tree(S.acceptance||[])}</section><section class="print-section"><h1>PAC requirements coverage</h1>${requirementContext()}${requirementList.map(req=>requirementCard(req,true)).join('')}</section><section class="print-section"><h1>Patrick feedback alignment</h1>${feedbackList.map(feedbackCard).join('')}<h2>Sources</h2>${sourceList.map(sourceCard).join('')}</section>`;render();
"""


def main():
    script = load("script.json")
    requirements = load("requirements.json")
    feedback = load("feedback.json")
    acts = script.get("acts", [])
    if not acts or any(not act.get("steps") for act in acts):
        raise ValueError("Every main act must contain steps.")
    steps = [s for act in acts + script.get("alternatives", []) for s in act.get("steps", [])]
    ids = [s["id"] for s in steps]
    if len(ids) != len(set(ids)):
        raise ValueError("Step IDs must be unique.")
    required = {"id", "title", "page", "role", "before", "preset", "action", "after", "visible", "script", "requirements", "feedback", "buildNotes"}
    for step in steps:
        missing = required - set(step)
        if missing:
            raise ValueError(f"{step['id']} is missing {sorted(missing)}")
    payload = json.dumps({"script": script, "requirements": requirements, "feedback": feedback}, ensure_ascii=False).replace("<", "\\u003c").replace("&", "\\u0026")
    font_path = REPO / "presentation/2026-11-08/assets/manrope-variable.ttf"
    font = base64.b64encode(font_path.read_bytes()).decode("ascii")
    font_css = "@font-face{font-family:Manrope;src:url(data:font/ttf;base64," + font + ") format('truetype');font-weight:100 900;font-display:swap}"
    a11y_css = ".sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}"
    document = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>PAC demo production script · Script review</title><style>{font_css}{CSS}{a11y_css}</style></head>
<body><header class="masthead"><div class="brand">PAC Machinery <span>Demo production script</span></div><nav class="topnav" aria-label="Review sections"><a data-view="overview" href="#overview">Overview</a><a data-view="script" href="#A01">Script</a><a data-view="requirements" href="#requirements">Requirements</a><a data-view="feedback" href="#feedback">Patrick feedback</a><a data-view="files" href="#files">Files</a></nav></header>
<div class="review-band"><strong>Draft for script approval · Script review only</strong><span>Next advances this document. No artifact action is executed.</span></div>
<button class="nav-toggle" id="navToggle" aria-expanded="false" aria-controls="sidebar">Show step navigation</button>
<div class="shell"><aside class="sidebar" id="sidebar" aria-label="Script steps"></aside><main class="main" id="main"></main></div><div id="announcer" class="sr-only" role="status" aria-live="polite"></div><div id="printBook" class="print-book"></div>
<script id="reviewData" type="application/json">{payload}</script><script>{JS}</script></body></html>'''
    (HERE / "index.html").write_text(document, encoding="utf-8")
    (HERE / "PRODUCTION-SCRIPT.md").write_text(markdown_script(script), encoding="utf-8")
    (HERE / "REQUIREMENTS-COVERAGE.md").write_text(markdown_requirements(requirements), encoding="utf-8")
    (HERE / "FEEDBACK-ALIGNMENT.md").write_text(markdown_feedback(feedback), encoding="utf-8")
    print(f"Built script review: {sum(len(a['steps']) for a in acts)} main steps, {len(steps)} total steps, {len(requirements.get('requirements', []))} requirements, {len(feedback.get('feedback', []))} feedback records.")
    print("Generated index.html and three Markdown documents. No artifact or pitch source changed.")


if __name__ == "__main__":
    main()
