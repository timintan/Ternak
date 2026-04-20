import { useQuery } from "@tanstack/react-query";
import { fetchData, type Kategori } from "@/lib/api";
import { AlertTriangle } from "lucide-react";

const KATEGORI_LIST: Kategori[] = ["LTS", "LTT", "LTU"];

export default function AnomalySection() {
  const queries = KATEGORI_LIST.map(k =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({ queryKey: ["data", k], queryFn: () => fetchData(k), staleTime: 5 * 60 * 1000 })
  );

  const isLoading = queries.some(q => q.isLoading);

  if (isLoading) {
    return <div className="flex justify-center py-16"><div className="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full" /></div>;
  }

  const anomalies: { kategori: Kategori; nama: string; kab: string; issue: string }[] = [];

  KATEGORI_LIST.forEach((k, i) => {
    const data = queries[i].data || [];
    data.forEach(row => {
      const issues: string[] = [];
      if (!row["Nama Perusahaan/Farm"]) issues.push("Nama perusahaan kosong");
      if (!row["Nama Kab/Kota"]) issues.push("Nama Kab/Kota kosong");
      if (row["Kendala Pendataan"] && row["Kendala Pendataan"].toString().trim()) {
        issues.push(`Kendala: ${row["Kendala Pendataan"]}`);
      }
      issues.forEach(issue => {
        anomalies.push({
          kategori: k,
          nama: row["Nama Perusahaan/Farm"] || "(tidak diketahui)",
          kab: row["Nama Kab/Kota"] || "-",
          issue,
        });
      });
    });
  });

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="glass-card rounded-xl p-4 flex items-center gap-3">
        <AlertTriangle size={18} className="text-warning" />
        <span className="text-sm font-semibold">Anomali & Kendala Data</span>
        <span className="ml-auto text-xs text-muted-foreground">{anomalies.length} item ditemukan</span>
      </div>

      {anomalies.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground text-sm">
          Tidak ada anomali ditemukan.
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden stat-shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold">Kategori</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold">Perusahaan</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold">Kab/Kota</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold">Masalah</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.slice(0, 100).map((a, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="px-4 py-2 text-xs"><span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">{a.kategori}</span></td>
                    <td className="px-4 py-2 text-xs font-medium">{a.nama}</td>
                    <td className="px-4 py-2 text-xs">{a.kab}</td>
                    <td className="px-4 py-2 text-xs text-destructive">{a.issue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
