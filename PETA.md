# Peta proyek — Editor Cerita Interaktif

Situs statis murni: tanpa bundler, tanpa build. Deploy ke Vercel = unggah folder ini apa adanya.
Kirim ke Claude cukup **PETA.md + berkas yang relevan** (lihat tabel). Jangan kirim `editor/demo.js` dan `player/mesin.js` kecuali memang itu yang diubah.

## Struktur


```
index.html shell: <main>, <nav>, <dialog>, urutan <script>
player/ SEMUA berkas di sini ikut ke HTML ekspor
player.css gaya game
mesin.js mesin cerita (inti, ekspresi/syarat/efek, pemeriksa, tema, modul)
dsl.js penerjemah DSL: parser, bangun(), mulaiMain()
player.js pembantu bersama, simpan/muat pemain, renderer Play, aksiPlay
editor/ hanya editor, TIDAK ikut ekspor
editor.css gaya editor (ribbon atas, sidebar, Peta fullscreen, seleksi, dll.)
demo.js cerita contoh (besar, jarang diubah)
penyimpanan.js IndexedDB, migrasi, persist, save(), migrasi()
supabase.js auth + cloud sync (login OAuth/email, simpan/muat cerita ke Supabase)
aset.js aset: manifest, resolveAset, validator, daftarAset()
aset-ui.js dialog Aset + gambar latar bagian (pDlg), pgbDaftar/pgbRender
ekspor.js ekspor HTML/JSON, bangunGame, unduh, fallback, sumberPlayer
tampilan.js render(), ribbon, Pustaka (vLib), Editor (vEd + sidebar),
Peta (vMap, drawMap, edgesHTML, seleksi, pinch zoom),
panel debug (vDbg), dialogCari, hapusTerpilih
dialog.js tab Kode (vKode), dialog bagian/skrip (sDlg, pDlg, rc),
panduan 4 tingkat (vGuide), dialog bab (rc/cOpts/chapterParentOpts)
aksi.js satu pengendali klik + change + startup (dimuat terakhir)
lab/rpg-dasar.js modul contoh, TIDAK dimuat
```


## Mau ubah apa → buka apa

| Mau ubah | Berkas |
|---|---|
| Aturan, syarat, efek, pemeriksaan, tema | `player/mesin.js` (hati-hati) |
| Sintaks DSL / parser | `player/dsl.js` (hati-hati) |
| Tampilan pemain, slot simpan, gambar latar di Play | `player/player.js` + `player/player.css` |
| **Kerangka halaman editor**: `render()`, ribbon atas (`ribbonHTML`), menu File/Editor/Tampilan/Format, indikator login | `editor/tampilan.js` |
| **Pustaka** (daftar cerita, buat/impor/demo/cloud) | `editor/tampilan.js` (`vLib`) |
| **Editor** (sidebar folder-bab, breadcrumb, daftar bagian dalam bab) | `editor/tampilan.js` (`vEd`, `sidebarHTML`, `edRoot`, `edInside`, `edBreadcrumb`, `folderCard`) |
| **Peta** (node/folder, garis antar-bagian, drag, zoom, pinch, breadcrumb peta, mode seleksi) | `editor/tampilan.js` (`vMap`, `drawMap`, `edgesHTML`, `clipBox`, `containersAt`, `masukFolder`, `findFreeSpot`, `hapusTerpilih`) + `editor/editor.css` |
| **Tab Kode** (daftar skrip/folder, status sambungan) | `editor/dialog.js` (`vKode`) |
| **Panduan** (4 tingkat: dasar, logika, struktur, JavaScript) | `editor/dialog.js` (`vGuide`) |
| **Dialog bagian** (`pDlg`), **dialog skrip** (`sDlg`), **dialog pilihan** (`rc`), dialog bab | `editor/dialog.js` |
| **Tombol baru / aksi klik** | `editor/aksi.js` (switch `data-a`) + tampilan tombolnya di berkas terkait |
| **Login & cloud sync** (OAuth GitHub/Google, email, save/load Supabase, `_syncLokalKeCloud`) | `editor/supabase.js` + case di `editor/aksi.js` |
| **Impor, validasi, resolver aset** | `editor/aset.js` |
| **Dialog Aset, pilih gambar** | `editor/aset-ui.js` |
| **Simpan ke IndexedDB, migrasi cerita** | `editor/penyimpanan.js` |
| **Ekspor / unduh (.html, .json), fallback** | `editor/ekspor.js` |
| **Riwayat passage** (`recentPush`, 12 terakhir per cerita) | `editor/tampilan.js` (bagian atas) |

## Aturan

1. **Satu lingkup global.** Tidak ada modul; urutan `<script>` di `index.html` menentukan. Dua berkas tidak boleh mendeklarasikan nama tingkat atas yang sama (`const`/`let` yang sama = galat; `function` yang sama = yang terakhir diam-diam menang). Contoh: `vEd` hanya boleh ada satu (versi sidebar di `tampilan.js`).
2. **`player/` tidak boleh memakai apa pun dari `editor/`.** Game hasil ekspor tidak punya editor. Dua sambungan yang disengaja: `kaitScene` (kosong di ekspor, diisi editor) dan `save` (kosong di player, diisi `editor/penyimpanan.js`).
3. **Menambah berkas player baru = 3 tempat:** buat di `player/`, tambah `<script>` di `index.html`, tambah ke `BERKAS_PLAYER` di `editor/ekspor.js`. Lupa yang ketiga → game ekspor tidak membawa berkasnya.
4. Format ekspor JSON dibekukan (path aset saja, tanpa data gambar).
5. **State UI global** yang dipakai lintas berkas ada di `tampilan.js` bagian atas: `tab`, `docView`, `sel`, `hist`, `tmp`, `cur`, `edPath`, `laci`, `more`, `view`, `mapPath`, `selectMode`, `selectIds`, `hapusLanjut`, `recentCache`. Jangan deklarasikan ulang di berkas lain.

## Alur tab & tampilan (state UI)

- `tab`: `'lib'` (Pustaka) atau `'map'` (dalam cerita). Ribbon atas muncul saat `tab !== 'lib'` dan ada cerita aktif.
- `docView`: `'main'` (tampilan Main/Play), `'map'` (Peta), `'kd'` (Kode). Ini yang dipilih lewat tombol Main/Peta/Kode di ribbon kanan.
- `edPath`: ID bab yang sedang dibuka di sidebar Editor (`null` = "Semua bab").
- `mapPath`: ID bab yang sedang dibuka di Peta (`null` = root). Dipakai `containersAt`/`masukFolder`/`popstate`.
- `sel`: ID node (bagian) yang dipilih di Peta (untuk sambung/hapus/ubah).
- `selectMode` + `selectIds`: mode seleksi massal di Peta (kotak seleksi, `selall`, `seldel`).
- `view`: `{x,y,k}` transform Peta. Per-level disimpan di `viewPerLevel`.
- `pend`: posisi node baru dari Peta saat `mnp` (dipakai `pDlg`).

## Ribbon atas (`ribbonHTML`, `tampilan.js`)

Satu baris: tombol ← (ke Pustaka), lalu grup tool (Undo/Redo + tool per-`docView`: Fit/Recenter/Cari untuk Peta, Panduan untuk Kode), menu **File / Editor / Tampilan / Format** (kerangka; `menuDlg` masih placeholder), view switcher Main/Peta/Kode, dan indikator login (Tamu / username / Login).

## Peta folder-bab (`tampilan.js` + `editor.css`)

- **Navigasi berjenjang**: klik folder = `masukFolder` → `history.pushState`; tombol Back browser naik satu level (`popstate`).
- **Node**: passage tanpa bab atau di bab aktif; **folder**: sub-bab. Garis = pilihan antar-bagian yang melintasi container (`edgesHTML`, dengan badge jumlah bila >1).
- **Drag & zoom**: pointer drag untuk node/pan, wheel zoom, pinch dua jari (`touchstart`/`touchmove`).
- **Mode seleksi**: `selmode` aktifkan, drag di kosong = kotak seleksi, ketuk node = toggle. `selall`, `seldel` → `hapusTerpilih` (konfirmasi 2 tahap: pindah ke induk vs hapus semua).
- **Peta fullscreen** saat `docView==='map'` dan cerita punya isi (`#app.app-map`). Body diberi `map-lock` supaya halaman tidak ikut ter-zoom (hanya `<nav>`/`<main>`, `<dialog>` tetap bisa pinch).
- Tombol **+ Bagian / + Sub-bab / + Bab**, **Rapikan** (`mlay`), **⛶ Fit**, **🎯 Reset**, **🔍 Cari** ada di ribbon dan/atau `#mtb`.

## Cara kerja ekspor HTML

`bangunGame()` membaca `player/*` lewat `fetch`, membuang komentar/baris kosong (`enxuti`), lalu menyisipkan cerita sebagai data. Berkas dibaca ulang tiap dialog Ekspor dibuka, jadi hasil edit langsung terbawa.

## Cara tes ekspor

1. Buka situs → Pustaka → **Contoh** → **Ekspor** → **Game (.html)**.
2. Buka berkas yang terunduh (klik dua kali). Harus bisa dimainkan tanpa editor.
3. **Lewat `file://`** (klik dua kali `index.html`): browser memblokir `fetch`, jadi klik Game (.html) memunculkan pesan dan tombol **Pilih berkas aplikasi**. Buka folder `player/`, pilih keempat berkasnya sekaligus (Ctrl+A), lalu klik Game (.html) lagi. Pilihan berlaku sampai halaman dimuat ulang. Cadangan (.json) tidak butuh ini.
4. Alternatif tanpa pemilih: jalankan server statis di folder ini (mis. `python3 -m http.server`) dan buka `http://localhost:8000`.

## Login & cloud sync (Supabase)

- `editor/supabase.js`: inisialisasi klien (`sb`), `sbUser`, login OAuth GitHub/Google, login/upgrade email, `sbSaveStory`, `sbLoadStory`, `sbSignOut`.
- Dialog: `loginDlg`, `emailLoginDlg`, `cloudDlg`, `cloudListDlg` (dipanggil dari case `login`, `auth-*`, `cloud-*` di `aksi.js`).
- **Auto sync** setelah login OAuth: `aksi.js` `setTimeout` 2 dtk di akhir `inisialisasi()` memanggil `_syncLokalKeCloud()` (unggah semua cerita lokal ke cloud).
- **Mode Tamu** (anonymous) memperingatkan agar hubungkan email/GitHub sebelum logout.
- Jika Supabase gagal dimuat (CDN diblokir), `sb` undefined — editor tetap jalan tanpa cloud; pastikan tidak memanggil fungsi `sb*` tanpa cek.

## Riwayat passage (`recentPush`)

Disimpan per-cerita di `localStorage` (`cerita.recent.<storyId>`), maksimal 12 ID, dipakai `dialogCari` untuk menampilkan "terakhir dibuka/dicari". Dipanggil dari `pDlg` (buka bagian) dan dialog cari.

## Catatan teknis singkat

- `aksi.js` dimuat **terakhir** karena mendaftarkan listener global dan memanggil `inisialisasi()`.
- `case 'ds'` = tombol Simpan di dialog; `case 'dx'` = Batal/Tutup.
- `more[id]` = toggle "tampilkan semua" di daftar (dipakai beberapa tampilan).
- `modal dialog` = `#dlg`; helper `dlg(html, onSave)`, `ask(msg, fn)`, `warn(msg)`, `toast(msg)`, `catat(msg)`.
- `pDlg(id, cid)` = dialog bagian; `sDlg(id, fid, nama)` = dialog skrip; `rc(s, pid)` = dialog pilihan; `one(t, v, fn)` = dialog satu input.

