import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Filter } from "lucide-react";
import "leaflet/dist/leaflet.css";
import {
  fetchPemotongan,
  fetchProduksi,
  TAHUN_LIST,
  TERNAK_COLS,
  cleanLabel,
  parseNum,
  type PemotonganRow,
  type ProduksiRow,
} from "@/lib/pemotongan";

const DIREKTORI_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQfgugug8G_6oeO9gVF55f83DoOutFxWMl9kUD_GqvebNGfm0vQKgpjLs4ZLCJjboIdlHmtoe70HzmG/pub?gid=2091968888&single=true&output=csv";

interface DirektoriRow {
  kab: string;
  kec: string;
  kip: string;
  nama: string;
  r107: string;
  r108_latitude: string;
  r108_longitude: string;
  r109: string;
  r602: string;
}

type KabGeoFeature = GeoJSON.Feature<GeoJSON.Geometry, { kab?: string; kode?: string }>;
type KabGeoJson = GeoJSON.FeatureCollection<GeoJSON.Geometry, { kab?: string; kode?: string }>;

type JenisData = "pemotongan" | "produksi";
type LeafletModule = typeof import("leaflet");

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  "1": { label: "RPH", color: "hsl(142 70% 40%)" },
  "2": { label: "TPH", color: "hsl(36 95% 55%)" },
  "3": { label: "Dinas", color: "hsl(220 70% 55%)" },
};

const BULAN_LIST = [
  "01 - Januari",
  "02 - Februari",
  "03 - Maret",
  "04 - April",
  "05 - Mei",
  "06 - Juni",
  "07 - Juli",
  "08 - Agustus",
  "09 - September",
  "10 - Oktober",
  "11 - November",
  "12 - Desember",
];

const COLOR_STEPS = ["#deebf7", "#9ecae1", "#6baed6", "#3182bd", "#08519c"];
const NO_DATA_COLOR = "#e5e5e5";

function parseCSV(text: string): DirektoriRow[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      currentRow.push(field);
      field = "";
    } else if (char === "\n") {
      currentRow.push(field);
      rows.push(currentRow);
      currentRow = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || currentRow.length > 0) {
    currentRow.push(field);
    rows.push(currentRow);
  }

  if (rows.length === 0) return [];

  const headers = rows[0];
  return rows
    .slice(1)
    .filter((row) => row.some((value) => value?.trim()))
    .map((row) => {
      const item: Record<string, string> = {};
      headers.forEach((header, index) => {
        item[header.trim()] = (row[index] ?? "").trim();
      });
      return item as unknown as DirektoriRow;
    });
}

async function fetchDirektori(): Promise<DirektoriRow[]> {
  const res = await fetch(DIREKTORI_CSV);
  return parseCSV(await res.text());
}

async function fetchGeoJson(): Promise<KabGeoJson> {
  const res = await fetch("/geo/jateng-kab.geojson", { cache: "force-cache" });
  if (!res.ok) {
    throw new Error("Gagal memuat peta kabupaten.");
  }

  const data = (await res.json()) as KabGeoJson;
  if (!Array.isArray(data?.features)) {
    throw new Error("Format GeoJSON peta tidak valid.");
  }

  return data;
}

function normKab(value: string): string {
  const normalized = value
    .toUpperCase()
    .replace(/^KABUPATEN\s+/i, "")
    .replace(/^KOTA\s*/i, "KOTA ")
    .replace(/^KOTA(?=[A-Z])/, "KOTA ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized === "SURAKARTA") return "KOTA SURAKARTA";
  if (normalized === "SALATIGA") return "KOTA SALATIGA";
  return normalized;
}

function computeBreaks(values: number[]): number[] {
  const positive = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (positive.length === 0) return [0, 0, 0, 0, 0];

  const breakpoints = [0, 0.2, 0.4, 0.6, 0.8].map((ratio) => {
    const index = Math.min(positive.length - 1, Math.floor(ratio * positive.length));
    return positive[index] ?? 0;
  });

  for (let i = 1; i < breakpoints.length; i++) {
    if (breakpoints[i] <= breakpoints[i - 1]) {
      breakpoints[i] = breakpoints[i - 1] + 1;
    }
  }

  return breakpoints;
}

function getColor(value: number, breaks: number[]): string {
  if (!value || value <= 0) return NO_DATA_COLOR;
  if (value < breaks[1]) return COLOR_STEPS[0];
  if (value < breaks[2]) return COLOR_STEPS[1];
  if (value < breaks[3]) return COLOR_STEPS[2];
  if (value < breaks[4]) return COLOR_STEPS[3];
  return COLOR_STEPS[4];
}

function fmtShort(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}rb`;
  return value.toFixed(0);
}

function buildTooltipContent(feature: KabGeoFeature, jenis: JenisData, unit: string, value: number) {
  return `<div style="font-family:system-ui"><b>${feature.properties?.kab || "-"}</b><br/><span style="color:#555">${jenis === "pemotongan" ? "Ternak Dipotong" : "Produksi Daging"}: </span><b>${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })} ${unit}</b></div>`;
}

function EmptyMapState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <div className="space-y-2">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <AlertCircle size={18} />
        </div>
        <p className="text-sm font-medium text-foreground">Peta belum bisa ditampilkan</p>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default function LptbPetaSection() {
  const [tahun, setTahun] = useState<number>(2025);
  const [bulan, setBulan] = useState<string>("all");
  const [kab, setKab] = useState<string>("all");
  const [ternak, setTernak] = useState<string>("all");
  const [jenis, setJenis] = useState<JenisData>("pemotongan");
  const [showFasilitas, setShowFasilitas] = useState(true);

  const direktoriQ = useQuery({
    queryKey: ["lptb-direktori"],
    queryFn: fetchDirektori,
    staleTime: 10 * 60 * 1000,
  });
  const pemQ = useQuery({
    queryKey: ["pemotongan", tahun],
    queryFn: () => fetchPemotongan(tahun),
    staleTime: 10 * 60 * 1000,
  });
  const prodQ = useQuery({
    queryKey: ["produksi", tahun],
    queryFn: () => fetchProduksi(tahun),
    staleTime: 10 * 60 * 1000,
  });
  const geoQ = useQuery({
    queryKey: ["jateng-geo"],
    queryFn: fetchGeoJson,
    staleTime: Infinity,
    retry: 1,
  });

  const isLoading = direktoriQ.isLoading || pemQ.isLoading || prodQ.isLoading || geoQ.isLoading;
  const geojson = geoQ.data;
  const canRenderMap = Boolean(geojson?.features?.length);

  const kabList = useMemo(() => {
    const items = new Set<string>();
    direktoriQ.data?.forEach((row) => row.kab && items.add(normKab(row.kab)));
    pemQ.data?.forEach((row) => row.Kabupaten && items.add(normKab(cleanLabel(row.Kabupaten))));
    prodQ.data?.forEach((row) => row.Kabupaten && items.add(normKab(cleanLabel(row.Kabupaten))));
    return Array.from(items).sort();
  }, [direktoriQ.data, pemQ.data, prodQ.data]);

  const kabAggregate = useMemo(() => {
    const aggregate: Record<string, number> = {};

    if (jenis === "pemotongan") {
      (pemQ.data || []).forEach((row: PemotonganRow) => {
        if (bulan !== "all" && row.Bulan !== bulan) return;

        const kabName = normKab(cleanLabel(row.Kabupaten));
        if (kab !== "all" && kabName !== kab) return;

        let total = 0;
        if (ternak === "all") {
          TERNAK_COLS.forEach((col) => {
            total += parseNum(row[col]);
          });
        } else {
          total += parseNum(row[ternak]);
        }

        aggregate[kabName] = (aggregate[kabName] || 0) + total;
      });
    } else {
      (prodQ.data || []).forEach((row: ProduksiRow) => {
        if (bulan !== "all" && row.Bulan !== bulan) return;

        const kabName = normKab(cleanLabel(row.Kabupaten));
        if (kab !== "all" && kabName !== kab) return;
        if (ternak !== "all" && cleanLabel(row.Ternak) !== cleanLabel(ternak)) return;

        aggregate[kabName] =
          (aggregate[kabName] || 0) + parseNum(row.Daging) * parseNum(row["Jumlah Ternak Dipotong"]);
      });
    }

    return aggregate;
  }, [bulan, kab, jenis, pemQ.data, prodQ.data, ternak]);

  const breaks = useMemo(() => computeBreaks(Object.values(kabAggregate)), [kabAggregate]);

  const fasilitasList = useMemo(() => {
    return (direktoriQ.data || []).filter((row) => {
      if (kab !== "all" && normKab(row.kab) !== kab) return false;
      const lat = Number.parseFloat(row.r108_latitude);
      const lng = Number.parseFloat(row.r108_longitude);
      return Number.isFinite(lat) && Number.isFinite(lng);
    });
  }, [direktoriQ.data, kab]);

  const unit = jenis === "pemotongan" ? "ekor" : "kg";
  const mapErrorMessage = geoQ.error instanceof Error ? geoQ.error.message : "GeoJSON belum tersedia.";

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="glass-card rounded-xl p-4 stat-shadow">
        <div className="mb-3 flex items-center gap-2">
          <Filter size={16} className="text-primary" />
          <span className="text-sm font-semibold">Filter Peta</span>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
          <select
            value={jenis}
            onChange={(event) => setJenis(event.target.value as JenisData)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="pemotongan">Data Pemotongan</option>
            <option value="produksi">Data Produksi (Daging)</option>
          </select>

          <select
            value={tahun}
            onChange={(event) => setTahun(Number(event.target.value))}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >
            {TAHUN_LIST.map((item) => (
              <option key={item} value={item}>
                Tahun {item}
              </option>
            ))}
          </select>

          <select
            value={bulan}
            onChange={(event) => setBulan(event.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="all">Semua Bulan</option>
            {BULAN_LIST.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={kab}
            onChange={(event) => setKab(event.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="all">Semua Kab/Kota</option>
            {kabList.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={ternak}
            onChange={(event) => setTernak(event.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="all">Semua Jenis Ternak</option>
            {TERNAK_COLS.map((item) => (
              <option key={item} value={item}>
                {cleanLabel(item)}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border/40 pt-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={showFasilitas}
              onChange={(event) => setShowFasilitas(event.target.checked)}
              className="rounded accent-primary"
            />
            <span>Tampilkan Lokasi RPH/TPH/Dinas</span>
          </label>

          <div className="flex flex-wrap gap-3 text-xs">
            {Object.entries(STATUS_INFO).map(([key, item]) => (
              <span key={key} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border border-white" style={{ background: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_180px]">
        <div className="glass-card stat-shadow overflow-hidden rounded-xl" style={{ height: 600 }}>
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
            </div>
          ) : canRenderMap && geojson ? (
            <ChoroplethMap
              geojson={geojson}
              fasilitas={showFasilitas ? fasilitasList : []}
              kabAggregate={kabAggregate}
              breaks={breaks}
              jenis={jenis}
              unit={unit}
            />
          ) : (
            <EmptyMapState message={mapErrorMessage} />
          )}
        </div>

        <div className="glass-card stat-shadow self-start rounded-xl p-4">
          <h4 className="mb-3 text-xs font-semibold text-foreground">
            {jenis === "pemotongan" ? "Jumlah Ternak Dipotong" : "Produksi Daging (kg)"}
          </h4>

          <div className="space-y-1.5">
            {[4, 3, 2, 1, 0].map((index) => {
              const color = COLOR_STEPS[index];
              let label: string;
              if (index === 4) label = `> ${fmtShort(breaks[4])}`;
              else if (index === 0) label = `< ${fmtShort(breaks[1])}`;
              else label = `${fmtShort(breaks[index])} – ${fmtShort(breaks[index + 1])}`;

              return (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <span className="h-5 w-5 rounded" style={{ background: color }} />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              );
            })}

            <div className="mt-2 flex items-center gap-2 border-t border-border/40 pt-1.5 text-xs">
              <span className="h-5 w-5 rounded border border-border" style={{ background: NO_DATA_COLOR }} />
              <span className="text-muted-foreground">Tidak ada data</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChoroplethMap({
  geojson,
  fasilitas,
  kabAggregate,
  breaks,
  jenis,
  unit,
}: {
  geojson: KabGeoJson;
  fasilitas: DirektoriRow[];
  kabAggregate: Record<string, number>;
  breaks: number[];
  jenis: JenisData;
  unit: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import("leaflet").Map | null>(null);
  const choroLayer = useRef<import("leaflet").FeatureGroup | null>(null);
  const markerLayer = useRef<import("leaflet").LayerGroup | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    let cancelled = false;

    void import("leaflet").then((leaflet) => {
      if (!mapRef.current || cancelled || mapInstance.current) return;

      leafletRef.current = leaflet;
      const map = leaflet.map(mapRef.current, { zoomControl: true }).setView([-7.15, 110.3], 8);
      leaflet
        .tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap &copy; CARTO",
          subdomains: "abcd",
        })
        .addTo(map);

      markerLayer.current = leaflet.layerGroup().addTo(map);
      mapInstance.current = map;
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      mapInstance.current?.remove();
      mapInstance.current = null;
      markerLayer.current = null;
      choroLayer.current = null;
      leafletRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet || !geojson?.features?.length) return;

    if (choroLayer.current) {
      map.removeLayer(choroLayer.current);
      choroLayer.current = null;
    }

    const featureGroup = leaflet.featureGroup();

    const addPolygon = (rings: number[][][], style: Record<string, string | number>, tooltip: string) => {
      const latLngs = rings.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number]));
      const polygon = leaflet.polygon(latLngs, style).addTo(featureGroup);
      polygon.bindTooltip(tooltip, { sticky: true });
      polygon.on({
        mouseover: (event) => {
          const layer = event.target as import("leaflet").Path;
          layer.setStyle({ weight: 2.5, color: "hsl(0 0% 20%)", fillOpacity: 0.95 });
          layer.bringToFront();
        },
        mouseout: (event) => {
          const layer = event.target as import("leaflet").Path;
          layer.setStyle(style);
        },
      });
    };

    geojson.features.forEach((feature) => {
      const geometry = feature.geometry as GeoJSON.Geometry & { coordinates?: unknown };
      if (!geometry || !(geometry.type === "Polygon" || geometry.type === "MultiPolygon")) return;

      const kabName = normKab(String(feature.properties?.kab || ""));
      const value = kabAggregate[kabName] || 0;
      const style = {
        fillColor: getColor(value, breaks),
        weight: 1,
        color: "hsl(0 0% 100%)",
        fillOpacity: 0.85,
      };
      const tooltip = buildTooltipContent(feature, jenis, unit, value);

      if (geometry.type === "Polygon") {
        addPolygon(geometry.coordinates as number[][][], style, tooltip);
      } else {
        (geometry.coordinates as number[][][][]).forEach((polygon) => addPolygon(polygon, style, tooltip));
      }
    });

    featureGroup.addTo(map);
    choroLayer.current = featureGroup;

    try {
      const bounds = featureGroup.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [10, 10] });
      }
    } catch {
      return;
    }
  }, [breaks, geojson, jenis, kabAggregate, mapReady, unit]);

  useEffect(() => {
    const group = markerLayer.current;
    const leaflet = leafletRef.current;
    if (!group || !leaflet) return;

    group.clearLayers();
    fasilitas.forEach((row) => {
      const lat = Number.parseFloat(row.r108_latitude);
      const lng = Number.parseFloat(row.r108_longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const info = STATUS_INFO[row.r109] ?? { label: "Lain", color: "hsl(0 0% 50%)" };
      const marker = leaflet
        .circleMarker([lat, lng], {
          radius: 5,
          color: "#fff",
          weight: 1.5,
          fillColor: info.color,
          fillOpacity: 0.95,
        })
        .addTo(group);

      marker.bindPopup(`<div style="font-family:system-ui;min-width:180px">
        <b>${row.nama || "-"}</b>
        <span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:8px;background:${info.color};color:#fff;font-size:10px">${info.label}</span>
        <br/>
        <span style="color:#666;font-size:11px">${row.kab || ""} ${row.kec ? `· ${row.kec}` : ""}</span><br/>
        <span style="font-size:11px">${row.r107 || ""}</span>
        ${row.r602 ? `<br/><span style="font-size:11px;color:#666">📞 ${row.r602}</span>` : ""}
      </div>`);
    });
  }, [fasilitas, mapReady]);

  return <div ref={mapRef} style={{ height: "100%", width: "100%" }} />;
}
