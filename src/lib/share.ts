import { currentPrice, fmt, fmtDate, profitOf, today, type Category, type Product, type Vendor } from "./store";

/** Plain-text price list for WhatsApp sharing. */
export function priceListText(
  storeName: string,
  products: Product[],
  vendors: Vendor[],
  categories: Category[],
  categoryId = "",
): string {
  const list = products
    .filter((p) => !categoryId || p.categoryId === categoryId)
    .sort((a, b) => a.name.localeCompare(b.name));
  const cat = categories.find((c) => c.id === categoryId);
  const lines = [`*${storeName} — Price List*`, `${cat ? cat.name + " · " : ""}${fmtDate(today())}`, ""];
  for (const p of list) {
    const c = currentPrice(p);
    lines.push(`${p.name} — ₹${fmt(c.sp)}${c.gst ? ` (GST ${c.gst}%)` : ""}${p.stock <= p.lowStockAt ? ` · only ${p.stock} left` : ""}`);
  }
  lines.push("", `${list.length} items`);
  return lines.join("\n");
}

export const waUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

/** Printable price list (opens a print dialog). */
export function printPriceList(
  storeName: string,
  products: Product[],
  vendors: Vendor[],
  categories: Category[],
  categoryId = "",
) {
  const list = products.filter((p) => !categoryId || p.categoryId === categoryId).sort((a, b) => a.name.localeCompare(b.name));
  const cat = categories.find((c) => c.id === categoryId);
  const rows = list
    .map((p) => {
      const c = currentPrice(p);
      return `<tr><td>${p.name}</td><td>${vendors.find((v) => v.id === p.vendorId)?.name ?? "—"}</td><td class="n">${fmt(c.cost)}</td><td class="n">${c.gst}%</td><td class="n">${fmt(c.sp)}</td><td class="n">${fmt(profitOf(c))}</td></tr>`;
    })
    .join("");
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return false;
  w.document.write(`<!doctype html><html><head><title>${storeName} — Price List</title><style>
    body{font-family:Arial,Helvetica,sans-serif;margin:28px;color:#111}
    h1{margin:0 0 4px;font-size:22px}
    .sub{color:#555;margin-bottom:18px;font-size:13px}
    table{border-collapse:collapse;width:100%}
    th,td{border-bottom:1px solid #ddd;padding:7px 9px;font-size:13px;text-align:left}
    th{background:#f2f2f2;text-transform:uppercase;font-size:11px;letter-spacing:.04em}
    td.n,th.n{text-align:right}
    @media print{.noprint{display:none}}
  </style></head><body>
    <h1>${storeName} — Price List</h1>
    <div class="sub">${cat ? cat.name + " · " : ""}${fmtDate(today())} · ${list.length} items</div>
    <table><thead><tr><th>Product</th><th>Vendor</th><th class="n">Cost ₹</th><th class="n">GST</th><th class="n">SP ₹</th><th class="n">Profit ₹</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6">No products</td></tr>'}</tbody></table>
    <script>setTimeout(function(){window.print()},350)</script>
  </body></html>`);
  w.document.close();
  return true;
}
