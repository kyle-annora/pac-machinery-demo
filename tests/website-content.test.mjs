import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { enrichProducts, productGuides, explorerTopics, solutionGuides, sources } from "../website/content.js";
import { escapeHTML, filterProducts, families, official } from "../website/model.js";
import { productPath, inquiryPath, solutionContext } from "../website/inquiry-flow.js";

const raw = JSON.parse(readFileSync(new URL("../website/data/products.json", import.meta.url))).products;
const products = enrichProducts(raw);
const source = readFileSync(new URL("../website/app.js", import.meta.url), "utf8");

function renderDetail(productId, transform = (value) => value) {
  const items = products.map((p) => transform(structuredClone(p)));
  const context = { products: items, product: (id) => items.find((p) => p.id === id), e: escapeHTML,
    productPath, inquiryPath, solutionContext, sources, families, filterProducts, official,
    shell: (html) => html, crumb: () => "", cta: () => "", productCard: () => "", icon: () => "",
    link: (url, text) => `<a href="${escapeHTML(url)}">${text}</a>`, notFound: () => "Not found", params: new URLSearchParams(), productId };
  vm.runInNewContext(`${source.slice(source.indexOf("function comparisonRows("), source.indexOf("function solutionPage("))}\nhtml = detail(productId, params);`, context);
  return context.html;
}

test("all 13 catalog variants retain their source data while receiving distinct selection guidance", () => {
  const before = JSON.stringify(raw);
  assert.deepEqual(Object.keys(productGuides), raw.map((p) => p.id));
  for (const p of products) {
    assert.ok(p.description.length < 240, p.id);
    assert.equal(p.facts.length, 3, p.id);
    assert.ok(p.distinction.length > 40, p.id);
    assert.ok(p.resources.length, p.id);
    assert.deepEqual(p.photos, raw.find((item) => item.id === p.id).photos);
    assert.equal(p.options.length, raw.find((item) => item.id === p.id).options.length);
    assert.doesNotMatch(JSON.stringify(p), /Thicnkness|finisehd|has bee reached|R1285 Med Bagge\b|an elite poly bagging fulfillment systems/);
  }
  assert.equal(new Set(products.map((p) => p.fit)).size, 13);
  assert.equal(JSON.stringify(raw), before, "website editing must never mutate the supplied catalog");
});

test("all product templates render a working contextual inquiry and qualified model resources", () => {
  for (const p of products) {
    const html = renderDetail(p.id);
    assert.ok(html.includes(`<h1>${escapeHTML(p.model)}</h1>`), p.id);
    assert.ok(html.includes(`#/inquiry?product=${p.id}`), p.id);
    assert.ok(html.includes(escapeHTML(p.resources[0].url)), p.id);
    assert.ok(html.includes(escapeHTML(p.distinction)), p.id);
    assert.doesNotMatch(html, /undefined|null|NaN/);
  }
  const empty = renderDetail("kit_conveyor", (p) => ({ ...p, benefits: [] }));
  assert.doesNotMatch(empty, /id="features"|data-scroll="features"/);
  const actual = renderDetail("kit_conveyor");
  assert.match(actual, /Manual: cycle the conveyor/);
});

test("missing product photography gives an honest recovery instead of an empty image URL", () => {
  const html = renderDetail("r3200", (p) => ({ ...p, photos: [] }));
  assert.match(html, /Equipment photograph unavailable/);
  assert.doesNotMatch(html, /src=""|data-enlarge/);
});

test("every Explorer variant exposes every available photo with matching scope and no nonexistent local asset", () => {
  for (const p of products) {
    const topics = explorerTopics(p);
    assert.equal(topics.length, p.photos.length + p.options.filter((o) => o.photo).length, p.id);
    assert.equal(new Set(topics.map((t) => t.id)).size, topics.length, p.id);
    for (const topic of topics) {
      assert.ok(topic.name && topic.note && topic.photo?.url, p.id);
      const path = fileURLToPath(new URL(`../data/catalog/${topic.photo.url.replace("/source/", "")}`, import.meta.url));
      assert.ok(existsSync(path), `${p.id}: ${topic.photo.url}`);
    }
  }
  const missing = explorerTopics({ ...products[0], photos: [], options: [] });
  assert.equal(missing.length, 1);
  assert.equal(missing[0].photo, null);
  assert.match(missing[0].note, /unavailable/);
});

test("solutions use real model IDs and separate process selection from promises of suitability", () => {
  const ids = new Set(products.map((p) => p.id));
  for (const guide of Object.values(solutionGuides)) {
    assert.equal(guide.stages.length, 3);
    assert.equal(guide.choices.length, 3);
    for (const [, id, why] of guide.choices) {
      assert.ok(ids.has(id), id);
      assert.ok(why.length > 40);
    }
    assert.equal(new URL(guide.proof.url).hostname, "www.pacmachinery.com");
  }
});

test("official resource scope does not imply current equipment matches a catalog snapshot", () => {
  for (const product of products) for (const item of product.resources) {
    assert.equal(new URL(item.url).protocol, "https:");
    assert.equal(new URL(item.url).hostname, "www.pacmachinery.com");
    assert.ok(item.scope.length > 20);
  }
  assert.match(productGuides.r3200_hs_med.resources[0].scope, /differ/);
  assert.match(productGuides.r3200_hs_hybrid.resources[0].scope, /confirm/);
  assert.match(products.find((p) => p.id === "r3200_bag_maker").photoNote, /not pictured/);
});
