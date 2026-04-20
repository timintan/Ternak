import { BarChart3, Database, Map, PieChart, FileText, AlertTriangle, Menu, X, ChevronDown, Building2, ClipboardList, BookUser } from "lucide-react";
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

export default function MobileNav({ activeTab, onTabChange }: Props) {
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    peternakan: activeTab.startsWith("peternakan-") || true,
    lptb: activeTab.startsWith("lptb-"),
  });

  const toggleGroup = (id: string) =>
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSelect = (tab: string) => {
    onTabChange(tab);
    setOpen(false);
  };

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between px-4 py-3 gradient-hero">
        <h1 className="text-sm font-bold text-primary-foreground">Monitoring Peternakan</h1>
        <button onClick={() => setOpen(!open)} className="text-primary-foreground">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="gradient-hero px-3 pb-3 space-y-1 animate-fade-in">
          <button
            onClick={() => handleSelect("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "dashboard"
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent"
            }`}
          >
            <BarChart3 size={16} />
            Dashboard
          </button>

          {GROUPS.map(group => {
            const GroupIcon = group.icon;
            const isOpen = openGroups[group.id];
            return (
              <div key={group.id} className="pt-1">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60"
                >
                  <span className="flex items-center gap-2">
                    <GroupIcon size={14} />
                    {group.label}
                  </span>
                  <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="ml-2 pl-2 border-l border-sidebar-border space-y-1">
                    {group.subItems.map(item => {
                      const Icon = item.icon;
                      const tabId = `${group.id}-${item.id}`;
                      const isActive = activeTab === tabId;
                      return (
                        <button
                          key={tabId}
                          onClick={() => handleSelect(tabId)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent"
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
        </div>
      )}
    </div>
  );
}
