import { useQuery } from "@tanstack/react-query";
import { fetchData, buildRekap, type Kategori, type RekapRow } from "@/lib/api";
import { useState } from "react";
import { ArrowUpDown, Download } from "lucide-react";

const KATEGORI_LIST: Kategori[] = ["LTS", "LTT", "LTU"];
const LABELS: Record<Kategori, string> = { LTS: "Rekap LTS — Sapi Perah", LTT: "Rekap LTT — Ternak Besar/Kecil", LTU: "Rekap LTU — Ternak Unggas" };

export default function RekapSection() {
  const queries = KATEGORI_LIST.map(k =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({ queryKey: ["data", k], queryFn: () => fetchData(k), staleTime: 5 * 60 * 1000 })
  );

  const isLoading = queries.some(q => q.isLoading);
  const allRekap: Record<Kategori, RekapRow[]> = {
    LTS: buildRekap(queries[0].data || []),
    LTT: buildRekap(queries[1].data || []),
    LTU: buildRekap(queries[2].data || []),
  };

  const downloadCSV = () => {
    let csv = "Kategori,Kode Kab/Kota,Kabupaten/Kota,Target,Realisasi,Persentase\n";
    KATEGORI_LIST.forEach(k => {
      allRekap[k].forEach(r => {
        csv += `${k},${r.kode},${r.nama},${r.target},${r.realisasi},${r.persen}\n`;
      });
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "Rekap_Peternakan.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><div className="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Rekap Data Perusahaan</h2>
        <button onClick={downloadCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Download size={16} /> Download CSV
        </button>
      </div>

      {KATEGORI_LIST.map(k => (
        <RekapTable key={k} label={LABELS[k]} data={allRekap[k]} />
      ))}
    </div>
  );
}

function RekapTable({ label, data }: { label: string; data: RekapRow[] }) {
  const [sortCol, setSortCol] = useState<keyof RekapRow>("nama");
  const [asc, setAsc] = useState(true);

  const sorted = [...data].sort((a, b) => {
    const va = a[sortCol], vb = b[sortCol];
    const cmp = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
    return asc ? cmp : -cmp;
  });

  const toggleSort = (col: keyof RekapRow) => {
    if (sortCol === col) setAsc(!asc); else { setSortCol(col); setAsc(true); }
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden stat-shadow">
      <div className="px-5 py-3 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              {([["kode", "Kode"], ["nama", "Kab/Kota"], ["target", "Target"], ["realisasi", "Realisasi"], ["persen", "Persentase"]] as [keyof RekapRow, string][]).map(([col, lbl]) => (
                <th key={col} onClick={() => toggleSort(col)} className="px-4 py-2.5 text-left text-xs font-semibold cursor-pointer hover:bg-muted transition-colors">
                  <span className="flex items-center gap-1">{lbl} <ArrowUpDown size={12} className="text-muted-foreground" /></span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const full = r.realisasi === r.target && r.target > 0;
              return (
                <tr key={i} className={`border-b border-border/30 transition-colors hover:bg-muted/30 ${full ? "bg-success/5" : ""}`}>
                  <td className="px-4 py-2 text-xs">{r.kode}</td>
                  <td className="px-4 py-2 text-xs font-medium">{r.nama}</td>
                  <td className="px-4 py-2 text-xs">{r.target}</td>
                  <td className="px-4 py-2 text-xs">{r.realisasi}</td>
                  <td className="px-4 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(r.persen, 100)}%` }} />
                      </div>
                      <span className={`font-semibold ${r.persen === 100 ? "text-success" : ""}`}>{r.persen}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
