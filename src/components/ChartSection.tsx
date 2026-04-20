import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchData, type Kategori } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS_BAR = { target: "hsl(220 70% 55%)", submit: "hsl(152 60% 38%)" };
const PIE_COLORS = ["hsl(152 60% 38%)", "hsl(220 70% 55%)"];

export default function ChartSection() {
  const [kategori, setKategori] = useState<Kategori>("LTS");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["data", kategori],
    queryFn: () => fetchData(kategori),
    staleTime: 5 * 60 * 1000,
  });

  const kabData: Record<string, { target: number; submit: number }> = {};
  rows.forEach(row => {
    const kab = row["Nama Kab/Kota"];
    if (!kab) return;
    if (!kabData[kab]) kabData[kab] = { target: 0, submit: 0 };
    kabData[kab].target++;
    if (row["Tgl Submit Dokumen"]) kabData[kab].submit++;
  });

  const barData = Object.entries(kabData).map(([name, v]) => ({ name, Target: v.target, Realisasi: v.submit }));
  const totalSubmit = rows.filter(r => r["Tgl Submit Dokumen"]).length;
  const totalBelum = rows.length - totalSubmit;
  const pieData = [{ name: "Sudah Submit", value: totalSubmit }, { name: "Belum Submit", value: totalBelum }];

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="glass-card rounded-xl p-4">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Kategori</label>
        <select
          value={kategori}
          onChange={e => setKategori(e.target.value as Kategori)}
          className="h-9 px-3 rounded-lg border border-input bg-background text-sm"
        >
          <option value="LTS">Sapi Perah (LTS)</option>
          <option value="LTT">Ternak Besar/Kecil (LTT)</option>
          <option value="LTU">Ternak Unggas (LTU)</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card rounded-xl p-6 stat-shadow">
            <h3 className="text-sm font-semibold mb-4">Target vs Realisasi per Kab/Kota</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Target" fill={COLORS_BAR.target} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Realisasi" fill={COLORS_BAR.submit} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card rounded-xl p-6 stat-shadow">
            <h3 className="text-sm font-semibold mb-4">Persentase Submit Keseluruhan</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} strokeWidth={0} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
