import Papa from "papaparse";

const BASE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQfgugug8G_6oeO9gVF55f83DoOutFxWMl9kUD_GqvebNGfm0vQKgpjLs4ZLCJjboIdlHmtoe70HzmG/pub";

export const PEMOTONGAN_URLS: Record<number, string> = {
  2024: `${BASE}?gid=560858614&single=true&output=csv`,
  2025: `${BASE}?gid=0&single=true&output=csv`,
  2026: `${BASE}?gid=1512178632&single=true&output=csv`,
};

export const PRODUKSI_URLS: Record<number, string> = {
  2024: `${BASE}?gid=1307584590&single=true&output=csv`,
  2025: `${BASE}?gid=437912486&single=true&output=csv`,
  2026: `${BASE}?gid=748891868&single=true&output=csv`,
};

export const TAHUN_LIST = [2024, 2025, 2026];

export const cleanLabel = (s?: string) => (s ? s.replace(/^\d+\s*[-.]\s*/, "").trim() : "");
export const parseNum = (s?: string) => {
  if (!s) return 0;
  const n = parseFloat(String(s).replace(",", "."));
  return isNaN(n) ? 0 : n;
};

export const TERNAK_COLS = [
  "1 - Sapi Potong Lokal",
  "2 - Sapi Potong Ex Impor",
  "3 - Sapi Perah",
  "4 - Kerbau",
  "5 - Kuda",
  "6 - Domba",
  "7 - Kambing",
  "8 - Babi",
] as const;

export type TernakCol = typeof TERNAK_COLS[number];

export interface PemotonganRow {
  Tahun: string;
  Bulan: string;
  Provinsi: string;
  Kabupaten: string;
  "Jumlah RPH/TPH Aktif/Baru": string;
  "Jumlah RPH/TPH Ada Pemotongan": string;
  [key: string]: string;
}

export interface ProduksiRow {
  Tahun: string;
  Ternak: string;
  Bulan: string;
  Provinsi: string;
  Kabupaten: string;
  "Jumlah Ternak Dipotong": string;
  "Berat Hidup": string;
  Karkas: string;
  Jeroan: string;
  "Kulit Basah": string;
  Lainnya: string;
  Daging: string;
}

type PemotonganSourceRow = PemotonganRow & {
  Periode?: string;
  PROVINSI?: string;
  KABUPATEN?: string;
  Ternak?: string;
  "Ada Pemotongan [201=1]"?: string;
  "Jumlah Dipotong [203]"?: string;
};

const TERNAK_LOOKUP: Record<string, TernakCol> = Object.fromEntries(
  TERNAK_COLS.map(col => [cleanLabel(col).toLowerCase(), col])
) as Record<string, TernakCol>;

async function fetchCsv<T>(url: string): Promise<T[]> {
  const res = await fetch(url);
  const text = await res.text();
  const parsed = Papa.parse<T>(text, { header: true, skipEmptyLines: true });
  return parsed.data;
}

export async function fetchPemotongan(tahun: number): Promise<PemotonganRow[]> {
  const rows = await fetchCsv<PemotonganSourceRow>(PEMOTONGAN_URLS[tahun]);
  if (!rows.length || !("KABUPATEN" in rows[0]) || !("Jumlah Dipotong [203]" in rows[0])) {
    return rows as PemotonganRow[];
  }

  const grouped = new Map<string, PemotonganRow>();

  rows.forEach(row => {
    const bulan = String(row.Periode || row.Bulan || "").trim();
    const provinsi = cleanLabel(row.PROVINSI || row.Provinsi || "");
    const kabupaten = cleanLabel(row.KABUPATEN || row.Kabupaten || "");
    const key = [row.Tahun || "", bulan, provinsi, kabupaten].join("|");

    if (!grouped.has(key)) {
      const base: PemotonganRow = {
        Tahun: String(row.Tahun || "").trim(),
        Bulan: bulan,
        Provinsi: provinsi,
        Kabupaten: kabupaten, // sudah dibersihkan dari kode angka
        "Jumlah RPH/TPH Aktif/Baru": "0",
        "Jumlah RPH/TPH Ada Pemotongan": "0",
      };
      TERNAK_COLS.forEach(col => {
        base[col] = "0";
      });
      grouped.set(key, base);
    }

    const target = grouped.get(key)!;
    const ternakKey = cleanLabel(row.Ternak).toLowerCase();
    const ternakCol = TERNAK_LOOKUP[ternakKey];
    const jumlahDipotong = parseNum(row["Jumlah Dipotong [203]"]);
    const jumlahPemotongan = parseNum(row["Ada Pemotongan [201=1]"]);

    if (ternakCol) {
      target[ternakCol] = String(parseNum(target[ternakCol]) + jumlahDipotong);
    }

    const currentRph = parseNum(target["Jumlah RPH/TPH Ada Pemotongan"]);
    if (jumlahPemotongan > currentRph) {
      target["Jumlah RPH/TPH Ada Pemotongan"] = String(jumlahPemotongan);
      target["Jumlah RPH/TPH Aktif/Baru"] = String(jumlahPemotongan);
    }
  });

  return Array.from(grouped.values());
}

export async function fetchProduksi(tahun: number): Promise<ProduksiRow[]> {
  return fetchCsv<ProduksiRow>(PRODUKSI_URLS[tahun]);
}
