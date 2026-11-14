# Peta proyek — Editor Cerita Interaktif

Situs statis murni: tanpa bundler, tanpa build. Deploy ke Vercel = unggah folder ini apa adanya.
Kirim ke Claude cukup **PETA.md + berkas yang relevan** (lihat tabel). Jangan kirim `editor/demo.js` dan `player/mesin.js` kecuali memang itu yang diubah.

## Struktur

```
index.html            shell: <main>, <nav>, <dialog>, urutan <script>
player/               SEMUA berkas di sini ikut ke HTML ekspor
  player.css            gaya game
  mesin.js              mesin cerita (inti, ekspresi/syarat/efek, pemeriksa, tema, modul)
  dsl.js                penerjemah DSL: parser, bangun(), mulaiMain()
  player.js             pembantu bersama, simpan/muat pemain, renderer Play, aksiPlay
editor/               hanya editor, TIDAK ikut ekspor
  editor.css            gaya editor
  demo.js               cerita contoh (besar, jarang diubah)
  penyimpanan.js        IndexedDB, migrasi, persist, save()
  aset.js               aset: manifest, resolveAset, validator
  aset-ui.js            dialog Aset + gambar latar bagian (pDlg)
  ekspor.js             ekspor HTML/JSON, bangunGame, unduh, fallback
  tampilan.js           render(), Pustaka, Editor, Peta, debug
  dialog.js             tab Kode, dialog bagian/skrip (sDlg, pDlg)
  aksi.js               satu pengendali klik + startup (dimuat terakhir)
lab/rpg-dasar.js      modul contoh, TIDAK dimuat
```

## Mau ubah apa → buka apa

| Mau ubah | Berkas |
|---|---|
| Aturan, syarat, efek, pemeriksaan, tema | `player/mesin.js` (hati-hati) |
| Sintaks DSL / parser | `player/dsl.js` (hati-hati) |
| Tampilan pemain, slot simpan, gambar latar di Play | `player/player.js` + `player/player.css` |
| Tampilan Pustaka / Editor / Peta | `editor/tampilan.js` + `editor/editor.css` |
| Tab Kode, dialog bagian dan skrip | `editor/dialog.js` |
| Tombol baru / aksi klik | `editor/aksi.js` (+ tampilan tombolnya) |
| Impor, validasi, resolver aset | `editor/aset.js` |
| Dialog Aset, pilih gambar | `editor/aset-ui.js` |
| Simpan ke IndexedDB | `editor/penyimpanan.js` |
| Ekspor / unduh | `editor/ekspor.js` |

## Aturan

1. **Satu lingkup global.** Tidak ada modul; urutan `<script>` di `index.html` menentukan. Dua berkas tidak boleh mendeklarasikan nama tingkat atas yang sama (`const`/`let` yang sama = galat; `function` yang sama = yang terakhir diam-diam menang).
2. **`player/` tidak boleh memakai apa pun dari `editor/`.** Game hasil ekspor tidak punya editor. Dua sambungan yang disengaja: `kaitScene` (kosong di ekspor, diisi editor) dan `save` (kosong di player, diisi `editor/penyimpanan.js`).
3. **Menambah berkas player baru = 3 tempat:** buat di `player/`, tambah `<script>` di `index.html`, tambah ke `BERKAS_PLAYER` di `editor/ekspor.js`. Lupa yang ketiga → game ekspor tidak membawa berkasnya.
4. Format ekspor JSON dibekukan (path aset saja, tanpa data gambar).

## Cara kerja ekspor HTML

`bangunGame()` membaca `player/*` lewat `fetch`, membuang komentar/baris kosong (`enxuti`), lalu menyisipkan cerita sebagai data. Berkas dibaca ulang tiap dialog Ekspor dibuka, jadi hasil edit langsung terbawa.

## Cara tes ekspor

1. Buka situs → Pustaka → **Contoh** → **Ekspor** → **Game (.html)**.
2. Buka berkas yang terunduh (klik dua kali). Harus bisa dimainkan tanpa editor.
3. **Lewat `file://`** (klik dua kali `index.html`): browser memblokir `fetch`, jadi klik Game (.html) memunculkan pesan dan tombol **Pilih berkas aplikasi**. Buka folder `player/`, pilih keempat berkasnya sekaligus (Ctrl+A), lalu klik Game (.html) lagi. Pilihan berlaku sampai halaman dimuat ulang. Cadangan (.json) tidak butuh ini.
4. Alternatif tanpa pemilih: jalankan server statis di folder ini (mis. `python3 -m http.server`) dan buka `http://localhost:8000`.
