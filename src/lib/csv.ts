import {
  currentPrice,
  fmt,
  profitOf,
  today,
  type Category,
  type Product,
  type Settings,
  type Vendor,
} from "./store";

/** RFC-4180-ish CSV reader: handles quoted fields, "" escapes, \r\n and \n. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const COLS: Record<string, string[]> = {
  name: ["product", "productname", "name", "item", "itemname"],
  vendor: ["vendor", "supplier", "parties", "party"],
  category: ["category", "cat"],
  stock: ["stock", "qty", "quantity"],
  cost: ["cost", "costprice", "purchase", "purchaseprice", "cp"],
  gst: ["gst", "gstpercent", "tax"],
  sp: ["sp", "sellingprice", "sellprice", "price", "mrp"],
  cp: ["discountedcp", "discountcp", "dcp"],
  unit: ["unit", "uom"],
  emoji: ["icon", "emoji"],
  low: ["lowstock", "lowstockat", "alert", "minimum"],
};

function headerMap(header: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  header.forEach((h, i) => {
    const n = norm(h);
    for (const [key, names] of Object.entries(COLS)) if (names.includes(n) && map[key] === undefined) map[key] = i;
  });
  return map;
}

export interface ImportResult {
  rows: Omit<Product, "id">[];
  problems: string[];
}

/** Turn CSV rows (with a header line) into products. Unknown vendors/categories are reported, not guessed. */
export function csvToProducts(
  raw: string[][],
  s: { vendors: Vendor[]; categories: Category[]; settings: Settings },
): ImportResult {
  const problems: string[] = [];
  if (!raw.length) return { rows: [], problems: ["The file is empty"] };
  const head = headerMap(raw[0]!);
  if (head["name"] === undefined) return { rows: [], problems: ["No product-name column found. Use the template file."] };
  const vBy = new Map(s.vendors.map((v) => [norm(v.name), v]));
  const cBy = new Map(s.categories.map((c) => [norm(c.name), c]));
  const rows: Omit<Product, "id">[] = [];
  raw.slice(1).forEach((r, i) => {
    const get = (k: string) => (head[k] === undefined ? "" : (r[head[k]!] ?? "").trim());
    const name = get("name");
    if (!name) {
      problems.push(`Row ${i + 2}: no product name — skipped`);
      return;
    }
    const vKey = norm(get("vendor"));
    const vendorId = vKey ? (vBy.get(vKey)?.id ?? "") : "";
    if (vKey && !vendorId) problems.push(`Row ${i + 2}: vendor "${get("vendor")}" not found — left blank`);
    const cKey = norm(get("category"));
    const categoryId = cKey ? (cBy.get(cKey)?.id ?? "") : "";
    if (cKey && !categoryId) problems.push(`Row ${i + 2}: category "${get("category")}" not found — left blank`);
    const cost = parseFloat(get("cost"));
    const sp = parseFloat(get("sp"));
    const gstRaw = get("gst");
    const gst = gstRaw === "" ? s.settings.defaultGst : parseFloat(gstRaw);
    const cp = parseFloat(get("cp"));
    const stock = parseFloat(get("stock"));
    const low = parseFloat(get("low"));
    const p: Omit<Product, "id"> = {
      name,
      vendorId,
      categoryId,
      emoji: get("emoji") || "📦",
      unit: get("unit") || "pcs",
      stock: Number.isFinite(stock) && stock >= 0 ? stock : 0,
      lowStockAt: Number.isFinite(low) && low >= 0 ? low : s.settings.lowStockAt,
      history:
        Number.isFinite(cost) && Number.isFinite(sp)
          ? [{ id: `imp-${i}-${Date.now()}`, date: today(), cost, gst: Number.isFinite(gst) ? gst : 0, sp, cp: Number.isFinite(cp) && cp > 0 ? cp : undefined }]
          : [],
    };
    if (!Number.isFinite(cost) || !Number.isFinite(sp)) problems.push(`Row ${i + 2}: "${name}" has no cost/selling price — added without a price`);
    rows.push(p);
  });
  return { rows, problems };
}

export function productsCsv(
  products: Product[],
  vendors: Vendor[],
  categories: Category[],
): string {
  const rows: string[][] = [["Product", "Vendor", "Category", "Stock", "Cost", "GST %", "SP", "CP", "Profit", "Date"]];
  products.forEach((p) => {
    const c = currentPrice(p);
    rows.push([
      p.name,
      vendors.find((v) => v.id === p.vendorId)?.name ?? "",
      categories.find((x) => x.id === p.categoryId)?.name ?? "",
      String(p.stock),
      fmt(c.cost),
      String(c.gst),
      fmt(c.sp),
      c.cp ? fmt(c.cp) : "",
      fmt(profitOf(c)),
      c.date,
    ]);
  });
  return rows.map((r) => r.map((x) => `"${x.replace(/"/g, '""')}"`).join(",")).join("\n");
}

export const CSV_TEMPLATE = `Product,Vendor,Category,Stock,Cost,GST %,SP,CP,Unit,Low stock
Nutella Spread,Om Shiv Marketing,Chocolates,24,180,5,200,,pcs,5
White Bread 400g,Britannia Distributor,Bakery,30,28,0,40,,pcs,8
`;

export function downloadText(name: string, text: string, mime = "text/csv") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = name;
  a.click();
}
