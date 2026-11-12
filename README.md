# Framefolk Remotion Studio

Studio video lokal berbasis React dan Remotion. Character bible, cerita, adegan, dan pengaturan proyek disimpan di browser; file aset tersimpan di IndexedDB browser.

## Jalankan studio

```powershell
npm install
notepad .env.local
npm run dev
```

Buat file `.env.local` di root project, isi key, simpan, lalu jalankan `npm run dev`:

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=key-dari-google-ai-studio
GEMINI_MODEL=gemini-3.5-flash-lite

ANTHROPIC_API_KEY=key-dari-anthropic
ANTHROPIC_MODEL=claude-sonnet-4-5

ELEVENLABS_API_KEY=key-dari-elevenlabs
ELEVENLABS_VOICE_ID=
```

Gemini API key bisa dibuat di [Google AI Studio](https://aistudio.google.com/api-keys). Default `gemini-3.5-flash-lite` mendukung input teks/gambar dan output JSON terstruktur. Google menyediakan free tier terbatas untuk model tertentu; kuota, model yang tersedia, dan kebijakan dapat berubah menurut akun. Periksa [harga dan batas Gemini API](https://ai.google.dev/gemini-api/docs/pricing). Jika tidak ada free quota atau batasnya habis, request akan gagal dan studio akan menampilkan error—tidak otomatis beralih ke model berbayar.

Anthropic tetap tersedia: ubah `AI_PROVIDER=anthropic` untuk menggunakannya; `AI_PROVIDER=gemini` adalah default. Siapkan key provider yang dipilih, lalu restart `npm run dev`. Kedua integrasi tetap ada, tetapi tiap generasi hanya memakai provider yang dipilih.

Key ElevenLabs diperlukan untuk memuat daftar voice dan membuat voice-over; `ELEVENLABS_VOICE_ID` opsional jika voice dipilih di studio. Simpan key hanya di `.env.local`—jangan kirim key ke chat atau commit file tersebut.

Buka URL lokal yang dicetak Vite. Studio juga bisa dijalankan tanpa key untuk mengedit, mengunggah media, preview, dan render; fitur AI akan menjelaskan key yang belum disiapkan. Gunakan `npm run remotion:studio` untuk membuka Remotion Studio resmi atau `npm run build` untuk memeriksa build aplikasi.

## Alur kerja

1. Isi character bible, unggah gambar karakter dan aset, lalu pilih **Dari ide** atau **Naskah sendiri**.
2. Dari ide, pilih template atau tulis brief, atur preferensi gaya, energi, humor, dan frasa yang dihindari, lalu pilih **Buat cerita + suara**. Gemini mengikuti profil karakter dan preferensi project; ElevenLabs membuat klip per adegan. Pemakaian API tunduk pada kuota provider.
3. Sudah punya naskah? Tempel di tab **Naskah sendiri**. **Susun adegan dulu** memecah teks secara lokal tanpa mengubah kata-katanya atau memanggil Gemini; setelah mengecek draft, pilih **Susun adegan + buat suara** untuk membuat klip ElevenLabs.
4. Preview dan edit adegan, pilih aset gambar/footage berbeda untuk tiap adegan, atur layout, gerak, timing, dan jeda. Musik latar dan voice-over punya kontrol volume terpisah. Profil gaya disimpan bersama project; teks manual tetap milik pengguna dan tidak ditulis ulang AI.
5. Tekan **Render MP4** untuk membuat hasil lokal yang bisa diunduh. **Prompt manual** tetap tersedia untuk eksperimen atau perubahan kode composition yang besar.

Layout adegan menggunakan komposisi native Remotion dan aset yang dipilih per adegan, dengan pilihan Hero, Split, Quote, Punchline, Cinematic, Sticker pop, dan Poster. Studio belum membuat ilustrasi/gambar baru untuk setiap adegan; arahan visual AI dipakai bersama layout dan aset yang dipilih, bukan mengirim prompt gambar ke layanan image-generation. Daftar voice bisa dipratinjau di panel voice-over; gaya delivery Natural, Ekspresif, atau Tenang diterapkan ke klip ElevenLabs berikutnya.

Karakter yang diunggah mendapat gerakan masuk sesuai preset dan gerak idle. Untuk gambar diam, mulut pada foto tidak dapat dianimasikan; gunakan karakter SVG bawaan untuk mulut yang bergerak mengikuti voice-over. Caption mengikuti alignment per kata dari endpoint ElevenLabs `with-timestamps`, termasuk highlight kata yang sedang diucapkan; audio lama tanpa alignment memakai timing perkiraan. Jika belum upload visual scene, studio memilih ilustrasi vektor original berdasarkan tema adegan dan menampilkan arahan visual dari story. Ilustrasi itu bukan foto/footage spesifik—upload aset sendiri untuk identitas produk/lokasi yang harus akurat. SFX whoosh, pop, dan sparkle sintetis ikut bermain di tiap pergantian adegan; atur volume atau mute di panel audio. Semua ilustrasi/SFX dibuat lokal tanpa API tambahan.

Tidak ada batas menit tetap untuk durasi. Lama render dan ukuran hasil tetap bergantung pada komputer, ruang disk, serta batas jumlah frame Remotion. Proyek menggunakan 30 fps.

## Privasi aset

Render MP4 berjalan di komputer ini. Untuk membuat cerita, studio mengirim brief, character bible, durasi/format, serta nama dan tipe aset ke Gemini API. Hanya gambar karakter yang dipilih, bila JPEG/PNG/GIF/WebP dan maksimal 5 MB, ikut dikirim sebagai referensi visual; file audio dan aset lain tetap lokal. Voice-over dikirim ke ElevenLabs API untuk dibuat menjadi audio. API key dibaca server lokal dan tidak dikirim ke browser.

Saat render, aset terpilih dikirim ke proses Remotion lokal. Batas render adalah 150 MB per file dan 300 MB total. File sementara dibersihkan setelah render selesai; MP4 disimpan di folder `out/`.

Sebelum penggunaan komersial, tinjau [lisensi Remotion](https://www.remotion.dev/license); beberapa skenario memerlukan lisensi terpisah.

## Struktur proyek

- `src/App.jsx` — character bible, upload, generasi cerita/voice-over, preview, dan render.
- `src/server/aiMiddleware.js` — endpoint server lokal untuk Gemini dan ElevenLabs.
- `src/server/renderMiddleware.js` — endpoint render MP4 lokal.
- `src/lib/storage.js` — penyimpanan media di IndexedDB browser.
- `src/remotion/compositions/Promo.jsx` — composition video.
- `src/remotion/index.jsx` — metadata composition.
- `src/remotion/root.jsx` — Remotion entry point.
- `public/assets/` — aset proyek untuk composition/CLI.
- `.claude/skills/` — skill Remotion untuk Claude Code.

`npm run render` merender props default ke `out/promo.mp4`. Untuk merender editan browser beserta aset pilihan, gunakan tombol **Render MP4** di studio.
