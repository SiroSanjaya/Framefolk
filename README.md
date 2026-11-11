# Framefolk Remotion Studio

Studio video lokal berbasis React dan Remotion. Character bible, cerita, adegan, dan pengaturan proyek disimpan di browser; file aset tersimpan di IndexedDB browser.

## Jalankan studio

```powershell
npm install
Copy-Item .env.example .env.local
notepad .env.local
npm run dev
```

Isi key di `.env.local`, simpan, lalu (ulang) jalankan `npm run dev`:

```dotenv
ANTHROPIC_API_KEY=key-dari-anthropic
ANTHROPIC_MODEL=claude-sonnet-4-5

ELEVENLABS_API_KEY=key-dari-elevenlabs
ELEVENLABS_VOICE_ID=
```

Key Anthropic diperlukan untuk membuat cerita dengan Claude. Key ElevenLabs diperlukan untuk memuat daftar voice dan membuat voice-over; `ELEVENLABS_VOICE_ID` opsional jika voice dipilih di studio. Panggilan API dapat dikenai biaya sesuai akun dan kuota provider. Simpan key hanya di `.env.local`—jangan kirim key ke chat atau commit file tersebut.

Buka URL lokal yang dicetak Vite. Studio juga bisa dijalankan tanpa key untuk mengedit, mengunggah media, preview, dan render; fitur AI akan menjelaskan key yang belum disiapkan. Gunakan `npm run remotion:studio` untuk membuka Remotion Studio resmi atau `npm run build` untuk memeriksa build aplikasi.

## Alur kerja

1. Isi character bible, ide, tujuan, audiens, platform, gaya visual, dan CTA. Unggah gambar karakter serta aset yang ingin dipakai.
2. Pilih **Buat cerita + suara**. Claude membuat cerita dan adegan; studio otomatis memilih voice akun (atau voice yang sudah dipilih) lalu meminta ElevenLabs membuat klip narasi untuk setiap adegan. Hasilnya masuk ke editor dan library tanpa berpindah aplikasi. Kalau salah satu layanan belum siap, cerita tetap tersimpan dan error ditampilkan.
3. Edit naskah/adegan langsung, atau pakai revisi cepat seperti **Lebih lucu**, **Lebih emosional**, dan **Persingkat**. Revisi yang dikirim ke AI memakai API lagi; edit manual tidak.
4. Atur durasi visual dan jeda setelah setiap adegan; klip voice-over dipasang pada awal adegan dan durasi adegan otomatis memanjang jika klipnya lebih lama. Musik latar dan voice-over punya kontrol volume terpisah. Adegan juga punya pilihan layout dan gerak. Panel pemeriksaan sebelum render memberi peringatan untuk naskah yang terlalu padat, teks layar yang panjang, dan beat adegan yang kosong.
5. Preview perubahan dan tekan **Render MP4** untuk membuat hasil lokal yang bisa diunduh. **Prompt manual** tetap tersedia hanya untuk eksperimen atau perubahan kode composition yang besar.

Layout adegan menggunakan komposisi native Remotion dan aset yang dipilih, dengan pilihan Hero, Split, Quote, Punchline, Cinematic, Sticker pop, dan Poster. Studio belum membuat ilustrasi/gambar baru untuk setiap adegan; arahan visual AI dipakai untuk memilih jenis layout dan gerak, bukan mengirim prompt gambar ke layanan image-generation.

Tidak ada batas menit tetap untuk durasi. Lama render dan ukuran hasil tetap bergantung pada komputer, ruang disk, serta batas jumlah frame Remotion. Proyek menggunakan 30 fps.

## Privasi aset

Render MP4 berjalan di komputer ini. Untuk membuat cerita, studio mengirim brief, character bible, durasi/format, serta nama dan tipe aset ke Claude API. Hanya gambar karakter yang dipilih, bila JPEG/PNG/GIF/WebP dan maksimal 5 MB, ikut dikirim sebagai referensi visual; file audio dan aset lain tetap lokal. Voice-over dikirim ke ElevenLabs API untuk dibuat menjadi audio. API key dibaca server lokal dan tidak dikirim ke browser.

Saat render, aset terpilih dikirim ke proses Remotion lokal. Batas render adalah 150 MB per file dan 300 MB total. File sementara dibersihkan setelah render selesai; MP4 disimpan di folder `out/`.

Sebelum penggunaan komersial, tinjau [lisensi Remotion](https://www.remotion.dev/license); beberapa skenario memerlukan lisensi terpisah.

## Struktur proyek

- `src/App.jsx` — character bible, upload, generasi cerita/voice-over, preview, dan render.
- `src/server/aiMiddleware.js` — endpoint server lokal untuk Claude dan ElevenLabs.
- `src/server/renderMiddleware.js` — endpoint render MP4 lokal.
- `src/lib/storage.js` — penyimpanan media di IndexedDB browser.
- `src/remotion/compositions/Promo.jsx` — composition video.
- `src/remotion/index.jsx` — metadata composition.
- `src/remotion/root.jsx` — Remotion entry point.
- `public/assets/` — aset proyek untuk composition/CLI.
- `.claude/skills/` — skill Remotion untuk Claude Code.

`npm run render` merender props default ke `out/promo.mp4`. Untuk merender editan browser beserta aset pilihan, gunakan tombol **Render MP4** di studio.
