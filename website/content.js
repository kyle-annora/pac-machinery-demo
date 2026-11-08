// Website editorial layer. The source catalog and commercial configuration stay
// unchanged. Facts below are paraphrased from that catalog unless a source URL
// is identified. Official resource destinations checked on 2026-11-08.
export const sources = {
  r3200: "https://www.pacmachinery.com/products/rollbag-r3200-and-r3200xl/",
  fulfillment: "https://www.pacmachinery.com/products/rollbag-r3200-fulfillment-automatic-bagger/",
  conveyor: "https://www.pacmachinery.com/products/rollbag-kit-conveyor-2/",
  vision: "https://www.pacmachinery.com/products/rollbag-vision-counting-system/",
  weigh: "https://www.pacmachinery.com/products/rollbag-weigh-count-sorting-table/",
  r1275med: "https://www.pacmachinery.com/products/rollbag-r1275-med/",
  r3200med: "https://www.pacmachinery.com/products/rollbag-r3200-hs-med-automatic-bagger/",
  magnum: "https://www.pacmachinery.com/products/rollbag-magnum-horizontal-med/",
  medical: "https://www.pacmachinery.com/validatable-medical-sealers/automatic-medical-baggers/",
  range: "https://www.pacmachinery.com/wp-content/uploads/2025-Bag-Wrap-Seal-Brochure-2025-web.pdf",
  support: "https://www.pacmachinery.com/support/tech-support/",
  about: "https://www.pacmachinery.com/about-us/",
  contact: "https://www.pacmachinery.com/contact-us/",
};
const resource = (title, url, scope) => ({ title, url, scope });
const familyResource = resource("R3200 / R3200XL product guide", sources.r3200, "Current PAC family page · videos and datasheet links");
const medicalResource = resource("Medical bagging range", sources.medical, "Current PAC range · confirm the exact configuration");

export const productGuides = {
  r3200: {
    intro: "A floor-standing bagger for pre-opened bags on a roll, with feeding and printing options to suit your packing process.",
    fit: "Flexible manual or integrated product loading",
    material: "Pre-opened bags; poly tubing with optional Bag Maker",
    distinction: "The standard R3200 platform. Compare XL for a wider bag, or Bag Maker for variable bag length from tubing.",
    facts: [["Bag range", "2–16 in wide · 3–32 in long"], ["Loading", "Manual loading or compatible feeding devices"], ["Confirm with PAC", "Product clearance, feed method and printing"]],
    resources: [familyResource],
  },
  r3200_bag_maker: {
    intro: "An R3200 configured to make bags from poly tubing. Set the bag length to suit the product instead of relying only on pre-made bag lengths.",
    fit: "Variable bag length from poly tubing",
    material: "Poly tubing",
    distinction: "Bag making adds a tubing process to the R3200 platform. The supplied configuration lists up to 40 bags/min, subject to the product and bag setup.",
    facts: [["Bag range", "2–16 in wide · 3–32 in long"], ["Process", "Form a bag from tubing, then load and seal"], ["Confirm with PAC", "Material, bag length and changeover needs"]],
    resources: [resource("R3200 Bag Maker and tubing demonstrations", sources.r3200, "Family page · includes tubing videos; configurations vary")],
  },
  r3200_fulfillment: {
    intro: "A bagging and labeling setup for order fulfillment. Discuss your product mix, label format and bag length together before choosing the configuration.",
    fit: "Order fulfillment with shipping labels",
    material: "Pre-made bags; optional poly tubing",
    distinction: "Focuses on the order-and-label workflow. Optional tubing allows bag length changes; the exact label, bag and discharge setup needs application review.",
    facts: [["Bag width", "Up to 16 in in this catalog configuration"], ["Labeling", "Sato label printer · label format to confirm"], ["Confirm with PAC", "Order data, product range and discharge"]],
    resources: [resource("R3200 Fulfillment videos and literature", sources.fulfillment, "Current PAC product family · videos and datasheet links")],
  },
  r3200_hs_hybrid: {
    intro: "One R3200 platform for pre-opened bags and poly tubing, with a high-speed bag maker assembly for the tubing workflow.",
    fit: "Switching between pre-opened bags and tubing",
    material: "Pre-opened bags and poly tubing",
    distinction: "The catalog describes two operating modes: up to 80 bags/min with pre-opened bags and up to 40 with tubing. Actual output depends on loading and the bag setup.",
    facts: [["Bag range", "2–16 in wide · 3–32 in long"], ["Two modes", "Pre-opened bags or high-speed bag making"], ["Confirm with PAC", "Mode changes, materials and target output"]],
    resources: [resource("R3200 family materials and equipment", sources.r3200, "Family reference · ask PAC to confirm the HS Hybrid configuration")],
  },
  r3200xl: {
    intro: "The wider R3200 platform for larger packages. Start with the maximum product and bag dimensions, then confirm the loading and printing setup.",
    fit: "Larger products and wider bags",
    material: "Pre-opened bags; optional poly tubing",
    distinction: "The catalog's 22 in maximum bag width and 36 in maximum length extend beyond the standard R3200's 16 × 32 in bag range.",
    facts: [["Maximum bag", "22 in wide × 36 in long"], ["Clearance", "Seal bar opening up to 10 in in this catalog"], ["Confirm with PAC", "Product depth, footprint and bag support"]],
    resources: [familyResource],
  },
  kit_conveyor: {
    intro: "Bring counted parts or kits to a Rollbag bagger on a cleated infeed conveyor. Choose how the conveyor is paced around the operator's work.",
    fit: "Manual kit assembly and paced feeding",
    material: "Infeed device for a compatible Rollbag bagger",
    distinction: "This is a feeding accessory, not a standalone bagger. PAC documents manual, paced and counting modes for different loading routines.",
    facts: [["Operating modes", "Manual · paced · counting"], ["Work surface", "Stainless steel table with adjustable height"], ["Confirm with PAC", "Kit contents, conveyor timing and funnel size"]],
    benefits: [{ name: "Choose the feeding mode", items: ["Manual: cycle the conveyor with a footswitch.", "Paced: feed product continuously at the selected pace.", "Counting: a photo eye triggers the bagger at the preset count."] }],
    resources: [resource("Kit Conveyor demonstration and details", sources.conveyor, "PAC product page · operating modes and video")],
  },
  r1275_vision: {
    intro: "Count small parts with a vision counter and feed them into an R1275 bagger. Review representative parts and the required count per bag with PAC.",
    fit: "Bulk counting into smaller bags",
    material: "Pre-opened bags on a roll",
    distinction: "The R1275 setup lists a 10 in maximum bag width. Compare R3200 Vision for wider bags and the option to use poly tubing.",
    facts: [["Bag range", "2–10 in wide · 3–20 in long"], ["Catalog part range", "0.25–1 in · sample testing required"], ["Confirm with PAC", "Part shape, counting behavior and batch size"]],
    resources: [resource("Vision Counting System", sources.vision, "PAC system overview · confirm the bagger pairing")],
  },
  r3200_vision: {
    intro: "Pair small-part vision counting with the larger R3200 bag range. Optional bag making adds a poly-tubing workflow.",
    fit: "Bulk counting into wider or longer bags",
    material: "Pre-opened bags; optional poly tubing",
    distinction: "Compared with R1275 Vision, this catalog setup increases maximum bag width from 10 to 16 in and maximum length from 20 to 32 in.",
    facts: [["Bag range", "2–16 in wide · 3–32 in long"], ["Catalog part range", "0.25–1 in · sample testing required"], ["Confirm with PAC", "Counter integration and optional bag making"]],
    resources: [resource("Vision Counting System", sources.vision, "PAC system overview · confirm the bagger pairing"), familyResource],
  },
  weigh_count_sorting_table: {
    intro: "Set a sample piece weight and target count, then dispense the batch into an R3200 bagger when the target is reached.",
    fit: "Batch counting by piece weight",
    material: "Infeed device for the R3200",
    distinction: "Counts by weight rather than a vision image. Discuss variation in piece weight and the required counting tolerance before selecting the method.",
    facts: [["Weighing resolution", "0.003 oz / 0.1 g"], ["Maximum bucket weight", "6.6 lb / 3 kg"], ["Confirm with PAC", "Piece-weight variation and batch tolerance"]],
    resources: [resource("Weigh Count Sorting Table", sources.weigh, "PAC product page · operation and equipment details")],
  },
  magnum_horizontal_med: {
    intro: "A medical pouch-making system with sealing-parameter validation ports. Review material, pouch style and product handling as one process.",
    fit: "Medical pouch making from rollstock",
    material: "Poly tubing, Tyvek/poly and compatible medical materials",
    distinction: "The catalog includes straight sealing and an optional chevron seal. Material and seal format change the applicable bag range and operating conditions.",
    facts: [["Catalog bag width", "2–15 in · 12 in with optional chevron seal"], ["Validation", "External ports for sealing-parameter checks"], ["Confirm with PAC", "Material, seal format and validation protocol"]],
    resources: [resource("Magnum Horizontal Med", sources.magnum, "Current PAC model · confirm differences from the catalog configuration"), medicalResource],
  },
  r1275_med: {
    intro: "A compact medical bagger for pre-opened bags on a roll, with validation ports for checking sealing parameters.",
    fit: "Compact medical bagging",
    material: "Pre-opened bags on a roll",
    distinction: "Compare this compact setup with R1285 Med when next-bag-out printing or bags wider than 10 in are part of the requirement.",
    facts: [["Bag range", "2–10 in wide · 3–20 in long"], ["Feeding", "Manual or automated feeding modes"], ["Confirm with PAC", "Printing, loading and sealing validation"]],
    resources: [resource("R1275 Med literature and details", sources.r1275med, "Current PAC product page · datasheet links")],
  },
  r1285_med: {
    intro: "Medical bagging with next-bag-out printing. A 4 in thermal transfer printer prepares the print for the next bag in the sequence.",
    fit: "Medical bagging with next-bag-out printing",
    material: "Pre-opened bags on a roll",
    distinction: "Compared with R1275 Med, the catalog describes integrated next-bag-out printing and a wider 12 in maximum bag width.",
    facts: [["Bag range", "2–12 in wide · 4–20 in long"], ["Printing", "4 in thermal transfer · 203 dpi"], ["Confirm with PAC", "Print data, bag format and sealing validation"]],
    resources: [resource("PAC equipment and medical bagging brochure", sources.range, "PAC range brochure (PDF) · includes R1285 Med"), medicalResource],
  },
  r3200_hs_med: {
    intro: "A medical pouching configuration for Tyvek/poly rollstock with a pre-made chevron bottom seal, combining printing, loading and top sealing.",
    fit: "Medical pouching with printing and top sealing",
    material: "Tyvek/poly rollstock with a pre-made bottom seal",
    distinction: "This catalog configuration describes an 8 mm top seal and an estimated 15 bags/min. PAC's current HS Med model may differ; confirm the exact proposed configuration.",
    facts: [["Bag range", "2–14 in wide · 3–32 in long"], ["Process", "Print · open for loading · top seal · separate"], ["Confirm with PAC", "Rollstock, seal geometry and validation"]],
    resources: [resource("Current R3200 HS Med details", sources.r3200med, "Current model reference · specifications differ from this catalog configuration"), medicalResource],
  },
};

export function cleanCatalogCopy(value) {
  return String(value || "").replace(/Bag Thicnkness/g, "Bag Thickness")
    .replace(/finisehd/g, "finished").replace(/has bee reached/g, "has been reached")
    .replace(/seamlessly integrates to/g, "integrate with").replace(/R1285 Med Bagge\b/g, "R1285 Med bagger")
    .replace(/up 40 bags/g, "up to 40 bags").replace(/login-in/g, "login")
    .replace(/an elite poly bagging fulfillment systems/g, "a poly bagging fulfillment system");
}

export function enrichProducts(products) {
  return products.map((p) => {
    const guide = productGuides[p.id];
    const specs = p.specs.map((s) => ({ name: cleanCatalogCopy(s.name), value: cleanCatalogCopy(s.value) }))
      .filter((s) => !(s.name === s.value && s.name === "Stainless steel adjustable height sorting table"))
      .map((s) => s.name === "120V 15A Electrical" ? { name: "Electrical", value: "120V, 15A" } : s);
    return { ...p, ...guide, description: guide?.intro || cleanCatalogCopy(p.description), specs,
      benefits: (guide?.benefits || p.benefits).map((b) => ({ ...b, items: b.items.map(cleanCatalogCopy) })),
      options: p.options.map((o) => ({ ...o, description: cleanCatalogCopy(o.description), name: cleanCatalogCopy(o.name) })),
    };
  });
}

export function optionSummary(option) {
  const text = cleanCatalogCopy(option.description);
  const sentence = text.match(/^.{30,240}?[.!?](?:\s|$)/)?.[0]?.trim();
  return sentence || (text.length <= 240 ? text : `${text.slice(0, 237).replace(/\s+\S*$/, "")}…`);
}

export function explorerTopics(p) {
  return [
    ...(p.photos.length ? p.photos : [null]).map((photo, index) => ({ id: `photo-${index}`, name: index ? `Equipment view ${index + 1}` : "Machine overview", description: p.description, photo, note: photo ? p.photoNote : "Equipment photograph unavailable. Discuss the current configuration with PAC." })),
    ...p.options.filter((option) => option.photo).map((option) => ({ ...option, description: optionSummary(option), note: option.applicability })),
  ];
}

export const solutionGuides = {
  parts: {
    lead: "Choose how to build the batch before choosing how to close the bag.",
    stages: [["Prepare the batch", "Are operators building a mixed kit, or counting one type of part?"], ["Feed the bag", "Check how the batch moves from the work surface or counter into the open bag."], ["Seal and identify", "Confirm the bag size, weight support and any printed information."]],
    choices: [
      ["Mixed kits assembled by an operator", "kit_conveyor", "Pace the loading routine with a conveyor; discuss manual, paced or counting mode."],
      ["Many small parts of one type", "r1275_vision", "Review a vision-counting sample. Compare R3200 Vision if you need wider bags."],
      ["A repeatable piece weight", "weigh_count_sorting_table", "Review weight-based counting and the allowed variation between individual parts."],
    ],
    proof: resource("See PAC infeed systems", "https://www.pacmachinery.com/rollbag-auto-baggers/infeed-systems-for-automatic-baggers/", "Official PAC feeding and counting range"),
  },
  fulfillment: {
    lead: "Match the package, label and loading routine to the orders you actually ship.",
    stages: [["Identify the order", "Prepare the required shipping label and confirm how its data reaches the packing station."], ["Load and size", "Check your smallest and largest products, then choose pre-made bags or tubing."], ["Seal and discharge", "Allow for the finished package, operator reach and the next station."]],
    choices: [
      ["Shipping labels and changing orders", "r3200_fulfillment", "Start with the fulfillment configuration and test the actual label format and product mix."],
      ["Both pre-opened bags and tubing", "r3200_hs_hybrid", "Compare the two modes around loading pace, material changes and desired bag length."],
      ["Bags wider than the standard R3200 range", "r3200xl", "Check the larger bag envelope and product clearance before discussing feeding options."],
    ],
    proof: resource("PAC fulfillment demonstrations", sources.fulfillment, "Official product family · videos and literature"),
  },
  medical: {
    lead: "Start with the packaging material and validation process, then compare handling and printing.",
    stages: [["Define the package", "Identify the material, pouch dimensions, seal format and intended sterilization process."], ["Define the controls", "Review sealing parameters, validation procedures and required records with your team."], ["Test the workflow", "Run representative products and print data through the proposed loading and sealing setup."]],
    choices: [
      ["Compact bagging with pre-opened bags", "r1275_med", "Start with the R1275 Med bag range and discuss loading and printing options."],
      ["Next-bag-out printing", "r1285_med", "Review the R1285 Med printer, print data and wider bag range."],
      ["Pouch making from medical rollstock", "magnum_horizontal_med", "Compare the rollstock and seal format with R3200 Med; confirm the exact medical configuration."],
    ],
    proof: medicalResource,
  },
};
