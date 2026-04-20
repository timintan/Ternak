import { BarChart3, Database, Map, PieChart, FileText, AlertTriangle, ChevronDown, Building2, ClipboardList, BookUser } from "lucide-react";
import { useState } from "react";

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const SUB_ITEMS_PETERNAKAN = [
  { id: "data", label: "Data Monitoring", icon: Database },
  { id: "peta", label: "Peta", icon: Map },
  { id: "grafik", label: "Grafik", icon: PieChart },
  { id: "rekap", label: "Rekap", icon: FileText },
  { id: "anomali", label: "Anomali Data", icon: AlertTriangle },
];

const SUB_ITEMS_LPTB = [
  { id: "direktori", label: "Direktori", icon: BookUser },
  { id: "data", label: "Data Monitoring", icon: Database },
  { id: "pemotongan", label: "Data Pemotongan", icon: FileText },
  { id: "peta", label: "Peta", icon: Map },
  { id: "grafik", label: "Grafik", icon: PieChart },
  { id: "rekap", label: "Rekap", icon: FileText },
  { id: "anomali", label: "Anomali Data", icon: AlertTriangle },
];

const GROUPS = [
  { id: "peternakan", label: "Perusahaan Peternakan", icon: Building2, subItems: SUB_ITEMS_PETERNAKAN },
  { id: "lptb", label: "LPTB", icon: ClipboardList, subItems: SUB_ITEMS_LPTB },
];

export default function DashboardSidebar({ activeTab, onTabChange }: Props) {
  const initialOpen = GROUPS.reduce((acc, g) => {
    acc[g.id] = activeTab.startsWith(`${g.id}-`);
    return acc;
  }, {} as Record<string, boolean>);
  // default open Perusahaan Peternakan jika tidak ada yang aktif
  if (!Object.values(initialOpen).some(Boolean)) initialOpen.peternakan = true;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);

  const toggleGroup = (id: string) =>
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

  const isDashboardActive = activeTab === "dashboard";

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen gradient-hero">
      <div className="p-6">
        <h1 className="text-lg font-bold text-primary-foreground tracking-tight">
          Monitoring Peternakan
        </h1>
        <p className="text-xs text-sidebar-foreground/60 mt-1">Pemasukan Dokumen Perusahaan</p>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {/* Dashboard */}
        <button
          onClick={() => onTabChange("dashboard")}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            isDashboardActive
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          }`}
        >
          <BarChart3 size={18} />
          Dashboard
        </button>

        {/* Groups */}
        {GROUPS.map(group => {
          const GroupIcon = group.icon;
          const isOpen = openGroups[group.id];
          return (
            <div key={group.id} className="pt-2">
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
              >
                <span className="flex items-center gap-2">
                  <GroupIcon size={14} />
                  {group.label}
                </span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="mt-1 ml-2 pl-2 border-l border-sidebar-border space-y-1">
                  {group.subItems.map(item => {
                    const Icon = item.icon;
                    const tabId = `${group.id}-${item.id}`;
                    const isActive = activeTab === tabId;
                    return (
                      <button
                        key={tabId}
                        onClick={() => onTabChange(tabId)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        }`}
                      >
                        <Icon size={16} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="p-4 m-3 rounded-lg bg-sidebar-accent/50">
        <p className="text-xs text-sidebar-foreground/60">© 2026 BPS Jawa Tengah</p>
      </div>
    </aside>
  );
}
