#!/usr/bin/env python3
"""Build the local PAC pitch PDFs from pitch/content.json.

Run with the bundled Python runtime (reportlab, Pillow, svglib, pdfplumber).
The source captures remain unchanged; PDF-only crops focus the evidence.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader
from reportlab.graphics import renderPDF
from svglib.svglib import svg2rlg


ROOT = Path(__file__).resolve().parents[1]
PITCH = ROOT / "pitch"
OUT = PITCH / "downloads"
PROOF = ROOT / "output" / "pitch-2026-11-08" / "pdf"
FONTS = PITCH / "assets" / "fonts"
DATA_BYTES = (PITCH / "content.json").read_bytes()
DATA = json.loads(DATA_BYTES)
CH = {chapter["id"]: chapter for chapter in DATA["chapters"]}
INK = colors.HexColor("#242424")
MUTED = colors.HexColor("#616365")
LINE = colors.HexColor("#DADDDD")
PALE = colors.HexColor("#F5F6F6")
ORANGE = colors.HexColor("#F6AC12")
WHITE = colors.white

for name, filename in [("Archivo", "Archivo-Regular.ttf"), ("Archivo-Medium", "Archivo-Medium.ttf"), ("Archivo-Bold", "Archivo-Bold.ttf")]:
    pdfmetrics.registerFont(TTFont(name, str(FONTS / filename)))

pdfmetrics.registerFontFamily("Archivo", normal="Archivo", bold="Archivo-Bold", italic="Archivo", boldItalic="Archivo-Bold")


def clean(value: str) -> str:
    """Use simple dashes without changing the wording or claim."""
    return value.replace("–", "-").replace("—", "-").replace("‑", "-")


class Page:
    def __init__(self, c, width, height):
        self.c, self.w, self.h = c, width, height

    def rect(self, x, top, width, height, fill=WHITE, stroke=None, radius=0):
        self.c.setFillColor(fill)
        self.c.setStrokeColor(stroke or fill)
        if radius:
            self.c.roundRect(x, self.h - top - height, width, height, radius, fill=1, stroke=bool(stroke))
        else:
            self.c.rect(x, self.h - top - height, width, height, fill=1, stroke=bool(stroke))

    def rule(self, x, top, width, color=LINE, weight=1):
        self.c.setStrokeColor(color)
        self.c.setLineWidth(weight)
        self.c.line(x, self.h - top, x + width, self.h - top)

    def p(self, text, x, top, width, size=20, leading=None, font="Archivo", color=INK, max_height=None):
        style = ParagraphStyle("p", fontName=font, fontSize=size, leading=leading or size * 1.3, textColor=color, alignment=TA_LEFT, spaceAfter=0, allowWidows=0, allowOrphans=0)
        text = escape(clean(str(text))).replace("\n", "<br/>")
        para = Paragraph(text, style)
        _, height = para.wrap(width, self.h)
        if max_height is not None and height > max_height + .1:
            raise ValueError(f"Text exceeds {max_height:.1f}pt box by {height-max_height:.1f}pt: {text[:85]}")
        if top + height > self.h - 14:
            raise ValueError(f"Text overflows page: {text[:85]}")
        para.drawOn(self.c, x, self.h - top - height)
        return top + height

    def image(self, rel, x, top, width, height, crop=None, contain=True, border=False):
        img = Image.open(PITCH / rel)
        if crop:
            if crop[2] > img.width or crop[3] > img.height:
                raise ValueError(f"Crop exceeds source dimensions: {rel}: {crop} > {img.size}")
            img = img.crop(crop)
        if contain:
            scale = min(width / img.width, height / img.height)
            iw, ih = img.width * scale, img.height * scale
            ix, it = x + (width-iw)/2, top + (height-ih)/2
        else:
            scale = max(width / img.width, height / img.height)
            iw, ih = img.width * scale, img.height * scale
            ix, it = x + (width-iw)/2, top + (height-ih)/2
        self.c.saveState()
        clip = self.c.beginPath()
        clip.rect(x, self.h-top-height, width, height)
        self.c.clipPath(clip, stroke=0)
        self.c.drawImage(ImageReader(img), ix, self.h-it-ih, iw, ih, mask="auto")
        self.c.restoreState()
        if border:
            self.c.setStrokeColor(LINE)
            self.c.setLineWidth(.8)
            self.c.rect(x, self.h-top-height, width, height, stroke=1, fill=0)

    def logo(self, x, top, width=153):
        drawing = svg2rlg(str(PITCH / "assets" / "annora.svg"))
        factor = width / drawing.width
        drawing.scale(factor, factor)
        renderPDF.draw(drawing, self.c, x, self.h-top-drawing.height*factor)

    def badge(self, value, x, top, size=26):
        self.rect(x, top, size, size, fill=ORANGE)
        self.p(value, x+6, top+3, size-9, size=size*.5, font="Archivo-Bold", leading=size*.65)


def deck_base(c, index, chapter):
    p = Page(c, 1440, 810)
    p.rect(0, 0, p.w, p.h)
    p.logo(50, 32, 155)
    p.p("FOR PAC MACHINERY", 225, 47, 350, 13, font="Archivo-Medium", color=MUTED)
    p.p(f"{index:02d} / {chapter['label']}", 1010, 47, 366, 14, font="Archivo-Medium", color=MUTED)
    p.rule(64, 92, 1312)
    p.rule(64, 759, 1312)
    p.p(DATA["title"] + "  ·  " + DATA["date"], 64, 777, 700, 11, color=MUTED)
    p.p(f"LOCAL PRESENTATION BACKUP   /   {index:02d}", 1080, 777, 296, 11, color=MUTED)
    return p


def heading(p, chapter, intro=True, size=46):
    end = p.p(chapter["title"], 64, 122, 1312, size, leading=size*1.08, font="Archivo-Bold", max_height=104)
    if intro:
        p.p(chapter["intro"], 64, end+20, 1250, 21, max_height=59)
    return end


def takeaway(p, text, top=698, size=18, width=1260):
    p.rect(64, top+3, 5, 34, ORANGE)
    p.p(text, 84, top, width, size, max_height=54)


def cover(c):
    ch=CH["opportunity"]
    p=deck_base(c, 1, ch)
    p.p(ch["title"],64,125,1312,64,leading=72,font="Archivo-Bold",max_height=74)
    p.p(ch["intro"],64,217,1312,25,leading=32,max_height=65)
    p.p(ch["detail"],64,264,1312,18,color=MUTED,max_height=48)
    for i,proof in enumerate(ch["proof"]):
        x=64+i*672
        p.rule(x,310,640,ORANGE if i==0 else LINE,4 if i==0 else 1)
        p.p(proof["label"].upper(),x,330,640,13,font="Archivo-Medium",color=MUTED)
        p.p(proof["title"],x,357,640,25,font="Archivo-Bold",max_height=33)
        crop=(35,0,1375,708) if proof["image"].endswith("current-website.png") else None
        p.image(proof["image"],x,402,640,262,crop=crop,contain=True,border=True)
        caption=ch["caption"] if i==0 else proof["caption"]
        p.p(caption,x,679,640,12.5,color=MUTED,max_height=34)
    takeaway(p,ch["takeaway"],top=718,size=17)
    c.showPage()


def priorities(c):
    ch=CH["priorities"]
    p=deck_base(c, 2, ch)
    heading(p, ch)
    p.p(ch["detail"],64,239,1312,19,color=MUTED,max_height=51)
    for i,item in enumerate(ch["artifacts"]):
        x=64+i*672
        p.rule(x,310,640,ORANGE if i==0 else LINE,4 if i==0 else 1)
        p.p(item["role"].upper(),x,332,640,13,font="Archivo-Medium",color=MUTED)
        p.p(item["name"],x,359,640,29,font="Archivo-Bold")
        crop=(35,0,1375,708) if item["image"].endswith("current-website.png") else None
        p.image(item["image"],x,408,310,194,crop=crop,contain=True,border=True)
        p.p(item["title"],x+334,408,306,23,font="Archivo-Bold",max_height=60)
        p.p(item["body"],x+334,480,306,18,color=MUTED,max_height=118)
    p.rule(64,625,1312)
    for i, metric in enumerate(ch["baseline"]):
        x=64+i*672
        p.p(metric["value"],x,644,285,31,font="Archivo-Bold")
        p.p(metric["label"],x+280,652,360,17,color=MUTED)
    p.p(ch["caption"],64,693,1312,12.5,color=MUTED,max_height=33)
    takeaway(p,ch["takeaway"],top=718,size=17)
    c.showPage()


def buyer(c):
    ch=CH["buyer-experience"]
    p=deck_base(c, 3, ch)
    heading(p,ch)
    p.p(ch["detail"],64,239,1280,18,color=MUTED,max_height=49)
    # Three captured states, no claim that the inquiry created a workspace deal.
    website_crop=(35,0,1375,708) if ch["proof"][0]["image"].endswith("current-website.png") else (230,0,1659,774)
    crops=[website_crop,None,None]
    for i, proof in enumerate(ch["proof"]):
        x=64+i*446
        p.p(proof["label"].upper(),x,310,419,13,font="Archivo-Medium",color=MUTED)
        if i == 1:
            p.rect(x,339,419,236,colors.HexColor("#1B1B1B"))
        p.image(proof["image"],x,339,419,236,crop=crops[i],contain=(i in (0,1)),border=True)
        p.p(proof["title"],x,593,419,23,font="Archivo-Bold",max_height=60)
        p.p(proof["caption"],x,634,419,13,color=MUTED,max_height=67)
    takeaway(p,ch["takeaway"],top=707,size=17)
    c.showPage()


def workspace(c):
    ch=CH["sales-workspace"]
    p=deck_base(c,4,ch)
    heading(p,ch,size=43)
    p.p(ch["detail"],64,235,1312,18,color=MUTED,max_height=50)
    # Authentic selected crops, with large exterior labels that remain legible in a meeting.
    positions=[64,510,956]
    for i, proof in enumerate(ch["proof"]):
        x=positions[i]
        p.badge(str(i+1),x,303)
        p.p(proof["label"],x+39,304,370,20,font="Archivo-Medium")
    p.image(ch["proof"][0]["image"],64,346,420,246,contain=True,border=True)
    p.image(ch["proof"][1]["image"],510,346,420,246,crop=(240,250,1120,800),contain=True,border=True)
    p.image(ch["proof"][2]["image"],956,346,420,246,crop=(25,310,1120,885),contain=True,border=True)
    for i, proof in enumerate(ch["proof"]):
        x=positions[i]
        p.p(proof["title"],x,610,420,19.5,font="Archivo-Bold",max_height=26)
        p.p(proof["caption"],x,651,420,12.5,color=MUTED,max_height=65)
    takeaway(p,ch["takeaway"],top=715,size=16)
    c.showPage()


def scope(c):
    ch=CH["trial-scope"]
    p=deck_base(c,5,ch)
    heading(p,ch)
    p.p(ch["detail"],64,243,1312,18,color=MUTED)
    for i,item in enumerate(ch["scope"]):
        x=64+i*446
        p.rule(x,307,420,ORANGE if i==0 else LINE,4 if i==0 else 1)
        p.p(item["value"],x,331,420,31,font="Archivo-Bold",max_height=81)
        p.p(item["body"],x,392,410,20,color=MUTED,max_height=81)
    p.rule(64,488,1312)
    p.p("WHAT THE TRIAL INCLUDES",64,516,430,13,font="Archivo-Medium",color=MUTED)
    for i,item in enumerate(ch["deliverables"]):
        p.rect(514,517+i*39,6,6,ORANGE)
        p.p(item,534,510+i*39,830,18,max_height=27)
    p.p(ch["boundary"],64,647,1312,15,color=MUTED,max_height=42)
    takeaway(p,ch["takeaway"],top=706,size=19)
    c.showPage()


def evaluation(c):
    ch=CH["evaluation"]
    p=deck_base(c,6,ch)
    heading(p,ch)
    p.rule(64,286,1312,LINE,2)
    for i,item in enumerate(ch["timeline"]):
        x=64+i*333
        p.rect(x,281,9,9,ORANGE)
        p.p(item["period"],x,309,300,17,font="Archivo-Medium",color=MUTED)
        p.p(item["title"],x,341,300,25,font="Archivo-Bold")
        p.p(item["body"],x,382,299,17,max_height=91)
    p.p("SHARED SCORECARD",64,500,400,13,font="Archivo-Medium",color=MUTED)
    for i,item in enumerate(ch["scorecard"]):
        x=64+(i%2)*666
        top=535+(i//2)*79
        p.p(item["name"],x,top,255,18,font="Archivo-Bold")
        p.p(item["type"],x,top+29,255,11.5,color=MUTED)
        p.p(item["check"],x+262,top,370,15,max_height=62)
    takeaway(p,ch["takeaway"],top=712,size=18)
    c.showPage()


def continuation(c):
    ch=CH["continuation"]
    p=deck_base(c,7,ch)
    heading(p,ch,intro=False,size=48)
    p.p(ch["intro"],64,196,1312,25,leading=33,max_height=68)
    p.p(ch["scope"],64,280,1312,18,font="Archivo-Medium")
    p.rule(64,321,832,ORANGE,4)
    p.rule(944,321,432,LINE)
    p.p("TRIAL WORK",64,341,180,13,font="Archivo-Medium",color=MUTED)
    p.p("OUTPUT",270,341,205,13,font="Archivo-Medium",color=MUTED)
    p.p("ACCEPTANCE",502,341,390,13,font="Archivo-Medium",color=MUTED)
    p.p("WHY CONTINUE",944,341,432,13,font="Archivo-Medium",color=MUTED)
    for i,item in enumerate(ch["trialRows"]):
        top=377+i*91
        p.p(item["title"],64,top,187,20,font="Archivo-Bold",max_height=55)
        p.p(item["output"],270,top,205,17,max_height=70)
        p.p(item["accept"],502,top,390,17,max_height=70)
        if i<2:
            p.rule(64,top+77,832)
    for i,item in enumerate(ch["value"]):
        top=377+i*91
        p.p(item["title"],944,top,432,21,font="Archivo-Bold",max_height=28)
        p.p(item["body"],944,top+36,432,16,color=MUTED,max_height=43)
    p.p(ch["trialResult"],64,659,1312,18,font="Archivo-Medium",max_height=47)
    p.p(ch["boundary"],64,714,1312,13.5,color=MUTED,max_height=36)
    c.showPage()


def make_deck(path):
    c=canvas.Canvas(str(path),pagesize=(1440,810),pageCompression=1)
    c.setTitle(DATA["title"])
    c.setAuthor("Annora")
    c.setSubject("Seven-chapter local presentation backup; proposed two-week trial")
    for fn in [cover,priorities,buyer,workspace,scope,evaluation,continuation]:
        fn(c)
    c.save()


def make_brief(path):
    c=canvas.Canvas(str(path),pagesize=(595.276,841.89),pageCompression=1)
    c.setTitle("PAC trial brief - proposed scope and scorecard")
    c.setAuthor("Annora")
    p=Page(c,595.276,841.89)
    sc,ev,co=CH["trial-scope"],CH["evaluation"],CH["continuation"]
    p.logo(26,24,112)
    p.p("FOR PAC MACHINERY  /  " + DATA["date"].upper(),305,35,260,8.8,font="Archivo-Medium",color=MUTED)
    p.rule(32,65,531)
    p.p("Two-week trial brief",32,83,530,28,font="Archivo-Bold")
    p.p(sc["detail"],32,123,531,10.2,color=MUTED)
    p.rect(32,149,4,43,ORANGE)
    p.p(co["intro"],44,147,519,11.5,leading=15,max_height=45)

    p.p(co["scope"],32,206,531,12,font="Archivo-Bold",max_height=32)
    p.p(sc["deliverables"][0],32,234,531,9.7,color=MUTED)
    p.rule(32,260,531)
    p.p("TRIAL WORK + OUTPUT",32,278,190,9,font="Archivo-Bold",color=MUTED)
    p.p("ACCEPTANCE",230,278,333,9,font="Archivo-Bold",color=MUTED)
    for i,item in enumerate(co["trialRows"]):
        top=301+i*55
        p.p(item["title"],32,top,181,10.5,font="Archivo-Bold",max_height=14)
        p.p(item["output"],32,top+18,181,9.3,leading=12,max_height=26)
        p.p(item["accept"],230,top,333,9.7,leading=13,max_height=40)
        if i<2:
            p.rule(32,top+46,531)
    p.p(ev["scorecard"][0]["check"],32,474,531,9.6,leading=12.6,max_height=27)
    p.p(ev["takeaway"],32,509,531,9.1,leading=12,color=MUTED,max_height=26)

    p.rule(32,548,531)
    p.p("READINESS + RESULTS REVIEW",32,565,531,9,font="Archivo-Bold",color=MUTED)
    p.p(co["takeaway"],32,587,531,9.5,max_height=25)
    p.p("Trial owner: ______________________    PAC participants: __________________________",32,620,531,9.1)
    p.p("Ready / start date: __________________    Results review date: _______________________",32,643,531,9.1)

    p.rule(32,671,531)
    p.p("WHY CONTINUE",32,688,531,9,font="Archivo-Bold",color=MUTED)
    for i,item in enumerate(co["value"]):
        x=32+i*182
        p.p(item["title"],x,710,167,9.7,leading=12,font="Archivo-Bold",max_height=25)
        p.p(item["body"],x,742,167,8.6,leading=11.1,color=MUTED,max_height=45)
    p.rule(32,792,531)
    p.p(co["boundary"],32,801,531,7.6,leading=10,color=MUTED,max_height=21)
    c.showPage()
    c.save()


def check_pdfs():
    import pdfplumber
    result={"content_sha256":hashlib.sha256(DATA_BYTES).hexdigest(),"asset_sha256":{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((PITCH/"assets").glob("*.png"))},"pdfs":[]}
    for filename,count in [("annora-for-pac.pdf",7),("pac-trial-brief.pdf",1)]:
        path=OUT/filename
        with pdfplumber.open(path) as pdf:
            assert len(pdf.pages)==count,filename
            texts=[page.extract_text() or "" for page in pdf.pages]
            assert all(len(text)>200 for text in texts),filename
            result["pdfs"].append({"file":str(path.relative_to(ROOT)),"pages":len(pdf.pages),"text_characters":[len(text) for text in texts],"bytes":path.stat().st_size,"sha256":hashlib.sha256(path.read_bytes()).hexdigest()})
            (PROOF/(path.stem+".txt")).write_text("\n\n".join(texts))
        full=" ".join(" ".join(texts).split())
        assert "No automatic charges." in full,filename
        assert clean(CH["continuation"]["offerTerms"]) in full,filename
        assert "in writing" in full,filename
        assert "unpriced" in full.lower(),filename
        assert "before release" in full,filename
        assert "lead time" in full,filename
    (PROOF/"generation-report.json").write_text(json.dumps(result,indent=2)+"\n")
    # Ship a content-to-file receipt so a future copy edit cannot silently leave
    # customer-downloadable commercial terms on the previous wording.
    (OUT/"manifest.json").write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps(result,indent=2))


if __name__=="__main__":
    OUT.mkdir(parents=True,exist_ok=True)
    PROOF.mkdir(parents=True,exist_ok=True)
    make_deck(OUT/"annora-for-pac.pdf")
    make_brief(OUT/"pac-trial-brief.pdf")
    check_pdfs()
