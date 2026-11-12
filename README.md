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
GEMINI_IMAGE_MODEL=gemini-3.1-flash-lite-image

ANTHROPIC_API_KEY=key-dari-anthropic
ANTHROPIC_MODEL=claude-sonnet-4-5

ELEVENLABS_API_KEY=key-dari-elevenlabs
ELEVENLABS_VOICE_ID=
```

Gemini API key bisa dibuat di [Google AI Studio](https://aistudio.google.com/api-keys). Default `gemini-3.5-flash-lite` mendukung input teks/gambar dan output JSON terstruktur. Google menyediakan free tier terbatas untuk model tertentu; kuota, model yang tersedia, dan kebijakan dapat berubah menurut akun. Periksa [harga dan batas Gemini API](https://ai.google.dev/gemini-api/docs/pricing). Jika tidak ada free quota atau batasnya habis, request akan gagal dan studio akan menampilkan error—tidak otomatis beralih ke model berbayar.

Gambar per adegan menggunakan `GEMINI_API_KEY` dan model terpisah (default `gemini-3.1-flash-lite-image`). Satu gambar memerlukan satu request image-generation; kuota dan harga gambar terpisah dari model teks dan tidak dijamin gratis. Periksa akses model, harga, dan kuota akun sebelum membuat banyak gambar. Atur `GEMINI_IMAGE_MODEL` bila model tersebut tidak tersedia untuk akun Anda.

Anthropic tetap tersedia: ubah `AI_PROVIDER=anthropic` untuk menggunakannya; `AI_PROVIDER=gemini` adalah default. Siapkan key provider yang dipilih, lalu restart `npm run dev`. Kedua integrasi tetap ada, tetapi tiap generasi hanya memakai provider yang dipilih.

Key ElevenLabs diperlukan untuk memuat daftar voice dan membuat voice-over; `ELEVENLABS_VOICE_ID` opsional jika voice dipilih di studio. Simpan key hanya di `.env.local`—jangan kirim key ke chat atau commit file tersebut.

Buka URL lokal yang dicetak Vite. Studio juga bisa dijalankan tanpa key untuk mengedit, mengunggah media, preview, dan render; fitur AI akan menjelaskan key yang belum disiapkan. Gunakan `npm run remotion:studio` untuk membuka Remotion Studio resmi atau `npm run build` untuk memeriksa build aplikasi.

## Alur kerja

1. Isi character bible, unggah gambar karakter dan aset, lalu pilih **Dari ide** atau **Naskah sendiri**.
2. Dari ide, pilih template atau tulis brief, atur preferensi gaya, energi, humor, dan frasa yang dihindari, lalu pilih **Buat cerita + suara**. Gemini mengikuti profil karakter dan preferensi project; ElevenLabs membuat klip per adegan. Pemakaian API tunduk pada kuota provider.
3. Sudah punya naskah? Tempel di tab **Naskah sendiri**. **Susun adegan dulu** memecah teks secara lokal tanpa mengubah kata-katanya atau memanggil Gemini; setelah mengecek draft, pilih **Susun adegan + buat suara** untuk membuat klip ElevenLabs.
4. Preview dan edit adegan. Klik **Buat visual kosong** untuk membuat gambar AI pada adegan yang belum punya aset, atau gunakan tombol **Buat gambar AI / Generate ulang AI** per adegan. Gambar yang diunggah tidak diganti oleh aksi massal; penggantian dengan gambar AI hanya terjadi setelah aksi eksplisit pada adegan tersebut. Gambar dibuat dari narasi, arahan visual, character bible, dan gambar karakter pilihan (jika kompatibel), lalu disimpan di library browser. Anda bisa mengganti aset adegan, mengedit teks, layout, gerak, timing, dan jeda kapan saja tanpa prompt ulang. Satu request gambar per adegan memakai kuota/harga Gemini Image terpisah.
5. Klik **Rancang motion AI** bila ingin model teks terpilih membuat koreografi motion untuk adegan yang sudah ada—gaya, arah, tempo, transisi masuk, kata fokus, dan intensitas; naskah dan voice-over tidak ditulis ulang. Remotion mengeksekusi treatment SVG berlapis dengan easing, impact, gerak berkelanjutan, dan camera movement pada gambar. Request ini memakai kuota provider teks yang dipilih. Musik latar dan voice-over punya kontrol volume terpisah. Profil gaya disimpan bersama project; teks manual tetap milik pengguna dan tidak ditulis ulang AI.
6. Tekan **Render MP4** untuk membuat hasil lokal yang bisa diunduh. **Prompt manual** tetap tersedia untuk eksperimen atau perubahan kode composition yang besar.

Layout adegan menggunakan komposisi native Remotion dan aset yang dipilih per adegan, dengan pilihan Hero, Split, Quote, Punchline, Cinematic, Sticker pop, dan Poster. Gambar AI adalah still image/keyframe—bukan footage atau video AI. Remotion menambahkan camera move, parallax, teks, motion graphics, dan audio saat preview/render. Tanpa gambar AI atau upload, komposisi tetap memakai visual vektor bawaan. Daftar voice bisa dipratinjau di panel voice-over; gaya delivery Natural, Ekspresif, atau Tenang diterapkan ke klip ElevenLabs berikutnya.

Karakter SVG bawaan menggerakkan mulut mengikuti timing kata voice-over dan menggerakkan tangan saat bicara. Karakter gambar yang diunggah hanya bergerak sebagai satu gambar; lip-sync wajah memerlukan karakter ber-layer/rigged. Caption mengikuti alignment per kata dari endpoint ElevenLabs `with-timestamps`, termasuk highlight kata yang sedang diucapkan; audio lama tanpa alignment memakai timing perkiraan. Jika belum upload visual scene, studio memilih ilustrasi vektor original berdasarkan tema adegan dan menampilkan arahan visual dari story. Ilustrasi itu bukan foto/footage spesifik—upload aset sendiri untuk identitas produk/lokasi yang harus akurat. Motion graphics memakai SVG native Remotion dengan pseudo-3D (bukan model 3D sungguhan); AI merancang treatment melalui provider teks yang dipilih, sementara Remotion menggambar dan menganimasikannya secara lokal. SFX whoosh, pop, dan sparkle sintetis ikut bermain di tiap pergantian adegan.

Tidak ada batas menit tetap untuk durasi. Lama render dan ukuran hasil tetap bergantung pada komputer, ruang disk, serta batas jumlah frame Remotion. Proyek menggunakan 30 fps.

## Privasi aset

Render MP4 berjalan di komputer ini. Untuk membuat cerita, studio mengirim brief, character bible, durasi/format, serta nama dan tipe aset ke provider teks yang dipilih. Untuk setiap gambar adegan, studio mengirim arahan visual, narasi adegan, character bible, dan referensi visual ke Gemini Image; gambar karakter JPEG/PNG/WebP terpilih (maksimal 5 MB) digunakan jika ada. Jika tidak ada gambar karakter, gambar AI adegan sebelumnya dapat digunakan sebagai referensi konsistensi. Jangan gunakan referensi yang tidak ingin dikirim ke Google. Audio dan aset lain tidak dikirim untuk generasi gambar. Gambar hasil disimpan di IndexedDB browser dan dipakai untuk preview/render lokal. Voice-over dikirim ke ElevenLabs API untuk dibuat menjadi audio. API key dibaca server lokal dan tidak dikirim ke browser.

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
