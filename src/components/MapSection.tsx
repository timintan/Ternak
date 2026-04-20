import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPetaData, KATEGORI_INFO, type Kategori, type PerusahaanRow } from "@/lib/api";
import { MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

type LeafletModule = typeof import("leaflet");

const KATEGORI_LIST: Kategori[] = ["LTS", "LTT", "LTU"];

export default function MapSection() {
  const queries = KATEGORI_LIST.map(k =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({ queryKey: ["peta", k], queryFn: () => fetchPetaData(k), staleTime: 10 * 60 * 1000 })
  );

  const isLoading = queries.some(q => q.isLoading);
  const allData = queries.flatMap(q => q.data || []);

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="glass-card rounded-xl p-4 flex items-center gap-4">
        <MapPin size={18} className="text-primary" />
        <span className="text-sm font-medium">Peta Sebaran Perusahaan Peternakan</span>
        <div className="ml-auto flex gap-3">
          {KATEGORI_LIST.map(k => (
            <span key={k} className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-full" style={{ background: KATEGORI_INFO[k].color }} />
              {k}
            </span>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden stat-shadow" style={{ height: 500 }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <LeafletMap data={allData} />
        )}
      </div>
    </div>
  );
}

function LeafletMap({ data }: { data: PerusahaanRow[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import("leaflet").Map | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    let cancelled = false;

    void import("leaflet").then(L => {
      if (!mapRef.current || cancelled || mapInstance.current) return;

      leafletRef.current = L;
      const map = L.map(mapRef.current).setView([-7.2, 110.0], 8);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      mapInstance.current = map;
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      mapInstance.current?.remove();
      mapInstance.current = null;
      leafletRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    const colorMap: Record<string, string> = {
      LTS: "#2e9d5c",
      LTT: "#e8a020",
      LTU: "#d32f2f",
    };

    const markers: import("leaflet").CircleMarker[] = [];

    data.forEach(row => {
      const koordinat = row.Koordinat;
      if (!koordinat) return;
      const parts = koordinat.split(",");
      if (parts.length !== 2) return;
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = L.circleMarker([lat, lng], {
        radius: 6,
        color: colorMap[row.kategori || "LTS"],
        fillOpacity: 0.8,
      }).addTo(map);

      marker.bindPopup(
        `<b>${row["Nama Perusahaan/Farm"] || "-"}</b><br/>${row["Nama Kab/Kota"] || ""}<br/>${row.kategori || ""}`
      );

      markers.push(marker);
    });

    return () => {
      markers.forEach(m => map.removeLayer(m));
    };
  }, [data, mapReady]);

  return <div ref={mapRef} style={{ height: "100%", width: "100%" }} />;
}
