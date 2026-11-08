import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  projectCatalog,
  filterProducts,
  validateInquiry,
  inquiryPayload,
  referenceForProduct,
  routeFromHash,
  escapeHTML,
  solutions,
} from "../website/model.js";
import { referenceURL } from "../website/explorer.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) =>
  JSON.parse(
    fs.readFileSync(
      path.join(root, "data/catalog/catalog", name + ".json"),
      "utf8",
    ),
  );
const source = {
  machines: read("machines"),
  media: read("media"),
  narratives: read("narratives"),
  priceLines: read("price_lines"),
};
const projected = projectCatalog(source);
const catalog = JSON.parse(
  fs.readFileSync(path.join(root, "website/data/products.json"), "utf8"),
);

test("public catalog is reproducible and covers every source machine exactly once", () => {
  assert.deepEqual(catalog, JSON.parse(JSON.stringify(projected)));
  assert.equal(catalog.products.length, 13);
  assert.deepEqual(
    catalog.products.map((p) => p.id),
    source.machines.map((p) => p.machine_id),
  );
  assert.equal(new Set(catalog.products.map((p) => p.id)).size, 13);
});

test("public projection excludes commercial amounts, approval state, evidence provenance and internal identifiers", () => {
  const injected = structuredClone(source);
  for (const machine of injected.machines) {
    machine.private_customer = "PRIVATE_SENTINEL";
    machine.discount = 12345;
    machine.approval_status = "APPROVAL_SENTINEL";
  }
  const output = JSON.stringify(projectCatalog(injected));
  assert.doesNotMatch(output, /PRIVATE_SENTINEL|APPROVAL_SENTINEL/);
  assert.doesNotMatch(
    output,
    /"(?:price_usd|price|discount|approval_status|review_status|line_id|item_id|narrative_id|confirmed_by|quote_id|deal_id)"\s*:/,
  );
});

test("machine photography uses confirmed matching assets; Bag Maker substitution is explicitly labeled", () => {
  for (const product of catalog.products) {
    assert.ok(product.photos.length, product.id);
    for (const image of product.photos) {
      const record = source.media.find((p) => p.image_id === image.id);
      assert.ok(record.confirmed_by, product.id);
      if (product.id !== "r3200_bag_maker")
        assert.equal(record.matches, product.id);
      assert.ok(
        fs.existsSync(
          path.join(root, "data/catalog", image.url.replace("/source/", "")),
        ),
        image.url,
      );
    }
  }
  assert.equal(
    catalog.products.find((p) => p.id === "r3200").photos[0].id,
    "img_877f3a8a815e",
  );
  assert.match(
    catalog.products.find((p) => p.id === "r3200_bag_maker").photoNote,
    /base machine shown.*not pictured/i,
  );
});

test("unconfirmed photos never become public evidence", () => {
  const data = projectCatalog({
    ...source,
    media: source.media.map((p) => ({ ...p, confirmed_by: null })),
  });
  assert.ok(
    data.products.every(
      (p) => !p.photos.length && p.options.every((o) => o.photo === null),
    ),
  );
});

test("option photos exist and generic evidence is qualified", () => {
  for (const product of catalog.products)
    for (const option of product.options) {
      if (!option.photo) continue;
      assert.ok(
        fs.existsSync(
          path.join(
            root,
            "data/catalog",
            option.photo.url.replace("/source/", ""),
          ),
        ),
      );
      const record = source.media.find((p) => p.image_id === option.photo.id);
      assert.ok(["generic", product.id].includes(record.matches));
      if (record.matches === "generic")
        assert.match(option.applicability, /not an installed configuration/);
    }
});

test("discovery filters combine family and case-insensitive text with a real empty result", () => {
  const medical = filterProducts(catalog.products, { family: "medical" });
  assert.equal(medical.length, 4);
  assert.ok(medical.every((p) => p.family === "medical"));
  const selected = filterProducts(catalog.products, {
    query: "  r1285  ",
    family: "medical",
  });
  assert.deepEqual(
    selected.map((p) => p.id),
    ["r1285_med"],
  );
  assert.equal(
    filterProducts(catalog.products, { query: "missing-sprocket-model" })
      .length,
    0,
  );
});

test("every solution points to real public products", () => {
  const ids = new Set(catalog.products.map((p) => p.id));
  for (const solution of solutions) {
    assert.ok(solution.questions.length >= 3);
    assert.ok(
      solution.products.every((id) => ids.has(id)),
      solution.id,
    );
  }
});

test("inquiry validation rejects incomplete contact details and invalid target throughput", () => {
  assert.deepEqual(Object.keys(validateInquiry({})), [
    "name",
    "company",
    "email",
    "application",
  ]);
  assert.deepEqual(
    validateInquiry({
      name: "Demo Buyer",
      company: "Example Packaging",
      email: "buyer@example.test",
      application: "Bagging fasteners",
      targetThroughput: "25",
    }),
    {},
  );
  assert.match(
    validateInquiry({ email: "bad-address", targetThroughput: "-1" }).email,
    /valid email/,
  );
  assert.match(
    validateInquiry({ targetThroughput: "Infinity" }).targetThroughput,
    /positive/,
  );
  assert.match(
    validateInquiry({ application: "a".repeat(6001) }).application,
    /6,000/,
  );
});

test("inquiry payload keeps its retry ID, strips unrelated fields, and does not duplicate capture images", () => {
  const reference = {
    productId: "r3200",
    title: "Sealing reference",
    source: "Reference assembly — not PAC CAD",
    preview: "data:image/jpeg;base64,abc",
    inspection: {
      preview: { dataUrl: "data:image/jpeg;base64,abc" },
      model: { id: "kinetic-01" },
    },
  };
  const payload = inquiryPayload(
    {
      productId: "r3200",
      name: " Buyer ",
      company: " Example ",
      email: "buyer@example.test",
      application: " Fasteners ",
      dealId: "private-deal",
      internalNotes: "secret",
    },
    "stable-request-id",
    reference,
  );
  assert.equal(payload.requestId, "stable-request-id");
  assert.equal(payload.name, "Buyer");
  assert.equal(payload.application, "Fasteners");
  assert.equal(payload.dealId, undefined);
  assert.equal(payload.internalNotes, undefined);
  assert.equal(payload.reference.preview, undefined);
  assert.equal(payload.reference.inspection.preview.dataUrl, reference.preview);
  assert.ok(reference.preview, "the local draft must not be mutated");
});

test("changing RFQ equipment clears the prior reference and never submits mismatched evidence", () => {
  const photograph = {
    productId: "r3200",
    title: "Loading setup",
    photo: "/source/media/877f3a8a815e.jpg",
    note: "Confirm loading clearance.",
  };
  const inspection = {
    productId: "r3200",
    title: "Reference component",
    source: "Reference assembly — not PAC CAD",
    inspection: { model: { id: "kinetic-01" } },
  };
  for (const reference of [photograph, inspection]) {
    assert.equal(referenceForProduct(reference, "r3200"), reference);
    for (const productId of ["r1285_med", "", undefined]) {
      assert.equal(referenceForProduct(reference, productId), null);
      const payload = inquiryPayload(
        { productId, name: "Demo Buyer" },
        "new-rfq-id",
        reference,
      );
      assert.equal(payload.reference, undefined);
      assert.equal(
        reference.productId,
        "r3200",
        "discarding the attachment does not rewrite its identity",
      );
    }
    const matching = inquiryPayload(
      { productId: "r3200" },
      "same-rfq-id",
      reference,
    );
    assert.deepEqual(matching.reference, reference);
    assert.notEqual(matching.reference, reference);
  }
  assert.equal(
    referenceForProduct({ title: "Unscoped evidence" }, "r3200"),
    null,
  );
});

test("website routes and reference embed never carry a sales deal identity", () => {
  const route = routeFromHash("#/inquiry?product=r3200&question=Bag%20loading");
  assert.deepEqual(route.parts, ["inquiry"]);
  assert.equal(route.params.get("question"), "Bag loading");
  const url = new URL(referenceURL("http://127.0.0.1:4361"));
  assert.equal(url.pathname, "/explorer/");
  assert.equal(url.searchParams.get("model"), "kinetic-01");
  assert.equal(url.searchParams.get("parentOrigin"), "http://127.0.0.1:4361");
  assert.equal(url.searchParams.has("deal"), false);
  assert.equal(url.searchParams.has("surface"), false, "full Explorer remains the default");
  const homepageURL = new URL(referenceURL(url.origin, { branding: true, websiteSurface: true }));
  assert.equal(homepageURL.searchParams.get("surface"), "website");
  assert.equal(homepageURL.searchParams.get("branding"), "pac");
  assert.equal(homepageURL.searchParams.get("appearance"), "dark");
  assert.equal(homepageURL.searchParams.has("deal"), false);
  const app = fs.readFileSync(path.join(root, "website/app.js"), "utf8");
  assert.doesNotMatch(app, /href=["'`]#(?:workspace|deal|present|quote)/);
  assert.doesNotMatch(app, /fetch\(['"](?:\/api\/workspace|\/source\/catalog)/);
  assert.match(app, /pac\.website\.inquiry\.v1/);
  assert.match(app, /Nothing has been emailed to PAC/);
  assert.match(app, /saved-reference-source[^]*?e\(activeReference\.source/, "inquiry retains the reference model qualification");
});

test("website icon and font assets are self-contained", () => {
  const app = fs.readFileSync(path.join(root, "website/app.js"), "utf8");
  const names = [...app.matchAll(/icon\(["']([a-z0-9-]+)["']/g)].map(
    (m) => m[1],
  );
  assert.ok(names.length > 0);
  for (const name of new Set(names))
    assert.ok(
      fs.existsSync(path.join(root, "website/assets/icons", name + ".svg")),
      name,
    );
  for (const weight of [400, 500, 600, 700, 800])
    assert.ok(
      fs.statSync(path.join(root, "website/assets", `manrope-${weight}.ttf`))
        .size > 10000,
    );
  assert.ok(fs.existsSync(path.join(root, "website/assets/Manrope-OFL.txt")));
});

test("user text is escaped before rendering in website templates", () => {
  assert.equal(
    escapeHTML('<img src="x" onerror="alert(1)">'),
    "&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;",
  );
  assert.equal(escapeHTML("A & B's"), "A &amp; B&#39;s");
});
