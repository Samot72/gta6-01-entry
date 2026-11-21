[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=badge)
[![rank](https://make.fun/badge/gta6-01/Samot72/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=badge)
[![reward](https://make.fun/badge/gta6-01/Samot72/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=badge)

# SOLMAR HEAT

Game open-world crime 2D top-down di kota pantai orisinal **Solmar**. Jalan kaki atau nyetir
keliling kota, curi mobil, kabur dari polisi Solmar PD, dan selesaikan tiga misi berantai untuk
**Mara Voss** — dari paket Marina sampai heist dermaga. Semua nama, karakter, kendaraan, cerita,
dan art dibuat sendiri; tidak ada aset, nama, atau musik dari game komersial mana pun.

## Cara main

Buka `game/index.html` di desktop Chrome (atau `node serve.ts` lalu buka http://localhost:8080).
Game statis murni: tanpa build step, tanpa library, tanpa network request — semua grafis
digambar dari kode canvas, semua suara disintesis WebAudio.

### Kontrol

| Aksi | Kontrol |
| --- | --- |
| Jalan / nyetir | WASD atau panah |
| Lari | Shift |
| Aim | Mouse |
| Tembak | Klik kiri |
| Pukul | F |
| Masuk / keluar mobil | E |
| Handbrake | Space (saat nyetir) |
| Jeda | Esc / P |
| Bisu | M |

## Sistem

- **Kota Solmar (3200×2400)** — lima distrik (Palmetto Beach, Coral Row, Marina del Sol,
  Old Solmar, Harbor District), jalan grid, blok bangunan, palem, pantai + laut, marina dengan
  kapal dan dermaga, hideout, dan rumah sakit Solmar General.
- **Berkendara** — gas/rem/setir + handbrake, traffic AI yang melaju di jalur dan belok di
  persimpangan, mobil parkir yang bisa dicuri (E), tabrakan dengan bangunan dan kendaraan.
- **Wanted 0–5 bintang** — naik saat mencuri mobil, menembak, atau menabrak pejalan kaki.
  Mobil patroli mengejar dan menabrak; polisi jalan kaki mengejar dan menembak dari wanted 2.
  Wanted turun kalau berhasil bersembunyi. Health habis = **BUSTED**, respawn di rumah sakit
  dan kehilangan 20% cash.
- **Misi + cerita (3 misi Mara Voss)** — (1) ambil paket di Marina, antar ke Coral Row;
  (2) curi Solaris GT emas, kabur wanted 3 ke hideout; (3) heist dermaga — ambil 3 peti
  sambil polisi datang, antar ke hideout. Marker panah + blip minimap + teks objektif +
  reward cash ($500 / $1.200 / $3.000).
- **Kolektibel** — 10 Sun Disc tersebar di kota, masing-masing +$100.
- **HUD** — health bar + cash + Sun Disc (kiri atas), bintang wanted (kanan atas), minimap
  (kiri bawah: jalan, pemain, polisi, blip misi), teks objektif + kompas (bawah tengah),
  speedometer saat nyetir, banner event misi.
- **Layar** — start screen dengan cerita + kontrol (lanjut dari save kalau ada), jeda (Esc),
  layar Busted. Save/load otomatis ke localStorage tiap 10 detik dan tiap misi selesai.
- **Audio** — mesin mengikuti kecepatan, sirene dua nada, tembakan noise, blip pickup,
  dan loop bass sederhana. Semua disintesis, tanpa file audio.

## Struktur kode (`game/src/`)

Satu file satu tugas: `config.js` (tuning + definisi), `city.js` (generasi kota),
`input.js` (keyboard + mouse), `audio.js` (synth WebAudio), `player.js` (jalan/nyetir/curi),
`traffic.js` (traffic + pejalan kaki AI), `police.js` (wanted + kejaran polisi),
`missions.js` (rantai 3 misi), `combat.js` (peluru + partikel), `render.js` (kamera + gambar),
`hud.js` (HUD), `minimap.js` (minimap), `shots.js` (scene screenshot), `main.js` (loop + save).

## Lisensi

MIT — lihat `LICENSE`.
