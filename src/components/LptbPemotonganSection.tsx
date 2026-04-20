import { useEffect, useMemo, useState } from "react";
import { Loader2, Beef, Factory, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchPemotongan,
  fetchProduksi,
  PemotonganRow,
  ProduksiRow,
  TAHUN_LIST,
  TERNAK_COLS,
  cleanLabel,
  parseNum,
} from "@/lib/pemotongan";

const ALL = "__ALL__";

export default function LptbPemotonganSection() {
  const [tahun, setTahun] = useState<number>(2025);
  const [pemotongan, setPemotongan] = useState<PemotonganRow[]>([]);
  const [produksi, setProduksi] = useState<ProduksiRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterKab, setFilterKab] = useState<string>(ALL);
  const [filterBulan, setFilterBulan] = useState<string>(ALL);
  const [filterTernak, setFilterTernak] = useState<string>(ALL);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    Promise.all([fetchPemotongan(tahun), fetchProduksi(tahun)])
      .then(([p, pr]) => {
        if (cancel) return;
        setPemotongan(p);
        setProduksi(pr);
      })
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [tahun]);

  // Opsi filter
  const kabOpts = useMemo(() => {
    const s = new Set<string>();
    pemotongan.forEach(r => r.Kabupaten && s.add(cleanLabel(r.Kabupaten)));
    produksi.forEach(r => r.Kabupaten && s.add(cleanLabel(r.Kabupaten)));
    return Array.from(s).sort();
  }, [pemotongan, produksi]);

  const bulanOpts = useMemo(() => {
    const s = new Set<string>();
    pemotongan.forEach(r => r.Bulan && s.add(r.Bulan));
    produksi.forEach(r => r.Bulan && s.add(r.Bulan));
    return Array.from(s).sort();
  }, [pemotongan, produksi]);

  const ternakOpts = TERNAK_COLS;

  // Filter pemotongan rows
  const pemotonganFiltered = useMemo(() => {
    return pemotongan.filter(r => {
      if (filterKab !== ALL && cleanLabel(r.Kabupaten) !== filterKab) return false;
      if (filterBulan !== ALL && r.Bulan !== filterBulan) return false;
      return true;
    });
  }, [pemotongan, filterKab, filterBulan]);

  const produksiFiltered = useMemo(() => {
    return produksi.filter(r => {
      if (filterKab !== ALL && cleanLabel(r.Kabupaten) !== filterKab) return false;
      if (filterBulan !== ALL && r.Bulan !== filterBulan) return false;
      if (filterTernak !== ALL && r.Ternak !== filterTernak) return false;
      return true;
    });
  }, [produksi, filterKab, filterBulan, filterTernak]);

  // KPI
  const totalPemotonganTernak = useMemo(() => {
    let sum = 0;
    pemotonganFiltered.forEach(r => {
      TERNAK_COLS.forEach(c => {
        if (filterTernak !== ALL && c !== filterTernak) return;
        sum += parseNum(r[c]);
      });
    });
    return sum;
  }, [pemotonganFiltered, filterTernak]);

  const totalRphAktif = useMemo(
    () => pemotonganFiltered.reduce((a, r) => a + parseNum(r["Jumlah RPH/TPH Aktif/Baru"]), 0),
    [pemotonganFiltered]
  );

  const totalDaging = useMemo(
    () => produksiFiltered.reduce((a, r) => a + parseNum(r.Daging), 0),
    [produksiFiltered]
  );

  // Chart: pemotongan per bulan (stack per ternak)
  const chartPerBulan = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    pemotonganFiltered.forEach(r => {
      const b = r.Bulan || "-";
      if (!map[b]) map[b] = {};
      TERNAK_COLS.forEach(c => {
        if (filterTernak !== ALL && c !== filterTernak) return;
        map[b][cleanLabel(c)] = (map[b][cleanLabel(c)] || 0) + parseNum(r[c]);
      });
    });
    return Object.keys(map)
      .sort()
      .map(b => ({ bulan: b.replace(/^\d+\s*-\s*/, ""), ...map[b] }));
  }, [pemotonganFiltered, filterTernak]);

  // Chart: produksi daging per bulan
  const chartProduksi = useMemo(() => {
    const map: Record<string, number> = {};
    produksiFiltered.forEach(r => {
      const b = r.Bulan || "-";
      map[b] = (map[b] || 0) + parseNum(r.Daging);
    });
    return Object.keys(map)
      .sort()
      .map(b => ({ bulan: b.replace(/^\d+\s*-\s*/, ""), Daging: map[b] }));
  }, [produksiFiltered]);

  const palette = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "hsl(168 75% 40%)",
    "hsl(36 95% 55%)",
    "hsl(220 70% 55%)",
    "hsl(280 65% 60%)",
    "hsl(0 70% 55%)",
    "hsl(150 60% 45%)",
  ];

  const ternakKeysShown = filterTernak === ALL ? TERNAK_COLS.map(cleanLabel) : [cleanLabel(filterTernak)];

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Tahun</label>
            <Select value={String(tahun)} onValueChange={v => setTahun(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TAHUN_LIST.map(t => <SelectItem key={t} value={String(t)}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Kabupaten</label>
            <Select value={filterKab} onValueChange={setFilterKab}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Kabupaten</SelectItem>
                {kabOpts.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Bulan</label>
            <Select value={filterBulan} onValueChange={setFilterBulan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Bulan</SelectItem>
                {bulanOpts.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Jenis Ternak</label>
            <Select value={filterTernak} onValueChange={setFilterTernak}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Ternak</SelectItem>
                {ternakOpts.map(t => <SelectItem key={t} value={t}>{cleanLabel(t)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Beef className="text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Ternak Dipotong</div>
              <div className="text-2xl font-bold">{totalPemotonganTernak.toLocaleString("id-ID")}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Factory className="text-accent" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">RPH/TPH Aktif/Baru</div>
              <div className="text-2xl font-bold">{totalRphAktif.toLocaleString("id-ID")}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <TrendingUp className="text-secondary-foreground" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Produksi Daging</div>
              <div className="text-2xl font-bold">{totalDaging.toLocaleString("id-ID")}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="tabel">
          <TabsList>
            <TabsTrigger value="tabel">Tabel</TabsTrigger>
            <TabsTrigger value="grafik">Grafik</TabsTrigger>
          </TabsList>

          <TabsContent value="tabel" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Data Pemotongan {tahun}</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bulan</TableHead>
                      <TableHead>Kabupaten</TableHead>
                      <TableHead className="text-right">RPH Aktif</TableHead>
                      <TableHead className="text-right">RPH Pemotongan</TableHead>
                      {TERNAK_COLS.filter(c => filterTernak === ALL || c === filterTernak).map(c => (
                        <TableHead key={c} className="text-right">{cleanLabel(c)}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pemotonganFiltered.length === 0 ? (
                      <TableRow><TableCell colSpan={20} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
                    ) : pemotonganFiltered.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.Bulan}</TableCell>
                        <TableCell>{cleanLabel(r.Kabupaten)}</TableCell>
                        <TableCell className="text-right">{r["Jumlah RPH/TPH Aktif/Baru"] || "-"}</TableCell>
                        <TableCell className="text-right">{r["Jumlah RPH/TPH Ada Pemotongan"] || "-"}</TableCell>
                        {TERNAK_COLS.filter(c => filterTernak === ALL || c === filterTernak).map(c => (
                          <TableCell key={c} className="text-right">{r[c] || "-"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Data Produksi {tahun}</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bulan</TableHead>
                      <TableHead>Ternak</TableHead>
                      <TableHead>Kabupaten</TableHead>
                      <TableHead className="text-right">Dipotong</TableHead>
                      <TableHead className="text-right">Berat Hidup</TableHead>
                      <TableHead className="text-right">Karkas</TableHead>
                      <TableHead className="text-right">Jeroan</TableHead>
                      <TableHead className="text-right">Kulit Basah</TableHead>
                      <TableHead className="text-right">Lainnya</TableHead>
                      <TableHead className="text-right">Daging</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produksiFiltered.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
                    ) : produksiFiltered.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.Bulan}</TableCell>
                        <TableCell>{cleanLabel(r.Ternak)}</TableCell>
                        <TableCell>{cleanLabel(r.Kabupaten)}</TableCell>
                        <TableCell className="text-right">{r["Jumlah Ternak Dipotong"] || "-"}</TableCell>
                        <TableCell className="text-right">{r["Berat Hidup"] || "-"}</TableCell>
                        <TableCell className="text-right">{r.Karkas || "-"}</TableCell>
                        <TableCell className="text-right">{r.Jeroan || "-"}</TableCell>
                        <TableCell className="text-right">{r["Kulit Basah"] || "-"}</TableCell>
                        <TableCell className="text-right">{r.Lainnya || "-"}</TableCell>
                        <TableCell className="text-right">{r.Daging || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grafik" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Pemotongan Ternak per Bulan</CardTitle></CardHeader>
              <CardContent style={{ height: 360 }}>
                <ResponsiveContainer>
                  <BarChart data={chartPerBulan}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {ternakKeysShown.map((k, i) => (
                      <Bar key={k} dataKey={k} stackId="a" fill={palette[i % palette.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Produksi Daging per Bulan</CardTitle></CardHeader>
              <CardContent style={{ height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={chartProduksi}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Daging" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
