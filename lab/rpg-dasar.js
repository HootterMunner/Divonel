/* Modul contoh RPG bergiliran. TIDAK dimuat: tidak dipakai editor maupun ekspor.
   Untuk mencoba: tambahkan <script src="lab/rpg-dasar.js"></script> tepat setelah player/mesin.js di index.html. */
Mesin.rpgDasar=(()=>{
const{ringkas,periksaEfek}=Mesin;
// ─────────────────── Modul 2: RPG bergiliran (pertarungan) ───────────────────

const gulung = (ctx) => Math.floor(ctx.acak() * 4) - 1; // -1..2

function musuhBalas(L, ctx) {
  const dmg = Math.max(1, L.serang + gulung(ctx));
  const hp = (ctx.status.baca("hp") ?? 30) - dmg;
  ctx.status.tulis("hp", hp);
  L.log.push(`${L.nama} membalas: -${dmg}`);
  if (hp <= 0) {
    L.log.push("Kamu tumbang.");
    L.hasil = "kalah";
  }
}

const rpgDasar = {
  nama: "rpg-dasar",
  versi: "0.2",
  tabel: {
    musuh: {
      Goblin: { hp: 20, serang: 4, hadiah: 10 },
      Serigala: { hp: 35, serang: 6, hadiah: 25 },
    },
  },
  jenisScene: {
    pertarungan: {
      perintah: ["lawan", "menang", "kalah", "kabur"],
      validasi({ scene, adaScene, lapor, ctx }) {
        let daftar;
        try {
          daftar = ctx.tabel("musuh");
        } catch {
          return lapor("tabel 'musuh' tidak tersedia");
        }
        if (typeof scene.lawan !== "string" || !Object.hasOwn(daftar, scene.lawan)) lapor(`musuh ${ringkas(scene.lawan)} tidak ada di tabel musuh`);
        else {
          for (const k of ["hp", "serang", "hadiah"]) {
            if (!Number.isFinite(daftar[scene.lawan][k])) lapor(`musuh "${scene.lawan}": '${k}' harus angka`);
          }
        }
        for (const k of ["menang", "kalah"]) {
          if (!adaScene(scene[k])) lapor(`'${k}' harus menunjuk scene yang ada: ${ringkas(scene[k])}`);
        }
        if (scene.kabur !== undefined && !adaScene(scene.kabur)) lapor(`'kabur' menunjuk scene yang tidak ada: ${ringkas(scene.kabur)}`);
        periksaEfek(scene.efekMenang, (m) => lapor(`efekMenang, ${m}`), adaScene);
      },
      muat({ scene, ctx }) {
        const daftar = ctx.tabel("musuh");
        if (typeof scene.lawan !== "string" || !Object.hasOwn(daftar, scene.lawan)) {
          throw new Error(`Musuh "${scene.lawan}" tidak ada di tabel musuh`);
        }
        const m = daftar[scene.lawan];
        for (const k of ["hp", "serang", "hadiah"]) {
          if (!Number.isFinite(m[k])) throw new Error(`Musuh "${scene.lawan}": '${k}' harus angka`);
        }
        return {
          nama: scene.lawan,
          hp: m.hp,
          hpMaks: m.hp,
          serang: m.serang,
          hadiah: m.hadiah,
          log: [`${scene.lawan} muncul!`],
          hasil: null, // null | "menang" | "kalah" | "kabur"
        };
      },
      gambar({ scene, lokal: L, ctx }) {
        const hp = ctx.status.baca("hp") ?? 30;
        const hpMaks = ctx.status.baca("hpMaks") ?? 30;
        const el = [
          { jenis: "judul", isi: `Melawan ${L.nama}` },
          { jenis: "bar", label: "HP kamu", nilai: Math.max(0, hp), maks: Math.max(1, hpMaks) },
          { jenis: "bar", label: L.nama, nilai: Math.max(0, L.hp), maks: Math.max(1, L.hpMaks) },
          { jenis: "log", baris: L.log.slice(-5) },
        ];
        if (L.hasil) {
          el.push({ jenis: "pilihan", id: "lanjut", label: "Lanjut" });
        } else {
          el.push({ jenis: "pilihan", id: "serang", label: "Serang" });
          if (scene.kabur) el.push({ jenis: "pilihan", id: "kabur", label: "Kabur" });
        }
        return el;
      },
      tangani({ input, scene, lokal: L, ctx }) {
        if (input.aksi !== "pilih") return false;
        const s = ctx.status;

        if (L.hasil) {
          if (input.id !== "lanjut") return false;
          const tujuan = { menang: scene.menang, kalah: scene.kalah, kabur: scene.kabur }[L.hasil];
          ctx.pindahKe(tujuan);
          return;
        }
        if (input.id === "serang") {
          const dmg = Math.max(1, (s.baca("serang") ?? 5) + gulung(ctx));
          L.hp -= dmg;
          L.log.push(`Kamu menyerang ${L.nama}: -${dmg}`);
          if (L.hp <= 0) {
            ctx.efek([{ kunci: "emas", op: "tambah", nilai: L.hadiah }]);
            ctx.efek(scene.efekMenang);
            L.log.push(`${L.nama} kalah. +${L.hadiah} emas`);
            L.hasil = "menang";
          } else {
            musuhBalas(L, ctx);
          }
          return;
        }
        if (input.id === "kabur" && scene.kabur) {
          if (ctx.acak() < 0.5) {
            L.log.push("Kamu berhasil kabur.");
            L.hasil = "kabur";
          } else {
            L.log.push("Gagal kabur!");
            musuhBalas(L, ctx);
          }
          return;
        }
        return false;
      },
    },
  },
};
return rpgDasar;
})();
