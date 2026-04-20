import { useState, lazy, Suspense } from "react";
import { Construction } from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileNav from "@/components/MobileNav";
import DashboardOverview from "@/components/DashboardOverview";
import DataMonitoring from "@/components/DataMonitoring";
const MapSection = lazy(() => import("@/components/MapSection"));
import ChartSection from "@/components/ChartSection";
import RekapSection from "@/components/RekapSection";
import AnomalySection from "@/components/AnomalySection";
import LptbDirektoriSection from "@/components/LptbDirektoriSection";
import LptbPemotonganSection from "@/components/LptbPemotonganSection";
const LptbPetaSection = lazy(() => import("@/components/LptbPetaSection"));

const TITLES: Record<string, string> = {
  dashboard: "Dashboard Overview",
  "peternakan-data": "Data Monitoring · Perusahaan Peternakan",
  "peternakan-peta": "Peta Sebaran · Perusahaan Peternakan",
  "peternakan-grafik": "Grafik & Statistik · Perusahaan Peternakan",
  "peternakan-rekap": "Rekap Data · Perusahaan Peternakan",
  "peternakan-anomali": "Anomali Data · Perusahaan Peternakan",
  "lptb-direktori": "Direktori · LPTB",
  "lptb-data": "Data Monitoring · LPTB",
  "lptb-peta": "Peta Sebaran · LPTB",
  "lptb-grafik": "Grafik & Statistik · LPTB",
  "lptb-rekap": "Rekap Data · LPTB",
  "lptb-pemotongan": "Data Pemotongan · LPTB",
  "lptb-anomali": "Anomali Data · LPTB",
};

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
        <Construction className="w-8 h-8 text-accent" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">{label}</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        Modul LPTB sedang dalam tahap pengembangan. Data dan visualisasi akan tersedia segera.
      </p>
    </div>
  );
}

export default function Index() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    if (activeTab === "dashboard") return <DashboardOverview />;

    const [group, sub] = activeTab.split("-");

    if (group === "peternakan") {
      switch (sub) {
        case "data": return <DataMonitoring />;
        case "peta": return <MapSection />;
        case "grafik": return <ChartSection />;
        case "rekap": return <RekapSection />;
        case "anomali": return <AnomalySection />;
      }
    }

    if (group === "lptb") {
      if (sub === "direktori") return <LptbDirektoriSection />;
      if (sub === "pemotongan") return <LptbPemotonganSection />;
      if (sub === "peta") return <LptbPetaSection />;
      return <ComingSoon label={`LPTB · ${sub.charAt(0).toUpperCase() + sub.slice(1)}`} />;
    }

    return null;
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col min-h-screen">
        <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
        <header className="hidden lg:flex items-center justify-between px-8 py-5 border-b border-border/50">
          <h2 className="text-xl font-bold text-foreground">{TITLES[activeTab] || "Monitoring"}</h2>
          <span className="text-xs text-muted-foreground">Monitoring Pemasukan Dokumen Perusahaan Peternakan</span>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Suspense fallback={<div className="p-8 text-muted-foreground">Memuat...</div>}>
            {renderContent()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
