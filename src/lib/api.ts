const BASE_URL = "https://script.google.com/macros/s/AKfycbxpFf7FeULKVl2bmoDCaqOWb5aZJ5lBrZ-MvXspDUJk2XLuqOiI4UVNx6uCRUw6u6LbqQ/exec";
const BASE_URL_PETA = "https://script.google.com/macros/s/AKfycbwj8ifDsckah8TARikoWmCarXmUOdNyjYEaCiA2EEOUmgZ83N4bo8HboIP5JVVBznGq/exec";

export type Kategori = "LTS" | "LTT" | "LTU";

export interface PerusahaanRow {
  KIP?: string;
  "Kode Kabupaten/Kota"?: string;
  "Nama Kab/Kota"?: string;
  "Nama Kecamatan"?: string;
  "Nama Desa/Kelurahan"?: string;
  "Nama Perusahaan/Farm"?: string;
  Alamat?: string;
  "Kode Pos"?: string;
  "Telp/Fax"?: string;
  Email?: string;
  "Kondisi Perusahaan"?: string;
  "Kegiatan Utama"?: string;
  "Tgl Submit Dokumen"?: string;
  "Kendala Pendataan"?: string;
  Koordinat?: string;
  kategori?: Kategori;
}

export interface RekapRow {
  kode: string;
  nama: string;
  target: number;
  realisasi: number;
  persen: number;
}

export async function fetchData(sheet: Kategori): Promise<PerusahaanRow[]> {
  const res = await fetch(`${BASE_URL}?action=data&sheet=${sheet}`);
  return res.json();
}

export async function fetchPetaData(sheet: Kategori): Promise<PerusahaanRow[]> {
  const res = await fetch(`${BASE_URL_PETA}?sheet=${sheet}`);
  const data = await res.json();
  return data.map((d: PerusahaanRow) => ({ ...d, kategori: sheet }));
}

export function buildRekap(data: PerusahaanRow[]): RekapRow[] {
  const kabData: Record<string, { target: number; realisasi: number; kode: string }> = {};

  data.forEach(row => {
    const kab = row["Nama Kab/Kota"];
    const kodeKab = row["Kode Kabupaten/Kota"];
    if (!kab) return;

    if (!kabData[kab]) {
      kabData[kab] = { target: 0, realisasi: 0, kode: kodeKab || "-" };
    }
    kabData[kab].target++;
    if (row["Tgl Submit Dokumen"]) {
      kabData[kab].realisasi++;
    }
  });

  return Object.keys(kabData).map(kab => {
    const { target, realisasi, kode } = kabData[kab];
    const persen = target > 0 ? parseFloat(((realisasi / target) * 100).toFixed(1)) : 0;
    return { kode, nama: kab, target, realisasi, persen };
  });
}

export function formatTanggal(tanggalString?: string): string {
  if (!tanggalString) return "";
  return new Date(tanggalString).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export const KATEGORI_INFO: Record<Kategori, { label: string; description: string; deadline: string; color: string }> = {
  LTS: { label: "LTS", description: "Perusahaan Sapi Perah", deadline: "5 April 2026", color: "hsl(168 80% 30%)" },
  LTT: { label: "LTT", description: "Perusahaan Ternak Besar/Kecil", deadline: "30 April 2026", color: "hsl(36 95% 55%)" },
  LTU: { label: "LTU", description: "Perusahaan Ternak Unggas", deadline: "7 Juni 2026", color: "hsl(220 70% 55%)" },
};
