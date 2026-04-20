import { useQuery } from "@tanstack/react-query";
import { fetchData, KATEGORI_INFO, type Kategori } from "@/lib/api";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { CalendarClock, CheckCircle2, AlertCircle, Building2 } from "lucide-react";

const KATEGORI_LIST: Kategori[] = ["LTS", "LTT", "LTU"];
const COLORS = {
  submit: "hsl(152 60% 38%)",
  belum: "hsl(0 72% 51%)",
  target: "hsl(220 70% 55%)",
};

export default function DashboardOverview() {
  const queries = KATEGORI_LIST.map(k =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({ queryKey: ["data", k], queryFn: () => fetchData(k), staleTime: 5 * 60 * 1000 })
  );

  const isLoading = queries.some(q => q.isLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const stats = KATEGORI_LIST.map((k, i) => {
    const data = queries[i].data || [];
    const total = data.length;
    const submit = data.filter(d => d["Tgl Submit Dokumen"]).length;
    return { kategori: k, total, submit, belum: total - submit, info: KATEGORI_INFO[k] };
  });

  const totalAll = stats.reduce((s, x) => s + x.total, 0);
  const submitAll = stats.reduce((s, x) => s + x.submit, 0);
  const persenAll = totalAll > 0 ? ((submitAll / totalAll) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={Building2} label="Total Perusahaan" value={totalAll} color="primary" />
        <SummaryCard icon={CheckCircle2} label="Sudah Submit" value={submitAll} color="success" />
        <SummaryCard icon={AlertCircle} label="Belum Submit" value={totalAll - submitAll} color="destructive" />
        <SummaryCard icon={CalendarClock} label="Persentase Submit" value={`${persenAll}%`} color="accent" />
      </div>

      {/* Deadline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.kategori} className="glass-card rounded-xl p-5 stat-shadow">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.info.label}</span>
                <h3 className="text-sm font-medium text-foreground mt-0.5">{s.info.description}</h3>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                Batas: {s.info.deadline}
              </span>
            </div>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={90} height={90}>
                <PieChart>
                  <Pie data={[{ v: s.submit }, { v: s.belum }]} dataKey="v" innerRadius={28} outerRadius={40} strokeWidth={0}>
                    <Cell fill={COLORS.submit} />
                    <Cell fill={COLORS.belum} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.target }} />
                  <span className="text-muted-foreground">Target:</span>
                  <span className="font-semibold">{s.total}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.submit }} />
                  <span className="text-muted-foreground">Submit:</span>
                  <span className="font-semibold text-success">{s.submit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.belum }} />
                  <span className="text-muted-foreground">Belum:</span>
                  <span className="font-semibold text-destructive">{s.belum}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart Overview */}
      <div className="glass-card rounded-xl p-6 stat-shadow">
        <h3 className="text-sm font-semibold text-foreground mb-4">Target vs Realisasi per Kategori</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={stats.map(s => ({ name: s.info.label, Target: s.total, Realisasi: s.submit }))}>
            <XAxis dataKey="name" tick={{ fontSize: 13 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Target" fill={COLORS.target} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Realisasi" fill={COLORS.submit} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    accent: "bg-accent/10 text-accent",
  };
  return (
    <div className="glass-card rounded-xl p-5 stat-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}
