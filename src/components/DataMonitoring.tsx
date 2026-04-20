import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchData, formatTanggal, type Kategori, type PerusahaanRow } from "@/lib/api";
import { Search, Download } from "lucide-react";

export default function DataMonitoring() {
  const [kategori, setKategori] = useState<Kategori>("LTS");
  const [filterKab, setFilterKab] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["data", kategori],
    queryFn: () => fetchData(kategori),
    staleTime: 5 * 60 * 1000,
  });

  const kabList = [...new Set(rows.map(r => r["Nama Kab/Kota"]?.toString().trim()).filter(Boolean))].sort();

  const filtered = filterKab
    ? rows.filter(r => (r["Nama Kab/Kota"] || "").toString().trim().toLowerCase() === filterKab.toLowerCase())
    : rows;

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Filters */}
      <div className="glass-card rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Kategori</label>
          <select
            value={kategori}
            onChange={e => { setKategori(e.target.value as Kategori); setFilterKab(""); }}
            className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring"
          >
            <option value="LTS">Sapi Perah (LTS)</option>
            <option value="LTT">Ternak Besar/Kecil (LTT)</option>
            <option value="LTU">Ternak Unggas (LTU)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Kab/Kota</label>
          <select
            value={filterKab}
            onChange={e => setFilterKab(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring"
          >
            <option value="">Semua</option>
            {kabList.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
          <Search size={14} />
          <span>{filtered.length} dari {rows.length} data</span>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden stat-shadow">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="gradient-primary text-primary-foreground">
                  {["KIP", "Kode", "Kab/Kota", "Kecamatan", "Desa", "Perusahaan", "Alamat", "Kode Pos", "Telp", "Email", "Kondisi", "Kegiatan", "Tgl Submit", "Kendala"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={14} className="text-center py-8 text-muted-foreground">Tidak ada data</td></tr>
                ) : (
                  filtered.map((row, i) => {
                    const submitted = !!row["Tgl Submit Dokumen"];
                    return (
                      <tr key={i} className={`border-b border-border/50 transition-colors hover:bg-muted/50 ${submitted ? "bg-success/5" : ""}`}>
                        <Cell v={row.KIP} />
                        <Cell v={row["Kode Kabupaten/Kota"]} />
                        <Cell v={row["Nama Kab/Kota"]} />
                        <Cell v={row["Nama Kecamatan"]} />
                        <Cell v={row["Nama Desa/Kelurahan"]} />
                        <Cell v={row["Nama Perusahaan/Farm"]} bold />
                        <Cell v={row.Alamat} />
                        <Cell v={row["Kode Pos"]} />
                        <Cell v={row["Telp/Fax"]} />
                        <Cell v={row.Email} />
                        <Cell v={row["Kondisi Perusahaan"]} />
                        <Cell v={row["Kegiatan Utama"]} />
                        <td className="px-3 py-2 whitespace-nowrap">
                          {submitted ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                              {formatTanggal(row["Tgl Submit Dokumen"])}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <Cell v={row["Kendala Pendataan"]} />
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Cell({ v, bold }: { v?: string; bold?: boolean }) {
  return <td className={`px-3 py-2 whitespace-nowrap text-xs ${bold ? "font-semibold" : ""}`}>{v || "—"}</td>;
}
