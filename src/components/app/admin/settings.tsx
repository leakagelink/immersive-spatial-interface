import { useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, Printer, RotateCcw, Send, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Field, GST_RATES, inputCls } from "../forms";
import { FilterPills, GhostButton, PrimaryButton } from "../ui3d";
import { today, useStore } from "@/lib/store";
import { CSV_TEMPLATE, csvToProducts, downloadText, parseCsv, productsCsv } from "@/lib/csv";
import { priceListText, printPriceList, waUrl } from "@/lib/share";
import { Section } from "./parts";

export function SettingsAdmin() {
  const { storeName, setStoreName, settings, setSettings, importData, resetDemo, clearAll, importProducts, products, vendors, categories } = useStore();
  const [n, setN] = useState(storeName);
  const [low, setLow] = useState(String(settings.lowStockAt));
  const [gst, setGst] = useState(String(settings.defaultGst));
  const [cat, setCat] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const backupRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const text = useMemo(() => priceListText(storeName, products, vendors, categories, cat), [storeName, products, vendors, categories, cat]);

  const exportData = () => {
    const s = useStore.getState();
    downloadText(`rj-store-backup-${today()}.json`, JSON.stringify({ storeName: s.storeName, settings: s.settings, categories: s.categories, vendors: s.vendors, products: s.products, entries: s.entries, bills: s.bills }, null, 2), "application/json");
    toast.success("Backup downloaded");
  };

  const onImport = async (f?: File) => {
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.products) || !Array.isArray(d.vendors) || !Array.isArray(d.categories)) throw new Error();
      importData(d);
      toast.success("Backup restored");
    } catch {
      toast.error("That file isn't a valid backup");
    }
  };

  const onCsv = async (f?: File) => {
    if (!f) return;
    const out = csvToProducts(parseCsv(await f.text()), { vendors, categories, settings });
    setProblems(out.problems);
    if (!out.rows.length) {
      toast.error("No products could be read from that file");
      return;
    }
    const added = importProducts(out.rows);
    toast.success(`${added} products imported`);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Store details">
        <Field label="Store name">
          <input className={inputCls} value={n} onChange={(e) => setN(e.target.value)} />
        </Field>
        <PrimaryButton
          onClick={() => {
            if (!n.trim()) {
              toast.error("Name required");
              return;
            }
            setStoreName(n.trim());
            toast.success("Saved");
          }}
        >
          Save
        </PrimaryButton>
      </Section>

      <Section title="Shop settings" hint="Defaults used when you add a new product.">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Default GST %">
            <select className={inputCls} value={gst} onChange={(e) => setGst(e.target.value)}>
              {GST_RATES.map((g) => (
                <option key={g} value={g} className="bg-popover">
                  {g}%
                </option>
              ))}
            </select>
          </Field>
          <Field label="Low-stock alert at">
            <input className={inputCls} type="number" min="0" value={low} onChange={(e) => setLow(e.target.value)} />
          </Field>
        </div>
        <Field label="Profit formula" hint="How profit is worked out on every screen.">
          <FilterPills
            value={settings.profitBase}
            onChange={(v) => setSettings({ profitBase: v })}
            options={[
              { value: "cp", label: "Use discounted CP when set" },
              { value: "cost", label: "Always SP − Cost" },
            ]}
          />
        </Field>
        <PrimaryButton
          onClick={() => {
            const l = parseFloat(low);
            if (!Number.isFinite(l) || l < 0) {
              toast.error("Enter a valid low-stock limit");
              return;
            }
            setSettings({ lowStockAt: Math.floor(l), defaultGst: parseFloat(gst) || 0 });
            toast.success("Settings saved");
          }}
        >
          Save settings
        </PrimaryButton>
      </Section>

      <Section title="Backup & export" hint="Your data lives on this device. Keep a backup file somewhere safe.">
        <div className="grid grid-cols-2 gap-2">
          <GhostButton onClick={exportData}>
            <Download className="h-4 w-4 text-primary" />
            Backup (JSON)
          </GhostButton>
          <GhostButton onClick={() => backupRef.current?.click()}>
            <Upload className="h-4 w-4 text-accent" />
            Restore
          </GhostButton>
          <GhostButton
            onClick={() => {
              downloadText(`rj-store-products-${today()}.csv`, productsCsv(products, vendors, categories));
              toast.success("Excel/CSV file downloaded");
            }}
          >
            <Download className="h-4 w-4 text-sp" />
            Products (Excel/CSV)
          </GhostButton>
          <GhostButton
            onClick={() => {
              downloadText("rj-store-import-template.csv", CSV_TEMPLATE);
              toast.success("Template downloaded");
            }}
          >
            <FileSpreadsheet className="h-4 w-4 text-cp" />
            Import template
          </GhostButton>
        </div>
        <input ref={backupRef} type="file" accept="application/json" hidden onChange={(e) => { onImport(e.target.files?.[0]); e.target.value = ""; }} />
      </Section>

      <Section title="Import from Excel/CSV" hint="Fill the template and upload it — every product in the file is added at once.">
        <GhostButton onClick={() => csvRef.current?.click()}>
          <Upload className="h-4 w-4 text-accent" />
          Choose a CSV file
        </GhostButton>
        <input ref={csvRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { onCsv(e.target.files?.[0]); e.target.value = ""; }} />
        {problems.length > 0 && (
          <div className="glass max-h-40 space-y-1 overflow-y-auto rounded-2xl p-3 text-xs text-cp">
            {problems.slice(0, 20).map((p, i) => (
              <div key={i}>• {p}</div>
            ))}
            {problems.length > 20 && <div>…and {problems.length - 20} more</div>}
          </div>
        )}
      </Section>

      <Section title="Price list share" hint="Send today's prices on WhatsApp or print them for the counter." className="lg:col-span-2">
        <Field label="Category">
          <select className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="" className="bg-popover">
              All categories
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-popover">
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </Field>
        <pre className="glass max-h-56 overflow-y-auto whitespace-pre-wrap rounded-2xl p-4 text-xs">{text}</pre>
        <div className="grid gap-2 sm:grid-cols-2">
          <a href={waUrl(text)} target="_blank" rel="noreferrer" className="glass inline-flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold">
            <Send className="h-4 w-4 text-profit" />
            Send on WhatsApp
          </a>
          <GhostButton
            onClick={() => {
              if (!printPriceList(storeName, products, vendors, categories, cat)) toast.error("Allow pop-ups to print");
            }}
          >
            <Printer className="h-4 w-4 text-sp" />
            Print price list
          </GhostButton>
        </div>
      </Section>

      <Section title="Danger zone" className="ring-1 ring-destructive/30 lg:col-span-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <GhostButton onClick={() => confirm("Reset to sample data? Your changes will be lost.") && (resetDemo(), toast.success("Sample data restored"))}>
            <RotateCcw className="h-4 w-4" />
            Reset to sample data
          </GhostButton>
          <GhostButton className="text-destructive" onClick={() => confirm("Delete ALL vendors, products, bills and entries?") && (clearAll(), toast.success("Everything deleted"))}>
            <Trash2 className="h-4 w-4" />
            Delete all data
          </GhostButton>
        </div>
      </Section>
    </div>
  );
}
