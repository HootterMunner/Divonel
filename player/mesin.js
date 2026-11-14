/* ═══ player/mesin.js — mesin cerita ═══
   Inti mesin, ekspresi/syarat/efek (data), pemeriksa statis, tema, elemen tampilan, modul teks dasar.
   Ikut ke HTML ekspor. Tidak boleh memakai apa pun dari editor/. Jangan ubah tanpa alasan kuat. */
const Mesin=(()=>{
/**
 * modul-scene.mjs  —  v0.2
 *
 * Kernel "scene bertipe" + dua modul contoh (teks dasar dan RPG bergiliran).
 * Satu file, tanpa dependensi. Uji dan demo: node modul-scene.mjs --demo
 *
 * PERUBAHAN DARI v0.1
 *   Keamanan dan ketahanan
 *   - Validasi cerita sebelum dimainkan (inti.validasi()): tujuan hilang, jenis belum dipasang,
 *     struktur syarat/efek salah, tema tertolak. mulai() menolak cerita yang punya galat.
 *   - kirim() bersifat atomik: bila ada galat atau input ditolak, status dan `lokal` dipulihkan.
 *   - Nilai status dibatasi (angka, teks, benar/salah, daftar sederhana) agar selalu bisa disimpan.
 *   - Input pemain dibersihkan (bidang primitif saja). Batas kedalaman/ukuran ekspresi,
 *     batas lompatan beruntun (anti-siklus), batas jumlah variabel.
 *   - Elemen tampilan divalidasi isinya (skema), bukan hanya namanya. gambar() menerima ctx hanya-baca.
 *   - Tema: warna hanya #rgb/#rrggbb, ada pemeriksaan kontras, token tambahan (jarak, lebar, radius).
 *   - pasang() menerima kait `verifikasi` dari host (hash/tanda tangan). NB: inti BUKAN sandbox;
 *     isolasi nyata (Worker/iframe/runtime terpisah) tugas host.
 *   Kemampuan
 *   - Ekspresi: angka tetap atau {dari}, {hitung:[op,a,b]}, {panjang}, {acak:[a,b]}, {acakBerbobot:[[nilai,bobot],..]}. Syarat bisa
 *     membandingkan dua variabel. Efek: set/tambah/kurang/kali/bagi, jika/maka/lain, pergi, daftar apa pun,
 *     perulangan {jenis:"ulang",kali,maka} dan {jenis:"selama",syarat,maka} (maks 100 putaran per loop).
 *   - Efek saat masuk scene (`saatMasuk`), pilihan tanpa `ke` (efek saja), templat {nama variabel}.
 *   - Siklus hidup modul: validasi, keluar, perbarui(dt), simpan/pulihkan. Simpan/muat game lengkap.
 *   - Notifikasi digabung: satu kabar per aksi, bukan satu per penulisan status.
 *
 * KONTRAK MODUL
 *   {
 *     nama, versi?,
 *     jenisScene: { <jenis>: { perintah?, validasi?, muat, gambar, tangani, keluar?, perbarui?, simpan?, pulihkan? } },
 *     tabel?:     { <namaTabel>: { <kunci>: {..data..} } },
 *     komponen?:  [nama..]  atau  { nama: { wajib:{bidang:cek}, opsional:{bidang:cek} } },
 *   }
 *   validasi({ scene, nama, adaScene, lapor, ctx })
 *   muat({ scene, ctx })                      -> lokal (HARUS data JSON biasa)
 *   gambar({ scene, lokal, ctx })             -> [elemen]   (murni; ctx hanya-baca)
 *   tangani({ input, scene, lokal, ctx })     -> false jika ditolak
 *   keluar({ scene, lokal, ctx })             -> bersihkan sumber daya (sebaiknya idempoten)
 *   perbarui({ dt, scene, lokal, ctx })       -> untuk waktu nyata; dt dalam detik
 *   simpan({ lokal }) / pulihkan({ data, scene, ctx }) -> opsional; bawaan: salinan JSON
 *   ctx: status{baca,tulis,punya,tambahItem,hapusItem}, tabel, acak, adaScene, pindahKe, syarat, efek, lapor
 *
 * TINGKAT KEPERCAYAAN
 *   Data cerita = tidak dipercaya, tidak pernah dieksekusi. Modul = kode, dipercaya hanya setelah
 *   diperiksa dan (idealnya) dijalankan terisolasi.
 */

// ───────────────────────── Dasar dan batas ─────────────────────────

const KUNCI_TERLARANG = new Set(["__proto__", "constructor", "prototype"]);
const BATAS = { kunci: 64, teks: 10000, daftar: 1000, kedalaman: 16, simpul: 500, lompat: 50, variabel: 1000, putaran: 100, putaranTotal: 10000 };

const biasa = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const ringkas = (v) => {
  try {
    return String(JSON.stringify(v)).slice(0, 80);
  } catch {
    return String(v).slice(0, 80);
  }
};
const salin = (v) => JSON.parse(JSON.stringify(v));
const primitif = (v) =>
  v === null ||
  typeof v === "boolean" ||
  (typeof v === "number" && Number.isFinite(v)) ||
  (typeof v === "string" && v.length <= BATAS.teks);

function cekKunci(k) {
  if (
    typeof k !== "string" || k === "" || k.length > BATAS.kunci || k !== k.trim() ||
    KUNCI_TERLARANG.has(k) || /[\u0000-\u001f{}]/.test(k)
  ) {
    throw new Error(`Kunci status tidak valid: ${ringkas(k)}`);
  }
  return k;
}

function validasiNilai(v, k) {
  if (primitif(v)) return v;
  if (Array.isArray(v) && v.length <= BATAS.daftar && v.every(primitif)) return [...v];
  throw new Error(`Nilai status "${k}" tidak valid (hanya angka, teks, benar/salah, atau daftar sederhana)`);
}

// ───────────────────────── Status bersama ─────────────────────────

function buatStatus(awal = {}) {
  let data = Object.create(null); // tanpa prototipe: kebal polusi prototipe
  let jumlah = 0;
  const pendengar = new Set();
  const kabar = (k, v, l) => {
    for (const f of [...pendengar]) f(k, v, l);
  };
  const sama = (a, b) =>
    a === b || (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]));

  const status = {
    baca(k) {
      cekKunci(k);
      const v = data[k];
      return Array.isArray(v) ? [...v] : v;
    },
    tulis(k, v) {
      cekKunci(k);
      v = validasiNilai(v, k);
      if (!(k in data)) {
        if (jumlah >= BATAS.variabel) throw new Error("Terlalu banyak variabel");
        jumlah++;
      }
      const lama = data[k];
      data[k] = v;
      if (!sama(lama, v)) kabar(k, v, lama);
    },
    daftar(nama) {
      const v = status.baca(nama);
      if (v === undefined || v === null) return [];
      if (!Array.isArray(v)) throw new Error(`"${nama}" bukan daftar`);
      return v;
    },
    punya(item, daftar = "inventaris") {
      const v = status.baca(daftar);
      return Array.isArray(v) && v.includes(item);
    },
    tambahItem(item, daftar = "inventaris") {
      if (!primitif(item) || item === null) throw new Error(`Item tidak valid: ${ringkas(item)}`);
      status.tulis(daftar, [...status.daftar(daftar), item]);
    },
    hapusItem(item, daftar = "inventaris") {
      const l = status.daftar(daftar);
      const i = l.indexOf(item);
      if (i < 0) return false;
      l.splice(i, 1);
      status.tulis(daftar, l);
      return true;
    },
    dengar(f) {
      pendengar.add(f);
      return () => pendengar.delete(f);
    },
    potret() {
      return JSON.parse(JSON.stringify(data));
    },
    /** Atomik: semua divalidasi dulu; bila ada yang salah, status lama tidak berubah. */
    pulihkan(p) {
      if (!biasa(p)) throw new Error("Potret status harus objek");
      const baru = Object.create(null);
      let n = 0;
      for (const [k, v] of Object.entries(p)) {
        cekKunci(k);
        baru[k] = validasiNilai(v, k);
        n++;
      }
      if (n > BATAS.variabel) throw new Error("Terlalu banyak variabel");
      data = baru;
      jumlah = n;
      kabar("*", undefined, undefined);
    },
  };
  for (const [k, v] of Object.entries(awal)) status.tulis(k, v);
  return status;
}

// ───────────────── Ekspresi, syarat, efek (data, bukan kode) ─────────────────

const urut = (f) => (a, b) => typeof a === typeof b && (typeof a === "number" || typeof a === "string") ? f(a, b) : false;
const OP_BANDING = new Map([
  ["==", (a, b) => (a ?? null) === (b ?? null)],
  ["!=", (a, b) => (a ?? null) !== (b ?? null)],
  [">", urut((a, b) => a > b)],
  [">=", urut((a, b) => a >= b)],
  ["<", urut((a, b) => a < b)],
  ["<=", urut((a, b) => a <= b)],
]);

const angka = (v) => {
  if (v === undefined || v === null) return 0;
  if (typeof v === "number") return v;
  throw new Error(`Bukan angka: ${ringkas(v)}`);
};
const OP_HITUNG = new Map([
  ["+", (a, b) => (typeof a === "string" || typeof b === "string" ? String(a ?? "") + String(b ?? "") : angka(a) + angka(b))],
  ["-", (a, b) => angka(a) - angka(b)],
  ["*", (a, b) => angka(a) * angka(b)],
  ["/", (a, b) => {
    if (angka(b) === 0) throw new Error("Dibagi nol");
    return angka(a) / angka(b);
  }],
  ["%", (a, b) => {
    if (angka(b) === 0) throw new Error("Dibagi nol");
    return angka(a) % angka(b);
  }],
  ["min", (a, b) => Math.min(angka(a), angka(b))],
  ["maks", (a, b) => Math.max(angka(a), angka(b))],
  ["bulat", (a) => Math.round(angka(a))],
  ["abs", (a) => Math.abs(angka(a))],
]);
const OP_EFEK = new Set(["set", "tambah", "kurang", "kali", "bagi"]);

function jaga(d, h) {
  if (++h.n > BATAS.simpul || d > BATAS.kedalaman) throw new Error("Ekspresi atau syarat terlalu rumit");
}

/** Memeriksa daftar [[nilai, bobot], ...]. Mengembalikan teks galat, atau null bila sah. */
function cekBerbobot(d) {
  if (!Array.isArray(d) || d.length === 0) return "acakBerbobot butuh daftar [[nilai, bobot], ...] yang tidak kosong";
  if (d.length > BATAS.daftar) return `acakBerbobot terlalu panjang (maksimal ${BATAS.daftar} pilihan)`;
  let total = 0;
  for (let i = 0; i < d.length; i++) {
    const p = d[i];
    if (!Array.isArray(p) || p.length !== 2) return `acakBerbobot: pilihan #${i + 1} harus berbentuk [nilai, bobot]`;
    if (p[0] === null || !primitif(p[0])) return `acakBerbobot: nilai pilihan #${i + 1} harus angka, teks, atau benar/salah`;
    if (typeof p[1] !== "number" || !Number.isFinite(p[1]) || p[1] < 0) return `acakBerbobot: bobot pilihan #${i + 1} harus angka 0 atau lebih`;
    total += p[1];
  }
  if (!(total > 0)) return "acakBerbobot: total bobot harus lebih dari 0";
  return null;
}
function pilihBerbobot(d, acak) {
  const galat = cekBerbobot(d);
  if (galat) throw new Error(galat);
  const total = d.reduce((a, p) => a + p[1], 0);
  let r = acak() * total, terakhir = null;
  for (const [v, b] of d) {
    if (b <= 0) continue;
    terakhir = v;
    if (r < b) return v;
    r -= b;
  }
  return terakhir; // jaga-jaga pembulatan desimal
}

/** Ekspresi: nilai tetap | {dari:"var"} | {panjang:"daftar"} | {acak:[a,b]} | {acakBerbobot:[[nilai,bobot],..]} | {hitung:[op,a,b]} */
function hitung(x, status, acak = Math.random, d = 0, h = { n: 0 }) {
  jaga(d, h);
  if (x === null || typeof x === "boolean" || typeof x === "string") return x;
  if (typeof x === "number") {
    if (!Number.isFinite(x)) throw new Error("Angka tidak valid");
    return x;
  }
  if (!biasa(x)) throw new Error(`Ekspresi tidak dikenal: ${ringkas(x)}`);
  const r = (y) => hitung(y, status, acak, d + 1, h);
  if (x.dari !== undefined) return status.baca(x.dari);
  if (x.panjang !== undefined) {
    const v = status.baca(x.panjang);
    return Array.isArray(v) || typeof v === "string" ? v.length : 0;
  }
  if (x.acak !== undefined) {
    const [a, b] = Array.isArray(x.acak) ? x.acak : [];
    if (!Number.isInteger(a) || !Number.isInteger(b) || a > b || b - a > 1e6) throw new Error(`Rentang acak tidak valid: ${ringkas(x.acak)}`);
    return a + Math.floor(acak() * (b - a + 1));
  }
  if (x.acakBerbobot !== undefined) return pilihBerbobot(x.acakBerbobot, acak);
  if (x.hitung !== undefined) {
    if (!Array.isArray(x.hitung)) throw new Error("'hitung' harus berupa daftar [op, a, b]");
    const [op, a, b] = x.hitung;
    const f = OP_HITUNG.get(op);
    if (!f) throw new Error(`Operator hitung tidak dikenal: ${ringkas(op)}`);
    const hasil = f(r(a), b === undefined ? undefined : r(b));
    if (typeof hasil === "number" && !Number.isFinite(hasil)) throw new Error("Hasil hitung tidak valid");
    return hasil;
  }
  throw new Error(`Ekspresi tidak dikenal: ${ringkas(x)}`);
}

/** Contoh: { dan:[ {kunci:"emas",op:">=",nilai:5}, {punya:"surat"} ] }; {kiri:{dari:"a"},op:"<",kanan:{dari:"b"}} */
function evaluasiSyarat(s, status, acak = Math.random, d = 0, h = { n: 0 }) {
  if (s === undefined || s === null) return true;
  jaga(d, h);
  if (!biasa(s)) throw new Error(`Syarat tidak valid: ${ringkas(s)}`);
  const re = (y) => evaluasiSyarat(y, status, acak, d + 1, h);
  if (Array.isArray(s.dan)) return s.dan.every(re);
  if (Array.isArray(s.atau)) return s.atau.some(re);
  if (s.bukan !== undefined) return !re(s.bukan);
  if (s.punya !== undefined) return status.punya(s.punya, s.di);
  if (s.benar !== undefined) return Boolean(hitung(s.benar, status, acak, d + 1, h));
  const banding = OP_BANDING.get(s.op);
  if (!banding) throw new Error(`Syarat tidak dikenal: ${ringkas(s)}`);
  const kiri = s.kiri !== undefined ? s.kiri : { dari: s.kunci };
  const kanan = s.kanan !== undefined ? s.kanan : s.nilai;
  return banding(hitung(kiri, status, acak, d + 1, h), hitung(kanan, status, acak, d + 1, h));
}

/**
 * Efek: {kunci,op,nilai} | {item,di?} | {buang,di?} | {jika,maka?,lain?} | {pergi}
 * Mengembalikan { pergi } bila ada perintah pindah scene (efek sesudahnya dilewati).
 */
function terapkanEfek(daftar, status, { acak = Math.random } = {}, d = 0, h = { n: 0 }) {
  if (daftar === undefined || daftar === null) return { pergi: null };
  if (!Array.isArray(daftar)) throw new Error("Efek harus berupa daftar");
  const akar = h.akar || h; // penghitung bersama untuk semua loop dalam satu panggilan
  for (const e of daftar) {
    jaga(d, h);
    if (!biasa(e)) throw new Error(`Efek tidak valid: ${ringkas(e)}`);
    if (e.jenis === "selama" || e.jenis === "ulang") {
      // Tiap putaran memakai penghitung simpul baru, supaya loop 100 kali tidak habis jatah ekspresi.
      const putar = () => {
        if (++akar.putar > BATAS.putaranTotal) throw new Error("Terlalu banyak putaran perulangan secara keseluruhan");
        return terapkanEfek(e.maka, status, { acak }, d + 1, { n: 0, akar });
      };
      akar.putar = akar.putar || 0;
      if (e.jenis === "selama") {
        if (e.syarat === undefined) throw new Error("selama butuh syarat");
        let n = 0;
        while (evaluasiSyarat(e.syarat, status, acak, d + 1, { n: 0, akar })) {
          if (++n > BATAS.putaran) throw new Error("selama: terlalu banyak iterasi (mungkin tak berujung)");
          const hasil = putar();
          if (hasil.pergi) return hasil;
        }
      } else {
        const k = angka(hitung(e.kali, status, acak, d + 1, { n: 0, akar }));
        if (k < 0) throw new Error("ulang: jumlah tidak boleh negatif");
        const jumlah = Math.floor(k);
        if (jumlah > BATAS.putaran) throw new Error(`ulang maksimal ${BATAS.putaran}`);
        for (let i = 0; i < jumlah; i++) {
          const hasil = putar();
          if (hasil.pergi) return hasil;
        }
      }
    } else if (e.jika !== undefined) {
      const ok = evaluasiSyarat(e.jika, status, acak, d + 1, h);
      const hasil = terapkanEfek(ok ? e.maka : e.lain, status, { acak }, d + 1, h);
      if (hasil.pergi) return hasil;
    } else if (e.pergi !== undefined) {
      if (typeof e.pergi !== "string") throw new Error("'pergi' harus teks");
      return { pergi: e.pergi };
    } else if (e.item !== undefined) {
      status.tambahItem(hitung(e.item, status, acak), e.di);
    } else if (e.buang !== undefined) {
      status.hapusItem(hitung(e.buang, status, acak), e.di);
    } else if (typeof e.kunci === "string") {
      const op = e.op ?? "set";
      if (!OP_EFEK.has(op)) throw new Error(`Efek tidak dikenal: ${ringkas(e)}`);
      const nilai = hitung(e.nilai, status, acak);
      if (op === "set") {
        status.tulis(e.kunci, nilai);
      } else {
        const a = angka(status.baca(e.kunci));
        const b = angka(nilai);
        if (op === "bagi" && b === 0) throw new Error("Dibagi nol");
        const hasil = op === "tambah" ? a + b : op === "kurang" ? a - b : op === "kali" ? a * b : a / b;
        if (!Number.isFinite(hasil)) throw new Error("Hasil hitung tidak valid");
        status.tulis(e.kunci, hasil);
      }
    } else {
      throw new Error(`Efek tidak dikenal: ${ringkas(e)}`);
    }
  }
  return { pergi: null };
}

// ── Pemeriksa statis: memeriksa BENTUK data tanpa menjalankannya (dipakai validasi cerita) ──

function periksaEkspresi(x, lapor, d = 0) {
  if (d > BATAS.kedalaman) return lapor("ekspresi terlalu dalam");
  if (x === null || typeof x === "boolean" || typeof x === "string") return;
  if (typeof x === "number") return Number.isFinite(x) ? undefined : lapor("angka tidak valid");
  if (!biasa(x)) return lapor(`ekspresi tidak dikenal: ${ringkas(x)}`);
  const kunci = Object.keys(x);
  if (kunci.length !== 1) return lapor(`ekspresi harus punya tepat satu kunci: ${ringkas(x)}`);
  const [n] = kunci;
  const v = x[n];
  if (n === "dari" || n === "panjang") {
    if (typeof v !== "string") lapor(`'${n}' harus nama variabel (teks)`);
  } else if (n === "acak") {
    if (!Array.isArray(v) || v.length !== 2 || !v.every(Number.isInteger) || v[0] > v[1]) lapor("'acak' harus [bawah, atas] bilangan bulat");
  } else if (n === "acakBerbobot") {
    const g = cekBerbobot(v);
    if (g) lapor(g);
  } else if (n === "hitung") {
    if (!Array.isArray(v) || !OP_HITUNG.has(v[0])) lapor(`operator hitung tidak dikenal: ${ringkas(v?.[0])}`);
    else v.slice(1).forEach((y) => periksaEkspresi(y, lapor, d + 1));
  } else {
    lapor(`ekspresi tidak dikenal: ${ringkas(x)}`);
  }
}

function periksaSyarat(s, lapor, d = 0) {
  if (s === undefined || s === null) return;
  if (d > BATAS.kedalaman || !biasa(s)) return lapor(`syarat tidak valid: ${ringkas(s)}`);
  if (s.dan !== undefined || s.atau !== undefined) {
    const l = s.dan ?? s.atau;
    if (!Array.isArray(l)) return lapor("'dan'/'atau' harus berupa daftar");
    return l.forEach((x) => periksaSyarat(x, lapor, d + 1));
  }
  if (s.bukan !== undefined) return periksaSyarat(s.bukan, lapor, d + 1);
  if (s.punya !== undefined) {
    if (!primitif(s.punya) || s.punya === null) lapor("'punya' harus angka atau teks");
    if (s.di !== undefined && typeof s.di !== "string") lapor("'di' harus nama daftar (teks)");
    return;
  }
  if (s.benar !== undefined) return periksaEkspresi(s.benar, lapor);
  if (!OP_BANDING.has(s.op)) return lapor(`operator tidak dikenal: ${ringkas(s.op)}`);
  if (s.kiri === undefined && typeof s.kunci !== "string") lapor("syarat butuh 'kunci' atau 'kiri'");
  if (s.kiri !== undefined) periksaEkspresi(s.kiri, lapor);
  const kanan = s.kanan !== undefined ? s.kanan : s.nilai;
  if (kanan === undefined) lapor("syarat butuh 'nilai' atau 'kanan'");
  else periksaEkspresi(kanan, lapor);
}

function periksaEfek(daftar, lapor, adaScene = null, d = 0) {
  if (daftar === undefined || daftar === null) return;
  if (!Array.isArray(daftar) || d > BATAS.kedalaman) return lapor("efek harus berupa daftar");
  daftar.forEach((e, i) => {
    const l = (m) => lapor(`efek #${i + 1}: ${m}`);
    if (!biasa(e)) return l("bukan objek");
    if (e.jenis !== undefined) {
      if (e.jenis === "selama") {
        if (e.syarat === undefined) l("'selama' butuh 'syarat'");
        else periksaSyarat(e.syarat, l);
      } else if (e.jenis === "ulang") {
        if (e.kali === undefined) l("'ulang' butuh 'kali'");
        else periksaEkspresi(e.kali, l);
      } else {
        return l(`jenis efek tidak dikenal: ${ringkas(e.jenis)}`);
      }
      periksaEfek(e.maka, l, adaScene, d + 1);
    } else if (e.jika !== undefined) {
      periksaSyarat(e.jika, l);
      periksaEfek(e.maka, l, adaScene, d + 1);
      periksaEfek(e.lain, l, adaScene, d + 1);
    } else if (e.pergi !== undefined) {
      if (typeof e.pergi !== "string") l("'pergi' harus teks");
      else if (adaScene && !adaScene(e.pergi)) l(`scene tujuan "${e.pergi}" tidak ada`);
    } else if (e.item !== undefined || e.buang !== undefined) {
      periksaEkspresi(e.item !== undefined ? e.item : e.buang, l);
    } else if (typeof e.kunci === "string") {
      if (!OP_EFEK.has(e.op ?? "set")) l(`op tidak dikenal: ${ringkas(e.op)}`);
      periksaEkspresi(e.nilai, l);
    } else {
      l(`tidak dikenal: ${ringkas(e)}`);
    }
  });
}

/** Mengisi {nama variabel} di teks. Hasilnya TEKS BIASA: host wajib memakai textContent, bukan innerHTML. */
function isiTemplat(teks, status) {
  return String(teks).replace(/\{([^{}\n]{1,64})\}/g, (_, k) => {
    try {
      const v = status.baca(k.trim());
      if (v === undefined || v === null) return "";
      return Array.isArray(v) ? v.join(", ") : String(v);
    } catch {
      return "";
    }
  });
}

// ───────────────────────── Tema (daftar putih) ─────────────────────────

// Hanya #rgb atau #rrggbb. Tanpa kanal alfa, agar teks tidak bisa dibuat transparan/tak terlihat.
const WARNA = (v) => typeof v === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
const dalam = (a, b) => (v) => typeof v === "number" && Number.isFinite(v) && v >= a && v <= b;

const TOKEN_TEMA = {
  warnaLatar: WARNA,
  warnaTeks: WARNA,
  warnaAksen: WARNA,
  font: (v) => ["serif", "sans-serif", "monospace"].includes(v),
  ukuranTeks: dalam(12, 32),
  jarakBaris: dalam(1, 2.5),
  lebarKolom: dalam(280, 900),
  radius: dalam(0, 24),
};

function luminans(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** Rasio kontras WCAG antara dua warna hex (1 sampai 21). */
function kontras(a, b) {
  const [x, y] = [luminans(a), luminans(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Hanya token dikenal bernilai valid yang lolos. Alasan penolakan ditambahkan ke `laporan`. */
function bersihkanTema(tema, laporan = []) {
  const hasil = {};
  if (tema === undefined || tema === null) return hasil;
  if (!biasa(tema)) {
    laporan.push("tema harus objek");
    return hasil;
  }
  for (const token of Object.keys(tema)) {
    if (!Object.hasOwn(TOKEN_TEMA, token)) laporan.push(`token tema tidak dikenal: ${token}`);
    else if (!TOKEN_TEMA[token](tema[token])) laporan.push(`nilai token "${token}" tidak valid`);
    else hasil[token] = tema[token];
  }
  return hasil;
}

// ───────────────────── Elemen tampilan (skema) ─────────────────────

const PERAN = ["biasa", "penting", "peringatan", "bisik"];
const str = (n) => (v) => typeof v === "string" && v.length <= n;
const idOk = (v) => (typeof v === "string" && v.length > 0 && v.length <= 64) || Number.isInteger(v);
const nilaiOk = (v) => typeof v === "number" && Number.isFinite(v);

function dariSkema({ wajib = {}, opsional = {} }) {
  return (e) => {
    for (const k of Object.keys(e)) {
      if (k !== "jenis" && !Object.hasOwn(wajib, k) && !Object.hasOwn(opsional, k)) return `bidang tak dikenal "${k}"`;
    }
    for (const [k, cek] of Object.entries(wajib)) if (!Object.hasOwn(e, k) || !cek(e[k])) return `bidang "${k}" wajib dan harus valid`;
    for (const [k, cek] of Object.entries(opsional)) if (Object.hasOwn(e, k) && !cek(e[k])) return `bidang "${k}" tidak valid`;
    return null;
  };
}

function dataBiasa(v, d = 0) {
  if (primitif(v)) return true;
  if (d > 4) return false;
  if (Array.isArray(v)) return v.length <= 200 && v.every((x) => dataBiasa(x, d + 1));
  if (biasa(v)) {
    const k = Object.keys(v);
    return k.length <= 50 && k.every((n) => !KUNCI_TERLARANG.has(n) && dataBiasa(v[n], d + 1));
  }
  return false;
}
const cekBebas = (e) => (dataBiasa(e) ? null : "isi elemen harus data biasa (tanpa fungsi/objek aneh)");

const ELEMEN_DASAR = {
  judul: dariSkema({ wajib: { isi: str(500) }, opsional: { peran: (v) => PERAN.includes(v) } }),
  teks: dariSkema({ wajib: { isi: str(20000) }, opsional: { peran: (v) => PERAN.includes(v) } }),
  pilihan: dariSkema({ wajib: { id: idOk, label: str(500) }, opsional: { nonaktif: (v) => typeof v === "boolean" } }),
  bar: dariSkema({ wajib: { label: str(100), nilai: (v) => nilaiOk(v) && v >= 0, maks: (v) => nilaiOk(v) && v > 0 } }),
  log: dariSkema({ wajib: { baris: (v) => Array.isArray(v) && v.length <= 50 && v.every(str(500)) } }),
};

// ───────────────────────────── Inti ─────────────────────────────

function bersihkanInput(i) {
  if (!biasa(i) || typeof i.aksi !== "string" || !/^[\p{L}_-]{1,32}$/u.test(i.aksi)) return null;
  const hasil = {};
  const kunci = Object.keys(i);
  if (kunci.length > 8) return null;
  for (const k of kunci) {
    if (KUNCI_TERLARANG.has(k) || k.length > 32) return null;
    const v = i[k];
    if ((typeof v === "string" && v.length <= 64) || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v))) hasil[k] = v;
    else return null; // objek, fungsi, atau teks terlalu panjang: tolak seluruh input
  }
  return hasil;
}

function buatInti({ cerita, status = buatStatus(), acak = Math.random, log = () => {} }) {
  if (!biasa(cerita) || typeof cerita.mulai !== "string" || !biasa(cerita.scene)) {
    throw new Error("Cerita harus punya 'mulai' dan 'scene'");
  }

  const modul = new Map();
  const jenisScene = new Map(); // jenis -> { modul, def }
  const tabelDasar = new Map();
  const komponen = new Map(Object.entries(ELEMEN_DASAR));
  const pendengar = new Set();
  let aktif = null; // { nama, scene, jenis, lokal }
  let kedalaman = 0; // transaksi bersarang
  let kotor = false;
  let lompatan = 0;

  const adaScene = (n) => typeof n === "string" && !KUNCI_TERLARANG.has(n) && Object.hasOwn(cerita.scene, n) && biasa(cerita.scene[n]);

  // ── notifikasi digabung: satu kabar per aksi ──
  const beri = () => {
    if (kedalaman > 0) {
      kotor = true;
      return;
    }
    kotor = false;
    for (const f of [...pendengar]) {
      try {
        f();
      } catch (e) {
        log(`pendengar galat: ${e.message}`);
      }
    }
  };
  status.dengar(beri);

  /** Menjalankan fn secara atomik: galat (atau hasil false bila balikJikaFalse) memulihkan status dan lokal. */
  function aman(fn, balikJikaFalse = false) {
    if (kedalaman === 0) lompatan = 0;
    const cad = { s: status.potret(), a: aktif, l: aktif ? salin(aktif.lokal) : null };
    const pulihkan = () => {
      aktif = cad.a;
      if (aktif) aktif.lokal = cad.l;
      status.pulihkan(cad.s);
    };
    kedalaman++;
    try {
      const hasil = fn();
      if (balikJikaFalse && hasil === false) {
        pulihkan();
        kotor = false;
      }
      return hasil;
    } catch (e) {
      pulihkan();
      throw e;
    } finally {
      kedalaman--;
      if (kedalaman === 0 && kotor) beri();
    }
  }

  const acakLarang = () => {
    throw new Error("acak tidak boleh dipakai saat menggambar tampilan");
  };

  const ctxStatus = Object.freeze({
    baca: status.baca, tulis: status.tulis, punya: status.punya, tambahItem: status.tambahItem, hapusItem: status.hapusItem,
  });
  const tabel = (nama) => {
    if (!tabelDasar.has(nama)) throw new Error(`Tabel "${nama}" tidak ada`);
    const dasar = tabelDasar.get(nama);
    const tim = cerita.tabel && Object.hasOwn(cerita.tabel, nama) && biasa(cerita.tabel[nama]) ? cerita.tabel[nama] : {};
    const hasil = Object.create(null);
    for (const k of new Set([...Object.keys(dasar), ...Object.keys(tim)])) {
      if (KUNCI_TERLARANG.has(k)) continue;
      hasil[k] = Object.freeze({ ...(dasar[k] ?? {}), ...(biasa(tim[k]) ? tim[k] : {}) }); // timpa per kolom
    }
    return Object.freeze(hasil);
  };

  // Pintu modul ke dunia luar. Sempit dan dibekukan. NB: ini bukan sandbox.
  const ctx = Object.freeze({
    status: ctxStatus,
    tabel,
    acak,
    adaScene,
    pindahKe: (nama) => pindahKe(nama),
    syarat: (s) => evaluasiSyarat(s, status, acak),
    efek: (daftar) => terapkanEfek(daftar, status, { acak }),
    lapor: (pesan) => log(String(pesan)),
  });
  // Versi hanya-baca untuk gambar(): tidak bisa menulis status, memindah scene, atau mengacak.
  const ctxBaca = Object.freeze({
    status: Object.freeze({ baca: status.baca, punya: status.punya }),
    tabel,
    adaScene,
    syarat: (s) => evaluasiSyarat(s, status, acakLarang),
    lapor: ctx.lapor,
  });

  function pasang(m, { verifikasi } = {}) {
    if (!biasa(m) || typeof m.nama !== "string" || !m.nama) throw new Error("Modul harus punya 'nama'");
    if (m.versi !== undefined && typeof m.versi !== "string") throw new Error(`Modul "${m.nama}": 'versi' harus teks`);
    if (verifikasi && verifikasi(m) !== true) throw new Error(`Modul "${m.nama}" ditolak oleh verifikasi host`);
    if (modul.has(m.nama)) throw new Error(`Modul "${m.nama}" sudah terpasang`);
    // Validasi semuanya dulu, baru daftarkan: pemasangan bersifat atomik.
    for (const [jenis, def] of Object.entries(m.jenisScene ?? {})) {
      if (!/^[\p{L}][\p{L}\p{N}_-]{0,31}$/u.test(jenis) || KUNCI_TERLARANG.has(jenis)) throw new Error(`Nama jenis scene tidak valid: ${ringkas(jenis)}`);
      if (jenisScene.has(jenis)) throw new Error(`Jenis scene "${jenis}" sudah dipakai modul "${jenisScene.get(jenis).modul}"`);
      for (const fn of ["muat", "gambar", "tangani"]) {
        if (typeof def?.[fn] !== "function") throw new Error(`Jenis "${jenis}" di modul "${m.nama}" kurang fungsi '${fn}'`);
      }
      for (const fn of ["validasi", "keluar", "perbarui", "simpan", "pulihkan"]) {
        if (def[fn] !== undefined && typeof def[fn] !== "function") throw new Error(`Jenis "${jenis}": '${fn}' harus fungsi`);
      }
      if (def.perintah !== undefined && !(Array.isArray(def.perintah) && def.perintah.every((p) => typeof p === "string"))) {
        throw new Error(`Jenis "${jenis}": 'perintah' harus daftar teks`);
      }
    }
    for (const [nama, isi] of Object.entries(m.tabel ?? {})) {
      if (tabelDasar.has(nama)) throw new Error(`Tabel "${nama}" sudah didaftarkan modul lain`);
      if (!biasa(isi) || !Object.values(isi).every((r) => biasa(r) && dataBiasa(r))) throw new Error(`Tabel "${nama}" harus berisi baris data biasa`);
    }
    const baruKomponen = new Map();
    const daftarKomp = Array.isArray(m.komponen) ? m.komponen.map((n) => [n, cekBebas]) : Object.entries(m.komponen ?? {}).map(([n, s]) => [n, dariSkema(s)]);
    for (const [n, cek] of daftarKomp) {
      if (typeof n !== "string" || !n || KUNCI_TERLARANG.has(n)) throw new Error(`Nama komponen tidak valid: ${ringkas(n)}`);
      if (komponen.has(n) || baruKomponen.has(n)) throw new Error(`Komponen "${n}" sudah ada`);
      baruKomponen.set(n, cek);
    }
    for (const [jenis, def] of Object.entries(m.jenisScene ?? {})) jenisScene.set(jenis, { modul: m.nama, def });
    for (const [nama, isi] of Object.entries(m.tabel ?? {})) tabelDasar.set(nama, Object.freeze({ ...isi }));
    for (const [n, cek] of baruKomponen) komponen.set(n, cek);
    modul.set(m.nama, m);
    return inti;
  }

  function pindahKe(nama) {
    if (++lompatan > BATAS.lompat) throw new Error("Terlalu banyak perpindahan beruntun (mungkin siklus tak berujung)");
    if (!adaScene(nama)) throw new Error(`Scene "${ringkas(nama)}" tidak ada`);
    const scene = cerita.scene[nama];
    const j = jenisScene.get(scene.jenis);
    if (!j) throw new Error(`Scene "${nama}" bertipe "${scene.jenis}" tetapi modulnya belum dipasang`);
    const lokal = j.def.muat({ scene, ctx });
    salin(lokal === undefined ? {} : lokal); // lokal wajib data JSON biasa (agar bisa disimpan)
    const { pergi } = terapkanEfek(scene.saatMasuk, status, { acak });
    if (pergi !== null && !adaScene(pergi)) throw new Error(`Scene "${nama}": 'pergi' menunjuk scene yang tidak ada: ${ringkas(pergi)}`);
    const lama = aktif;
    if (lama) {
      try {
        jenisScene.get(lama.jenis).def.keluar?.({ scene: lama.scene, lokal: lama.lokal, ctx });
      } catch (e) {
        log(`keluar() galat: ${e.message}`);
      }
    }
    aktif = { nama, scene, jenis: scene.jenis, lokal: lokal === undefined ? {} : lokal };
    if (pergi !== null) pindahKe(pergi);
    beri();
  }

  /** Memeriksa seluruh cerita tanpa menjalankannya. { galat: [...], peringatan: [...] } */
  function validasi() {
    const galat = [];
    const peringatan = [];
    const lapor = (m) => galat.length < 200 && galat.push(m);
    if (!adaScene(cerita.mulai)) lapor(`'mulai' menunjuk scene yang tidak ada: ${ringkas(cerita.mulai)}`);
    const tinjauTema = (t, asal) => {
      const l = [];
      bersihkanTema(t, l);
      l.forEach((m) => peringatan.push(`${asal}: ${m} (diabaikan)`));
    };
    tinjauTema(cerita.tema, "Tema cerita");
    if (cerita.tabel !== undefined && !biasa(cerita.tabel)) lapor("'tabel' harus objek");
    for (const nama of Object.keys(cerita.scene)) {
      const l = (m) => lapor(`Scene "${nama}": ${m}`);
      const sc = cerita.scene[nama];
      if (KUNCI_TERLARANG.has(nama)) l("nama scene dilarang");
      if (!biasa(sc)) {
        l("bukan objek");
        continue;
      }
      const j = jenisScene.get(sc.jenis);
      if (!j) {
        l(`jenis "${ringkas(sc.jenis)}" belum dipasang`);
        continue;
      }
      periksaEfek(sc.saatMasuk, (m) => l(`saatMasuk, ${m}`), adaScene);
      tinjauTema(sc.tema, `Tema scene "${nama}"`);
      try {
        j.def.validasi?.({ scene: sc, nama, adaScene, lapor: l, ctx });
      } catch (e) {
        l(`validasi modul gagal: ${e.message}`);
      }
    }
    return { galat, peringatan };
  }

  function tampilan() {
    if (!aktif) throw new Error("Panggil mulai() dulu");
    const { def } = jenisScene.get(aktif.jenis);
    const elemen = def.gambar({ scene: aktif.scene, lokal: aktif.lokal, ctx: ctxBaca });
    if (!Array.isArray(elemen) || elemen.length > 500) throw new Error("gambar() harus mengembalikan array elemen (maks 500)");
    for (const e of elemen) {
      const cek = biasa(e) ? komponen.get(e.jenis) : null;
      if (!cek) throw new Error(`Elemen tampilan tidak diizinkan: ${ringkas(e?.jenis)}`);
      const alasan = cek(e);
      if (alasan) throw new Error(`Elemen "${e.jenis}" tidak valid: ${alasan}`);
    }
    const tema = { ...bersihkanTema(cerita.tema), ...bersihkanTema(aktif.scene.tema) };
    if (tema.warnaLatar && tema.warnaTeks && kontras(tema.warnaLatar, tema.warnaTeks) < 3) delete tema.warnaTeks; // tak terbaca
    return { scene: aktif.nama, jenis: aktif.jenis, elemen, tema };
  }

  /** Input dari pemain, mis. { aksi: "pilih", id }. Mengembalikan false jika ditolak. */
  function kirim(input) {
    if (!aktif) throw new Error("Panggil mulai() dulu");
    const bersih = bersihkanInput(input);
    if (!bersih) return false;
    const hasil = aman(() => {
      const { def } = jenisScene.get(aktif.jenis);
      const h = def.tangani({ input: bersih, scene: aktif.scene, lokal: aktif.lokal, ctx });
      beri();
      return h;
    }, true);
    return hasil !== false;
  }

  /** Untuk waktu nyata. Tanpa pemulihan per detak (mahal); galat dilaporkan lalu dilempar. */
  function perbarui(dt) {
    if (!aktif) return;
    const { def } = jenisScene.get(aktif.jenis);
    if (!def.perbarui) return;
    const d = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), 0.25) : 0;
    kedalaman++;
    try {
      def.perbarui({ dt: d, scene: aktif.scene, lokal: aktif.lokal, ctx });
    } catch (e) {
      log(`perbarui() galat: ${e.message}`);
      throw e;
    } finally {
      kedalaman--;
      if (kedalaman === 0 && kotor) beri();
    }
  }

  function simpanGame() {
    if (!aktif) throw new Error("Panggil mulai() dulu");
    const { def } = jenisScene.get(aktif.jenis);
    const lokal = def.simpan ? def.simpan({ lokal: aktif.lokal }) : aktif.lokal;
    return salin({ versi: 2, status: status.potret(), scene: aktif.nama, jenis: aktif.jenis, lokal });
  }

  function muatGame(data) {
    if (!biasa(data) || data.versi !== 2) throw new Error("Berkas simpanan tidak dikenal");
    if (!adaScene(data.scene)) throw new Error(`Simpanan menunjuk scene yang sudah tidak ada: ${ringkas(data.scene)}`);
    const scene = cerita.scene[data.scene];
    const j = jenisScene.get(scene.jenis);
    if (!j || scene.jenis !== data.jenis) throw new Error("Jenis scene pada simpanan tidak cocok dengan cerita saat ini");
    aman(() => {
      status.pulihkan(data.status);
      const lokal = j.def.pulihkan ? j.def.pulihkan({ data: data.lokal, scene, ctx }) : salin(data.lokal ?? {});
      aktif = { nama: data.scene, scene, jenis: scene.jenis, lokal };
      beri();
    });
  }

  function mulai() {
    const v = validasi();
    if (v.galat.length) throw new Error(`Cerita tidak valid:\n- ${v.galat.slice(0, 10).join("\n- ")}`);
    aman(() => pindahKe(cerita.mulai));
  }

  const inti = {
    pasang,
    validasi,
    mulai,
    tampilan,
    kirim,
    perbarui,
    simpanGame,
    muatGame,
    status,
    pindahKe: (n) => aman(() => pindahKe(n)),
    dengar(f) {
      pendengar.add(f);
      return () => pendengar.delete(f);
    },
    /** Perintah bahasa yang hanya aktif di jenis scene tertentu (untuk parser dan autocomplete). */
    perintahUntuk(jenis) {
      return [...(jenisScene.get(jenis)?.def.perintah ?? [])];
    },
  };
  return inti;
}

// ───────────────────────── Modul 1: teks dasar ─────────────────────────

const teksDasar = {
  nama: "teks-dasar",
  versi: "0.2",
  jenisScene: {
    teks: {
      perintah: ["pilihan"],
      validasi({ scene, adaScene, lapor }) {
        if (scene.judul !== undefined && typeof scene.judul !== "string") lapor("'judul' harus teks");
        const isi = scene.isi ?? [];
        if (!Array.isArray(isi)) lapor("'isi' harus daftar");
        else {
          isi.forEach((p, i) => {
            if (typeof p === "string") return;
            if (!biasa(p) || typeof p.isi !== "string") return lapor(`isi #${i + 1}: harus teks atau {isi, jika}`);
            periksaSyarat(p.jika, (m) => lapor(`isi #${i + 1}: ${m}`));
          });
        }
        const pil = scene.pilihan ?? [];
        if (!Array.isArray(pil)) lapor("'pilihan' harus daftar");
        else {
          pil.forEach((p, i) => {
            const l = (m) => lapor(`pilihan #${i + 1}: ${m}`);
            if (!biasa(p) || typeof p.label !== "string") return l("butuh 'label' berupa teks");
            if (p.ke !== undefined && !adaScene(p.ke)) l(`scene tujuan ${ringkas(p.ke)} tidak ada`);
            periksaSyarat(p.syarat, l);
            periksaEfek(p.efek, l, adaScene);
          });
        }
      },
      muat: () => ({}),
      gambar({ scene, ctx }) {
        const el = [];
        const peran = (p) => (PERAN.includes(p) ? { peran: p } : {});
        if (scene.judul) el.push({ jenis: "judul", isi: isiTemplat(scene.judul, ctx.status) });
        for (const p of scene.isi ?? []) {
          if (typeof p === "string") el.push({ jenis: "teks", isi: isiTemplat(p, ctx.status) });
          else if (ctx.syarat(p.jika)) el.push({ jenis: "teks", isi: isiTemplat(p.isi, ctx.status), ...peran(p.peran) });
        }
        (scene.pilihan ?? []).forEach((p, i) => {
          // id = indeks asli di cerita, bukan urutan tampil
          if (ctx.syarat(p.syarat)) el.push({ jenis: "pilihan", id: i, label: isiTemplat(p.label, ctx.status) });
        });
        return el;
      },
      tangani({ input, scene, ctx }) {
        if (input.aksi !== "pilih" || !Number.isInteger(input.id)) return false;
        const p = (scene.pilihan ?? [])[input.id];
        if (!p || !ctx.syarat(p.syarat)) return false; // jangan percaya UI
        const { pergi } = ctx.efek(p.efek);
        const tujuan = pergi ?? p.ke; // tanpa tujuan: tetap di scene ini (efek saja)
        if (tujuan !== undefined && tujuan !== null) ctx.pindahKe(tujuan);
      },
    },
  },
};

return {buatInti,buatStatus,teksDasar,hitung,cekBerbobot,ringkas,periksaEfek};
})();
