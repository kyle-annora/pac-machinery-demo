export const families = {
  floor_standing: "Automatic baggers",
  feeding: "Feeding & counting",
  medical: "Medical bagging",
};
export const solutions = [
  {
    id: "parts",
    name: "Parts & kits",
    summary:
      "Bring product loading, counting and bagging into one considered process.",
    body: "Start with the parts you pack, how they arrive at the bagger and the package your customer needs. A PAC specialist can help evaluate loading, counting and sealing options together.",
    questions: [
      "What products and quantities go into each bag?",
      "How are parts counted and presented to the operator?",
      "What bag size and output do you need?",
    ],
    products: [
      "r3200",
      "r1275_vision",
      "kit_conveyor",
      "weigh_count_sorting_table",
    ],
  },
  {
    id: "fulfillment",
    name: "E-commerce & fulfillment",
    summary: "Explore bagging systems for an evolving mix of orders.",
    body: "Order size, product mix, bag material and labeling all influence a fulfillment packaging workflow. Explore relevant equipment, then discuss your actual products and operation with PAC.",
    questions: [
      "What range of product sizes do you ship?",
      "Which packaging materials and labels are required?",
      "How does your team load and discharge orders?",
    ],
    products: ["r3200_fulfillment", "r3200_hs_hybrid", "r3200xl"],
  },
  {
    id: "medical",
    name: "Medical products",
    summary:
      "Understand the packaging requirements before choosing the system.",
    body: "Discuss your packaging material, product handling and process requirements with PAC. These medical bagging systems offer different equipment and application options; suitability and any validation requirements must be confirmed for your process.",
    questions: [
      "Which products and packaging materials will run?",
      "What process documentation is required?",
      "What handling and sealing requirements must be met?",
    ],
    products: [
      "r1275_med",
      "r1285_med",
      "r3200_hs_med",
      "magnum_horizontal_med",
    ],
  },
];
export const official = {
  home: "https://www.pacmachinery.com/",
  products: "https://www.pacmachinery.com/products/",
  brochures: "https://www.pacmachinery.com/resources/brochures/",
  videos: "https://www.pacmachinery.com/resources/videos/",
  support: "https://www.pacmachinery.com/support/",
  contact: "https://www.pacmachinery.com/contact-us/",
  privacy: "https://www.pacmachinery.com/privacy-policy/",
};
const plain = (value) =>
  String(value ?? "")
    .replace(/Click here.*$/is, "")
    .replace(/\s+/g, " ")
    .trim();
const imageSafe = (p) =>
  Boolean(
    p?.confirmed_by &&
      /^media\/[a-zA-Z0-9_.-]+\.(?:jpe?g|png|webp)$/i.test(
        p.converted_file || p.file || "",
      ) &&
      !["unconverted_emf", "fallback_only"].includes(p.status),
  );
const picture = (p) => ({
  id: p.image_id,
  url: "/source/" + (p.converted_file || p.file),
  width: p.width || 600,
  height: p.height || 600,
  caption: plain(p.feature_name?.text) || "Machine reference photograph",
});
export function projectCatalog({ machines, media, narratives, priceLines }) {
  const products = machines.map((m) => {
    const id = m.machine_id;
    let photos = media
      .filter((p) => imageSafe(p) && p.matches === id && p.kind === "machine")
      .sort(
        (a, b) =>
          Number(a.feature_name != null) - Number(b.feature_name != null) ||
          b.width * b.height - a.width * a.height,
      );
    if (id === "r3200")
      photos.sort(
        (a, b) =>
          Number(b.image_id === "img_877f3a8a815e") -
          Number(a.image_id === "img_877f3a8a815e"),
      );
    const fallback = !photos.length && id === "r3200_bag_maker";
    if (fallback)
      photos = media.filter(
        (p) => p.image_id === "img_877f3a8a815e" && imageSafe(p),
      );
    const title =
      id === "r3200_bag_maker"
        ? "Rollbag R3200 with Bag Maker"
        : plain(m.title.text).replace(/[™®]/g, "");
    const model = title
      .replace(/^Rollbag\s*/, "")
      .replace(/ Automatic Bagger| Automatic Bagging System/, "");
    const options = priceLines
      .filter((p) => p.machine_id === id && p.line_class === "catalog_option")
      .map((p) => {
        const n = narratives.find((n) => n.narrative_id === p.narrative_id);
        const img = media.find(
          (a) =>
            imageSafe(a) &&
            ["generic", id].includes(a.matches) &&
            a.feature_name?.line_id &&
            n?.title?.line_id === a.feature_name.line_id,
        );
        return {
          id: p.option_id || p.item_id.replace(/[^a-zA-Z0-9_-]/g, "-"),
          name: plain(p.name),
          description:
            plain(n?.body?.map((p) => p.text).join(" ")) || plain(p.name),
          photo: img ? picture(img) : null,
          applicability:
            img?.matches === "generic"
              ? "Option reference; not an installed configuration."
              : "Confirm option compatibility with PAC.",
        };
      });
    return {
      id,
      family: m.family,
      name: title,
      model,
      subtitle: plain(m.subtitle?.text),
      description: plain(m.summary.map((p) => p.text).join(" ")),
      specs: m.specs.map((s) => ({
        name: plain(s.name),
        value: plain(s.value),
      })),
      photos: photos.map(picture),
      photoNote: fallback
        ? "R3200 base machine shown. Bag Maker configuration is not pictured."
        : "Machine reference photo. Selected options may differ.",
      benefits: Object.entries(m.benefits || {})
        .filter(([, a]) => a.length)
        .map(([name, items]) => ({
          name,
          items: items.map((p) => plain(p.text)),
        })),
      options,
      source: "PAC Rollbag product catalog",
      sourceDate: m.last_saved,
    };
  });
  return {
    version: 1,
    coverage: "Rollbag automatic bagging systems",
    products,
  };
}
export function filterProducts(products, { query = "", family = "all" } = {}) {
  const q = query.trim().toLowerCase();
  return products.filter(
    (p) =>
      (family === "all" || p.family === family) &&
      (!q ||
        `${p.name} ${p.subtitle} ${p.description} ${p.fit || ""} ${p.material || ""}`.toLowerCase().includes(q)),
  );
}
export function validateInquiry(input) {
  const errors = {};
  for (const key of ["name", "company", "email", "application"])
    if (!String(input[key] || "").trim())
      errors[key] = "This field is required.";
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))
    errors.email = "Enter a valid email address.";
  if (String(input.application || "").length > 6000)
    errors.application =
      "Keep the application description under 6,000 characters.";
  for (const [key, limit] of Object.entries({ name: 150, company: 200, email: 254, phone: 80, bagDimensions: 200, message: 2000 })) {
    if (String(input[key] || "").length > limit)
      errors[key] = `Keep this field under ${limit.toLocaleString("en-US")} characters.`;
  }
  if (
    input.targetThroughput &&
    (!Number.isFinite(Number(input.targetThroughput)) ||
      Number(input.targetThroughput) <= 0)
  )
    errors.targetThroughput = "Enter a positive target, or leave this blank.";
  return errors;
}
export function referenceForProduct(reference, productId) {
  const selected = String(productId || "").trim();
  return selected && reference?.productId === selected ? reference : null;
}

export function inquiryPayload(input, requestId, reference = null) {
  const payload = { requestId };
  for (const k of [
    "productId",
    "name",
    "company",
    "email",
    "phone",
    "application",
    "bagDimensions",
    "targetThroughput",
    "loadingMethod",
    "message",
  ])
    if (input[k] != null && String(input[k]).trim())
      payload[k] = String(input[k]).trim();
  const matchingReference = referenceForProduct(reference, payload.productId);
  if (matchingReference) {
    payload.reference = JSON.parse(JSON.stringify(matchingReference));
    // A capture already contains its thumbnail; do not transmit it a second time.
    if (
      payload.reference.inspection?.preview?.dataUrl ===
      payload.reference.preview
    )
      delete payload.reference.preview;
  }
  return payload;
}
export const escapeHTML = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function routeFromHash(hash) {
  const [raw, query = ""] = hash.replace(/^#\/?/, "").split("?");
  return {
    parts: raw.split("/").filter(Boolean),
    params: new URLSearchParams(query),
  };
}
