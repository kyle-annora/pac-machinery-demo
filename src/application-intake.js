/** Conservative, local extraction from customer text. This is not a model call.
 * Nothing is applied to a deal until the seller reviews and selects the fields.
 */
const LIMIT = 20000;
const KEYS = ["application", "bag_dimensions", "throughput"];
const LABELS = {
  application: "Application",
  bag_dimensions: "Requested bag dimensions",
  throughput: "Target throughput",
};
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const copy = (value) => JSON.parse(JSON.stringify(value));
const unique = (values) => [
  ...new Map(
    values.map((value) => [
      value.value.toLowerCase().replace(/\s+/g, " ").trim(),
      value,
    ]),
  ).values(),
];

function suggestion(candidates, question) {
  const values = unique(candidates);
  const certain = values.length === 1 && !values[0].uncertain;
  return {
    status: !values.length
      ? "missing"
      : certain
        ? "suggested"
        : "needs_confirmation",
    value: certain ? values[0].value : "",
    snippets: values.map(({ text, start, end }) => ({ text, start, end })),
    question: certain ? null : question,
  };
}

export function parseApplicationIntake(source) {
  if (typeof source !== "string")
    throw new TypeError("Paste customer text before extracting suggestions.");
  if (source.length > LIMIT)
    throw new RangeError(
      "Keep the customer message under 20,000 characters. Your text has been retained.",
    );
  if (!source.trim())
    throw new TypeError("Paste a customer email or application note first.");
  const lines = [...source.matchAll(/[^\r\n]+/g)].map((match) => ({
    text: match[0].trim(),
    start: match.index + match[0].indexOf(match[0].trim()),
    end: match.index + match[0].trimEnd().length,
  }));
  const candidates = { application: [], bag_dimensions: [], throughput: [] };
  const add = (field, value, line, uncertain = false) =>
    candidates[field].push({ value: value.trim(), ...line, uncertain });
  const number = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)`;
  const unit = String.raw`(?:inches|inch|in\b|mm\b|cm\b|millimeters?\b|centimeters?\b|["″])`;
  const dimensions = new RegExp(
    String.raw`${number}\s*(?:${unit})?\s*[x×]\s*${number}(?:\s*[x×]\s*${number})?\s*(?:${unit})?`,
    "gi",
  );
  const throughput =
    /(?:at least\s+|about\s+|approximately\s+|around\s+)?\d+(?:\.\d+)?(?:\s*(?:[-–]|to)\s*\d+(?:\.\d+)?)?\s*bags?\s*(?:\/|per\s+)\s*(?:minutes?|mins?\b|hours?|hrs?\b|seconds?|secs?\b)/gi;
  const bpm =
    /(?:at least\s+|about\s+|approximately\s+|around\s+)?\d+(?:\.\d+)?(?:\s*(?:[-–]|to)\s*\d+(?:\.\d+)?)?\s*bpm\b/gi;
  const legacy =
    /\b(?:not|no longer|old|previous(?:ly)?|currently|current|used to|example|rated|capacity|brochure|catalog|maximum|max|up to)\b/i;
  let explicitApplication = false;
  for (const line of lines) {
    const explicit = line.text.match(
      /^(?:application|products?(?: to (?:pack|package|bag))?|packaging application)\s*:\s*(.+)$/i,
    );
    if (explicit) {
      add("application", explicit[1], line);
      explicitApplication = true;
    }
    if (/\bbags?\b|\bbag\s*(?:size|dimensions?)\b/i.test(line.text)) {
      for (const match of line.text.matchAll(dimensions)) {
        const hasUnit = new RegExp(unit, "i").test(match[0]);
        const before = line.text.slice(
          Math.max(0, match.index - 10),
          match.index,
        );
        const negative = /[-−,\d.]\s*$/.test(before);
        const zero = match[0]
          .match(/\d+(?:\.\d+)?/g)
          ?.some((n) => Number(n) === 0);
        add(
          "bag_dimensions",
          match[0],
          line,
          !hasUnit || negative || zero || legacy.test(line.text),
        );
      }
    }
    for (const match of line.text.matchAll(throughput)) {
      const before = line.text.slice(Math.max(0, match.index - 4), match.index);
      add(
        "throughput",
        match[0],
        line,
        legacy.test(line.text) ||
          /[-−,\d.]\s*$/.test(before) ||
          Number(match[0].match(/\d+(?:\.\d+)?/)?.[0]) <= 0,
      );
    }
    if (/\b(?:bag|bags|throughput|output|target|rate)\b/i.test(line.text))
      for (const match of line.text.matchAll(bpm)) {
        const before = line.text.slice(
          Math.max(0, match.index - 4),
          match.index,
        );
        add(
          "throughput",
          match[0],
          line,
          legacy.test(line.text) ||
            /[-−,\d.]\s*$/.test(before) ||
            Number(match[0].match(/\d+(?:\.\d+)?/)?.[0]) <= 0,
        );
      }
  }
  if (!explicitApplication)
    for (const line of lines) {
      if (/^(?:subject|from|to|date|sent)\s*:/i.test(line.text)) continue;
      const sentences = line.text.split(/(?<=[.!?])\s+(?=[A-Z])/);
      for (const sentence of sentences) {
        if (
          /\bwe\s+(?:(?:need|want|plan|would like|are looking)\b[^.!?]{0,100}\b(?:pack|package|bag|packaging|bagging)\b|(?:are\s+)?(?:packaging|packing|bagging|package|pack)\b)/i.test(
            sentence,
          ) &&
          !/\b(?:not|do not|don't)\b/i.test(sentence)
        ) {
          const offset = line.text.indexOf(sentence);
          add("application", sentence, {
            text: sentence,
            start: line.start + offset,
            end: line.start + offset + sentence.length,
          });
        }
      }
    }
  const suggestions = {
    application: suggestion(
      candidates.application,
      "Confirm what the customer is packaging and the outcome they need.",
    ),
    bag_dimensions: suggestion(
      candidates.bag_dimensions,
      candidates.bag_dimensions.length
        ? "Confirm the requested bag size and units; the source is ambiguous or describes another condition."
        : "What bag dimensions and units are required?",
    ),
    throughput: suggestion(
      candidates.throughput,
      candidates.throughput.length
        ? "Confirm the target throughput; separate the requested rate from current output or equipment capacity."
        : "What target throughput and time unit does the customer need?",
    ),
  };
  const questions = KEYS.filter((key) => suggestions[key].question).map(
    (field) => ({ field, text: suggestions[field].question }),
  );
  if (
    !/\b(?:polyethylene|polypropylene|poly|ldpe|hdpe|film|paper|tyvek|bag material|material\s*:)\b/i.test(
      source,
    )
  )
    questions.push({
      field: "material",
      text: "Which bag material will be used?",
    });
  if (
    !/\b(?:manual(?:ly)?|by hand|hand[- ]load|conveyor|feeder|automatic loading|robot)\b/i.test(
      source,
    )
  )
    questions.push({
      field: "loading",
      text: "How will products be presented and loaded?",
    });
  return { source, suggestions, questions };
}

export function selectedIntakeScope(values, selected) {
  const scope = {};
  for (const field of KEYS)
    if (selected[field]) {
      const value = String(values[field] ?? "").trim();
      if (!value)
        throw new TypeError(
          `Enter ${LABELS[field].toLowerCase()}, or deselect that field.`,
        );
      if (value.length > 6000)
        throw new RangeError(
          `${LABELS[field]} must be under 6,000 characters.`,
        );
      scope[field] = value;
    }
  if (!Object.keys(scope).length)
    throw new TypeError("Select at least one reviewed field to apply.");
  return scope;
}

export const intakeStorageKey = (dealId) =>
  `pac.application-intake.v1.${encodeURIComponent(String(dealId))}`;

export function renderIntake({ deal }) {
  return `<section class="sales-panel application-intake" data-application-intake="${escape(deal.id)}" aria-labelledby="application-intake-heading"><div class="sales-sectionhead"><div><h2 id="application-intake-heading">Start from the customer’s words</h2><p>Extract application requirements from an email, then review them before updating this deal.</p></div></div><label class="intake-source-label" for="intake-source">Customer email or application note</label><textarea id="intake-source" data-intake-source rows="7" maxlength="20000" placeholder="Paste the customer’s message here. Include the product, bag dimensions and required output when available."></textarea><div class="sales-actions intake-source-actions"><button type="button" class="secondary" data-intake-extract>Extract suggestions</button><span class="fine-print">Text-based extraction · Nothing is applied automatically</span></div><p data-intake-status class="fine-print" role="status" aria-live="polite"></p><div data-intake-preview hidden></div></section>`;
}

function previewHTML(result, values, selected, scope) {
  return `<div class="intake-review-heading"><h3>Review the proposed changes</h3><p class="fine-print">Edit the values and select the fields to apply. Unselected fields keep their current values.</p></div><fieldset class="intake-review-fields"><legend class="sr-only">Application suggestions</legend>${KEYS.map(
    (field) => {
      const suggestion = result.suggestions[field];
      return `<section class="intake-suggestion"><div class="intake-field-heading"><label><input type="checkbox" data-intake-selected="${field}" ${selected[field] ? "checked" : ""}>${LABELS[field]}</label><span class="intake-state">${suggestion.status === "suggested" ? "Found in source" : suggestion.status === "missing" ? "Not found" : "Needs confirmation"}</span></div><label class="sr-only" for="intake-value-${field}">Proposed ${LABELS[field].toLowerCase()}</label>${field === "application" ? `<textarea id="intake-value-${field}" data-intake-value="${field}" rows="3" maxlength="6000">${escape(values[field])}</textarea>` : `<input id="intake-value-${field}" data-intake-value="${field}" value="${escape(values[field])}" maxlength="6000" placeholder="Confirm with the customer">`}<p class="intake-current"><span>Current:</span> ${escape(scope?.[field] || "Not set")}</p>${suggestion.snippets.length ? `<details class="intake-source-evidence" open><summary>Source ${suggestion.snippets.length === 1 ? "excerpt" : "excerpts"}</summary>${suggestion.snippets.map((s) => `<blockquote>${escape(s.text)}</blockquote>`).join("")}</details>` : '<p class="fine-print">No value was inferred for this field.</p>'}</section>`;
    },
  ).join(
    "",
  )}</fieldset>${result.questions.length ? `<div class="intake-questions"><h3>Still to confirm</h3><ul>${result.questions.map((q) => `<li>${escape(q.text)}</li>`).join("")}</ul></div>` : ""}<div class="sales-actions intake-apply-actions"><button type="button" class="primary" data-intake-apply>Apply selected fields</button><p class="fine-print">This updates application scope only. Draft reviews will need to be renewed; issued revisions stay unchanged.</p></div>`;
}

export function mountIntake({ root, deal, onApply, notify = () => {} }) {
  const panel = root?.matches?.("[data-application-intake]")
    ? root
    : root?.querySelector("[data-application-intake]");
  if (!panel || panel.dataset.applicationIntake !== String(deal.id))
    return () => {};
  const source = panel.querySelector("[data-intake-source]");
  const preview = panel.querySelector("[data-intake-preview]");
  const status = panel.querySelector("[data-intake-status]");
  const extract = panel.querySelector("[data-intake-extract]");
  const storageKey = intakeStorageKey(deal.id);
  let disposed = false,
    busy = false,
    result = null;
  let state = { source: "", review: false, values: {}, selected: {} };
  try {
    const saved = JSON.parse(
      globalThis.sessionStorage?.getItem(storageKey) || "null",
    );
    if (
      saved &&
      typeof saved.source === "string" &&
      saved.source.length <= LIMIT
    ) {
      state.source = saved.source;
      state.review = saved.review === true;
      for (const key of KEYS) {
        state.values[key] =
          typeof saved.values?.[key] === "string"
            ? saved.values[key].slice(0, 6000)
            : "";
        state.selected[key] = saved.selected?.[key] === true;
      }
    }
  } catch {}
  source.value = state.source;
  function say(message, error = false) {
    if (!disposed) {
      status.textContent = message;
      status.classList.toggle("intake-error", error);
    }
  }
  function persist() {
    try {
      globalThis.sessionStorage?.setItem(storageKey, JSON.stringify(state));
    } catch {
      say(
        "Your text is retained on this page. Browser draft storage is unavailable.",
        true,
      );
    }
  }
  function showPreview() {
    preview.hidden = false;
    preview.innerHTML = previewHTML(
      result,
      state.values,
      state.selected,
      deal.scope,
    );
  }
  if (state.review && state.source.trim()) {
    try {
      result = parseApplicationIntake(state.source);
      showPreview();
      say(
        "Your unapplied suggestions have been restored. Review them before applying.",
      );
    } catch {
      state.review = false;
    }
  }
  function input(event) {
    if (busy) return;
    if (event.target === source) {
      state.source = source.value;
      state.review = false;
      result = null;
      preview.hidden = true;
      say("Source changed. Extract suggestions when the message is ready.");
    } else if (event.target.matches("[data-intake-value]")) {
      const key = event.target.dataset.intakeValue;
      state.values[key] = event.target.value;
      state.selected[key] = true;
      preview.querySelector(`[data-intake-selected="${key}"]`).checked = true;
    } else if (event.target.matches("[data-intake-selected]"))
      state.selected[event.target.dataset.intakeSelected] =
        event.target.checked;
    persist();
  }
  async function click(event) {
    const button = event.target.closest("button");
    if (!button || !panel.contains(button) || busy) return;
    if (button.matches("[data-intake-extract]")) {
      try {
        state.source = source.value;
        result = parseApplicationIntake(state.source);
        state.values = Object.fromEntries(
          KEYS.map((key) => [key, result.suggestions[key].value]),
        );
        state.selected = Object.fromEntries(
          KEYS.map((key) => [
            key,
            result.suggestions[key].status === "suggested",
          ]),
        );
        state.review = true;
        showPreview();
        persist();
        const count = Object.values(state.selected).filter(Boolean).length;
        say(
          `${count} ${count === 1 ? "field is" : "fields are"} ready to review. Check the source excerpts before applying.`,
        );
        preview.querySelector("[data-intake-value]")?.focus();
      } catch (error) {
        say(error.message, true);
        persist();
        source.focus();
      }
    }
    if (button.matches("[data-intake-apply]")) {
      try {
        if (!result || !state.review)
          throw new Error("Extract suggestions from the current source first.");
        const scope = selectedIntakeScope(state.values, state.selected);
        if (typeof onApply !== "function")
          throw new Error(
            "Application updates are unavailable. Your source and suggestions have been retained.",
          );
        busy = true;
        source.disabled = true;
        extract.disabled = true;
        preview.querySelector("fieldset").disabled = true;
        button.disabled = true;
        button.textContent = "Applying…";
        persist();
        const applied = await onApply(copy(scope), {
          source: state.source,
          suggestions: copy(result.suggestions),
        });
        if (applied === false)
          throw new Error(
            "The application could not be updated. Your source and suggestions are retained.",
          );
        state.review = false;
        persist();
        if (disposed) return;
        deal = { ...deal, scope: { ...deal.scope, ...scope } };
        preview.hidden = true;
        say(
          "Selected application fields were applied. Review the quote again against the updated scope.",
        );
        notify("Application scope updated from the reviewed customer message.");
      } catch (error) {
        if (!disposed) {
          say(
            error.message ||
              "The application could not be updated. Your source and suggestions are retained.",
            true,
          );
          notify(error.message || "Application update failed.");
        }
      } finally {
        busy = false;
        if (!disposed) {
          source.disabled = false;
          extract.disabled = false;
          const fields = preview.querySelector("fieldset");
          if (fields) fields.disabled = false;
          button.disabled = false;
          button.textContent = "Apply selected fields";
        }
      }
    }
  }
  panel.addEventListener("input", input);
  panel.addEventListener("change", input);
  panel.addEventListener("click", click);
  return () => {
    disposed = true;
    panel.removeEventListener("input", input);
    panel.removeEventListener("change", input);
    panel.removeEventListener("click", click);
  };
}
