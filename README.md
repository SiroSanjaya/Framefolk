# Framefolk Remotion Studio

Studio video berbasis React dan Remotion. Landing page produk bisa dilihat tanpa login; akun Supabase wajib sebelum masuk studio. Project disimpan di Postgres, aset di private Supabase Storage, dan cache lokal dipisah per akun. Generasi AI dan render masih memakai middleware lokal, jadi aplikasi ini belum SaaS siap jual.

## Jalankan studio

```powershell
npm install
notepad .env.local
npm run dev
```

Atur Supabase terlebih dahulu. Buat project Supabase, lalu jalankan SQL pada `supabase/migrations/20261113170000_saas_core.sql` melalui Supabase SQL Editor. File ini membuat tabel, RLS, private bucket, dan isolasi data dasar. Konfigurasikan URL project dan publishable/anon key di `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://project-id.supabase.co
VITE_SUPABASE_ANON_KEY=publishable-or-anon-key
```

Jangan pernah memakai service-role key dengan awalan `VITE_`. Pastikan email authentication aktif di Supabase. Setelah login, project dan aset disinkronkan ke akun; project lama di browser hanya dipindahkan setelah dikonfirmasi.

Untuk memakai middleware AI lokal, tambahkan key provider yang dipilih ke `.env.local`:

```dotenv
AI_PROVIDER=anthropic
GEMINI_API_KEY=key-dari-google-ai-studio
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_IMAGE_MODEL=gemini-3.1-flash-lite-image

ANTHROPIC_API_KEY=key-dari-anthropic
ANTHROPIC_MODEL=claude-sonnet-4-5

ELEVENLABS_API_KEY=key-dari-elevenlabs
ELEVENLABS_MODEL=eleven_multilingual_v2
ELEVENLABS_VOICE_ID=

PEXELS_API_KEY=key-dari-pexels
```

Pencarian stock menggunakan [Pexels API](https://www.pexels.com/api/). Buat API key di akun Pexels dan simpan hanya di `.env.local`; jangan mengirimkannya ke browser atau commit. Saat tombol **Buat video lengkap** ditekan, hasil Pexels teratas untuk tiap adegan yang belum punya visual dipasang otomatis; aset menyimpan tautan fotografer/Pexels dan bisa diganti di editor.

Gemini API key bisa dibuat di [Google AI Studio](https://aistudio.google.com/api-keys). Default `gemini-3.5-flash-lite` mendukung input teks/gambar dan output JSON terstruktur. Google menyediakan free tier terbatas untuk model tertentu; kuota, model yang tersedia, dan kebijakan dapat berubah menurut akun. Periksa [harga dan batas Gemini API](https://ai.google.dev/gemini-api/docs/pricing). Jika tidak ada free quota atau batasnya habis, request akan gagal dan studio akan menampilkan error—tidak otomatis beralih ke model berbayar.

Gambar per adegan menggunakan `GEMINI_API_KEY` dan model terpisah (default `gemini-3.1-flash-lite-image`). Satu gambar memerlukan satu request image-generation; kuota dan harga gambar terpisah dari model teks dan tidak dijamin gratis. Periksa akses model, harga, dan kuota akun sebelum membuat banyak gambar. Atur `GEMINI_IMAGE_MODEL` bila model tersebut tidak tersedia untuk akun Anda.

Claude (Anthropic) menjadi default untuk menjaga workflow yang diminta; set `AI_PROVIDER=gemini` untuk beralih ke Gemini. Siapkan key provider yang dipilih, lalu restart `npm run dev`. Kedua integrasi tetap ada, tetapi tiap generasi hanya memakai provider yang dipilih.

Key ElevenLabs diperlukan untuk memuat daftar voice dan membuat voice-over; model default tetap `eleven_multilingual_v2` demi menjaga hasil Indonesia yang sudah ada. `ELEVENLABS_MODEL` dapat diganti setelah kompatibilitas timestamp dan kualitas Bahasa Indonesia diuji. Maksimal 800 karakter narasi per video diterapkan sebagai batas hemat lokal. `ELEVENLABS_VOICE_ID` opsional jika voice dipilih di studio. Simpan key hanya di `.env.local`—jangan kirim key ke chat atau commit file tersebut.

Buka URL lokal yang dicetak Vite dan masuk dengan akun Supabase. Tanpa konfigurasi Supabase, studio menampilkan petunjuk setup dan tidak membuka project. Gunakan `npm run remotion:studio` untuk membuka Remotion Studio resmi atau `npm run build` untuk memeriksa build aplikasi.

## Alur kerja

1. Isi character bible, unggah gambar karakter dan aset, lalu pilih **Dari ide** atau **Naskah sendiri**.
2. Dari ide, tulis prompt cerita bebas (topik, konflik, gaya, atau ending yang diinginkan), lalu pilih **Buat video lengkap**. Claude menyusun cerita dan beat adegan; Framefolk mencari visual Pexels per adegan, merancang motion, membuat voice-over ElevenLabs dan timing subtitle, lalu menyiapkan preview Remotion. Hasil Pexels teratas dipasang otomatis dan bisa diganti setelah ditinjau. Claude/ElevenLabs memakai kuota provider; voice dibatasi 800 karakter per video. Kalau sudah punya naskah final, pilih **Naskah sendiri** agar kata-katanya dipertahankan.
3. Sudah punya naskah? Tempel di tab **Naskah sendiri**, lalu pilih **Generate video dari naskah**. Teks dipecah menjadi adegan tanpa ditulis ulang, lalu visual stock, motion, voice/subtitle, dan preview disiapkan di Framefolk.
4. Preview dan edit adegan. Jalur hemat memakai **Cari stock gratis** (Pexels) atau aset upload. Aset disimpan ke library akun beserta tautan atribusi fotografer. Gambar Gemini per adegan tetap tersedia sebagai opsi manual dan memakai kuota/harga Gemini Image terpisah; tidak ada generate massal.
5. Setelah preview siap, tinjau hasil stock dan ganti aset yang kurang cocok. Kamu tetap mengedit timeline, subtitle, voice, dan visual sebelum export; Framefolk tidak merender/mengunduh MP4 otomatis.
6. Tekan **Render & siapkan MP4** untuk membuat hasil lokal, lalu **Unduh MP4**. **Draft saja** dan **Prompt manual** tetap tersedia untuk eksperimen terpisah.

Layout adegan menggunakan komposisi native Remotion dan aset yang dipilih per adegan, dengan pilihan Hero, Split, Quote, Punchline, Cinematic, Sticker pop, dan Poster. Gambar stock/AI adalah still image/keyframe—bukan footage atau video AI. Remotion menambahkan gerakan kamera terarah per adegan, easing, teks, motion graphics, dan audio saat preview/render. Tanpa gambar stock, AI, atau upload, komposisi tetap memakai visual vektor bawaan. Daftar voice bisa dipratinjau di panel voice-over; gaya delivery Natural, Ekspresif, atau Tenang diterapkan ke klip ElevenLabs berikutnya.

Karakter SVG bawaan menggerakkan mulut mengikuti timing kata voice-over dan menggerakkan tangan saat bicara. Karakter gambar yang diunggah hanya bergerak sebagai satu gambar; lip-sync wajah memerlukan karakter ber-layer/rigged. Caption mengikuti alignment per kata dari endpoint ElevenLabs `with-timestamps`, termasuk highlight kata yang sedang diucapkan; audio lama tanpa alignment memakai timing perkiraan. Jika belum upload visual scene, studio memilih ilustrasi vektor original berdasarkan tema adegan dan menampilkan arahan visual dari story. Ilustrasi itu bukan foto/footage spesifik—upload aset sendiri untuk identitas produk/lokasi yang harus akurat. Motion graphics memakai SVG native Remotion dengan pseudo-3D (bukan model 3D sungguhan); AI merancang treatment melalui provider teks yang dipilih, sementara Remotion menggambar dan menganimasikannya secara lokal. SFX whoosh, pop, dan sparkle sintetis ikut bermain di tiap pergantian adegan.

Biaya variabel belum dijamin maksimal Rp3.000/video: batas 800 karakter hanya membatasi voice-over pada satu generasi; membuat ulang voice tetap memakai kuota tambahan. Render, storage, pembayaran, retry, dan gambar AI berbayar belum dihitung pada worker produksi. Pexels/upload adalah jalur visual tanpa biaya generasi gambar. Durasi render dan ukuran hasil tetap bergantung pada komputer, ruang disk, serta batas jumlah frame Remotion. Proyek menggunakan 30 fps.

## Privasi aset

Project tersimpan di Supabase Postgres dan aset di private Supabase Storage; cache aset lokal berada di IndexedDB yang dipisah per user. Untuk membuat cerita, middleware lokal mengirim prompt, character bible, durasi/format, serta nama dan tipe aset ke provider teks yang dipilih. Untuk setiap gambar adegan AI manual, middleware mengirim arahan visual, narasi adegan, character bible, dan referensi visual ke Gemini Image; gambar karakter JPEG/PNG/WebP terpilih (maksimal 5 MB) digunakan jika ada. Jangan gunakan referensi yang tidak ingin dikirim ke Google. Pencarian stock otomatis setelah tombol **Buat video lengkap** mengirim deskripsi visual adegan sebagai kata kunci ke Pexels; foto hasil teratas yang diunduh disimpan ke akun beserta atribusinya. Voice-over dikirim ke ElevenLabs API. Provider key dibaca middleware lokal dan tidak dikirim ke browser.

Render MP4 berjalan di mesin yang menjalankan middleware. Aset terpilih dikirim ke proses Remotion lokal. Batas render adalah 150 MB per file dan 300 MB total. File sementara dibersihkan setelah render selesai; MP4 disimpan di folder `out/`.

Sebelum penggunaan komersial, tinjau [lisensi Remotion](https://www.remotion.dev/license); beberapa skenario memerlukan lisensi terpisah.

## Status kesiapan produk

Fondasi login Supabase, RLS, private asset storage, serta sinkronisasi project/aset lintas perangkat sudah ditambahkan, tetapi belum diuji terhadap project Supabase nyata. Versi ini tetap belum siap dijual: AI dan render bergantung pada middleware Vite lokal; belum ada API/worker produksi, enforcement paket dan kuota di server, billing Xendit, webhook pembayaran, atau ledger biaya AI atomik. UI paket bukan perlindungan biaya. Jangan deploy sebagai SaaS atau menerima pembayaran sebelum backend dan pembatasan server-side selesai serta diuji.

## Struktur proyek

- `src/App.jsx` — character bible, upload, generasi cerita/voice-over, preview, dan render.
- `src/server/aiMiddleware.js` — endpoint server lokal untuk Gemini, ElevenLabs, dan pencarian/impor foto Pexels.
- `src/server/renderMiddleware.js` — endpoint render MP4 lokal.
- `src/lib/storage.js` — penyimpanan media di IndexedDB browser.
- `src/remotion/compositions/Promo.jsx` — composition video.
- `src/remotion/index.jsx` — metadata composition.
- `src/remotion/root.jsx` — Remotion entry point.
- `public/assets/` — aset proyek untuk composition/CLI.
- `.claude/skills/` — skill Remotion untuk Claude Code.

`npm run render` merender props default ke `out/promo.mp4`. Untuk merender editan browser beserta aset pilihan, gunakan tombol **Render MP4** di studio.
