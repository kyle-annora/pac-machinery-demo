import { escapeHTML, inquiryPayload, solutions } from "./model.js";

export const loadingMethods = ["By hand", "Feeder or conveyor", "Integrated line"];

export function inquirySelectOptions(options, selected = "") {
  return options.map(({ value, label }) => `<option value="${escapeHTML(value)}"${value === selected ? " selected" : ""}>${escapeHTML(label)}</option>`).join("");
}

export function solutionContext(solutionId) {
  return solutions.find((solution) => solution.id === solutionId) || null;
}

export function productPath(productId, solutionId = "", view = "products") {
  const context = solutionContext(solutionId);
  return `#/${view}/${encodeURIComponent(productId)}${context ? `?solution=${context.id}` : ""}`;
}

export function inquiryPath(productId = "", solutionId = "", question = "") {
  const params = new URLSearchParams();
  if (productId) params.set("product", productId);
  const context = solutionContext(solutionId);
  if (context) params.set("solution", context.id);
  if (question) params.set("question", question);
  if (!productId && !context && !question) params.set("entry", "global");
  return `#/inquiry${params.size ? `?${params}` : ""}`;
}

export function hasInquiryDraft(fields, reference = null) {
  return Boolean(reference || Object.values(fields || {}).some((value) => String(value || "").trim()));
}

// Navigation must not silently repurpose an application written for another
// machine. The browser UI offers a choice before any seed or reference applies.
export function inquiryEntryNeedsChoice(fields, params, reference = null) {
  if (!hasInquiryDraft(fields, reference)) return false;
  return params.get("entry") === "global"
    || (!params.has("product") && Boolean(solutionContext(params.get("solution"))))
    || (params.has("product") && params.get("product") !== (fields.productId || ""));
}

export function archiveInquiryDraft(archive, current) {
  if (!hasInquiryDraft(current.fields, current.reference)) return [...archive];
  return [...archive.filter((item) => item.requestId !== current.requestId), structuredClone(current)];
}

// Apply an intentional entry link once. The view then removes these seed
// parameters so a reload or a reference removal cannot overwrite edited text.
export function prefillInquiry(fields, params, products) {
  const next = { ...fields };
  if (params.has("product")) {
    const selected = products.find((p) => p.id === params.get("product"));
    next.productId = selected?.id || "";
  }
  const context = solutionContext(params.get("solution"));
  // Product/Explorer links may revisit the same draft. Keep the buyer's own
  // requirements; only replace an empty description or a previous starter.
  const isStarter = !String(next.application || "").trim()
    || solutions.some((solution) => next.application === `${solution.name} packaging`);
  if (context && isStarter) next.application = `${context.name} packaging`;
  if (params.has("application")) next.application = params.get("application").slice(0, 6000);
  if (params.has("question")) next.message = params.get("question").slice(0, 2000);
  return next;
}

export function inquirySnapshot(fields, reference = null) {
  const { requestId, ...snapshot } = inquiryPayload(fields, "", reference);
  return snapshot;
}

export function inquiryReceiptText(receipt, snapshot, equipmentName) {
  const rows = [
    "PAC Machinery — inquiry record",
    `Reference: ${receipt.reference || receipt.id}`,
    `Received: ${receipt.receivedAt || "Not recorded"}`,
    "Status: Saved in this demonstration. Not emailed to PAC.",
    "",
    `Equipment: ${equipmentName || "Application discussion — equipment to be confirmed"}`,
    ...[
      ["Application", "application"], ["Bag dimensions", "bagDimensions"],
      ["Target bags per minute", "targetThroughput"], ["Loading method", "loadingMethod"],
      ["Name", "name"], ["Company", "company"], ["Email", "email"],
      ["Phone", "phone"], ["Additional details", "message"],
    ].filter(([, key]) => snapshot[key]).map(([label, key]) => `${label}: ${snapshot[key]}`),
  ];
  if (snapshot.reference) {
    rows.push("", `Explorer reference: ${snapshot.reference.title || "Saved view"}`,
      `Reference source: ${snapshot.reference.source || "Product reference"}`,
      `Question: ${snapshot.reference.note || "No additional question"}`,
      "The saved image can be viewed in the website inquiry record.");
  }
  return rows.join("\n");
}
