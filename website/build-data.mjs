import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { projectCatalog } from "./model.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = async (name) =>
  JSON.parse(
    await fs.readFile(
      path.join(root, "data/catalog/catalog", name + ".json"),
      "utf8",
    ),
  );
const data = projectCatalog({
  machines: await read("machines"),
  media: await read("media"),
  narratives: await read("narratives"),
  priceLines: await read("price_lines"),
});
await fs.writeFile(
  path.join(root, "website/data/products.json"),
  JSON.stringify(data, null, 2) + "\n",
);
console.log(`Projected ${data.products.length} public products.`);
