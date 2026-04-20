import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Download, MapPin, Phone, Building2 } from "lucide-react";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQfgugug8G_6oeO9gVF55f83DoOutFxWMl9kUD_GqvebNGfm0vQKgpjLs4ZLCJjboIdlHmtoe70HzmG/pub?gid=2091968888&single=true&output=csv";

export interface DirektoriRow {
  kab: string;
  kec: string;
  des: string;
  kip: string;
  nama: string;
  r107: string; // alamat
  r108_latitude: string;
  r108_longitude: string;
  r109: string; // status/kondisi
  r602: string; // telp
  r603: string; // pencacah nama
  r604: string;
  PENCACAH: string;
  PENGAWAS: string;
}

// Minimal CSV parser yang menghormati tanda kutip
function parseCSV(text: string): DirektoriRow[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        cur.push(field);
        field = "";
      } else if (c === "\n") {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
      } else if (c === "\r") {
        // skip
      } else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }

  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1)
    .filter(r => r.some(v => v && v.trim() !== ""))
    .map(r => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h.trim()] = (r[idx] ?? "").trim();
      });
      return obj as unknown as DirektoriRow;
    });
}

async function fetchDirektori(): Promise<DirektoriRow[]> {
  const res = await fetch(CSV_URL);
  const text = await res.text();
  return parseCSV(text);
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  "1": { label: "RPH", cls: "bg-success/10 text-success" },
  "2": { label: "TPH", cls: "bg-muted text-muted-foreground" },
  "3": { label: "Dinas", cls: "bg-primary/10 text-primary" },
};

export default function LptbDirektoriSection() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["lptb-direktori"],
    queryFn: fetchDirektori,
    staleTime: 5 * 60 * 1000,
  });

  const [search, setSearch] = useState("");
  const [kabFilter, setKabFilter] = useState<string>("all");

  const kabList = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.map(r => r.kab).filter(Boolean))).sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter(r => {
      if (kabFilter !== "all" && r.kab !== kabFilter) return false;
      if (!q) return true;
      return (
        r.nama?.toLowerCase().includes(q) ||
        r.kip?.toLowerCase().includes(q) ||
        r.r107?.toLowerCase().includes(q) ||
        r.kab?.toLowerCase().includes(q)
      );
    });
  }, [data, search, kabFilter]);

  const downloadCSV = () => {
    const headers = ["KIP", "Nama", "Kab/Kota", "Kecamatan", "Alamat", "Latitude", "Longitude", "Telp", "Status", "Pencacah", "Pengawas"];
    const lines = [headers.join(",")];
    filtered.forEach(r => {
      const status = STATUS_LABEL[r.r109]?.label ?? r.r109;
      lines.push([r.kip, r.nama, r.kab, r.kec, r.r107, r.r108_latitude, r.r108_longitude, r.r602, status, r.PENCACAH || r.r603, r.PENGAWAS]
        .map(v => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "Direktori_LPTB.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-6 h-6 border-[3px] border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <p className="text-sm text-destructive">Gagal memuat data Direktori LPTB.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header stat */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Building2 size={18} />} label="Total RPH/LPTB" value={data?.length ?? 0} />
        <StatCard icon={<MapPin size={18} />} label="Dinas" value={data?.filter(r => r.r109 === "3").length ?? 0} accent="text-success"/>
        <StatCard
          icon={<Building2 size={18} />}
          label="RPH"
          value={data?.filter(r => r.r109 === "1").length ?? 0}
          accent="text-success"
        />
        <StatCard
          icon={<Building2 size={18} />}
          label="TPH"
          value={data?.filter(r => r.r109 === "2").length ?? 0}
          accent="text-muted-foreground"
        />
      </div>

      {/* Filter bar */}
      <div className="glass-card rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center stat-shadow">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama, KIP, alamat..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={kabFilter}
          onChange={e => setKabFilter(e.target.value)}
          className="h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 md:w-64"
        >
          <option value="all">Semua Kab/Kota</option>
          {kabList.map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <button
          onClick={downloadCSV}
          className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Download size={16} /> CSV
        </button>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden stat-shadow">
        <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Direktori LPTB <span className="text-muted-foreground font-normal">({filtered.length})</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-3 py-2.5 text-left text-xs font-semibold">KIP</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold">Nama</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold">Kab/Kota</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold">Alamat</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold">Telp</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold">Status</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold">Pencacah</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Tidak ada data yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => {
                  const status = STATUS_LABEL[r.r109] ?? { label: r.r109 || "-", cls: "bg-muted text-muted-foreground" };
                  return (
                    <tr key={`${r.kip}-${i}`} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 text-xs font-mono">{r.kip}</td>
                      <td className="px-3 py-2 text-xs font-medium">{r.nama}</td>
                      <td className="px-3 py-2 text-xs">{r.kab}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs truncate" title={r.r107}>{r.r107}</td>
                      <td className="px-3 py-2 text-xs">
                        {r.r602 ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Phone size={11} /> {r.r602}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{r.PENCACAH || r.r603 || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: string }) {
  return (
    <div className="glass-card rounded-xl p-4 stat-shadow">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1.5">
        {icon} {label}
      </div>
      <div className={`text-2xl font-bold ${accent ?? "text-foreground"}`}>{value.toLocaleString("id-ID")}</div>
    </div>
  );
}
