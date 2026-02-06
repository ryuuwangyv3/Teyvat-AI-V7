<img src="https://mirror-uploads.trakteer.id/images/content/eml73oyywavr4d9q/ct-htCT0FFlItjxvdHgYsBymFl63ZdxC9r11765727946.jpg" width="400" height="400" style="object-fit: cover; object-position: center;">



# 🌌 Teyvat AI Terminal (Akasha System) V8.0

Web AI Interaktif dengan tema UI/UX Genshin Impact yang mewah. Terminal ini dirancang untuk resonansi tingkat tinggi antara Traveler dan AI Companion melalui suara, visual, dan data Irminsul.

---

## 🚀 1. Persiapan & Instalasi Cepat

### Prasyarat
- **Node.js** (v18 ke atas)
- **NPM** atau **Yarn**
- Akun **Supabase** & **Google AI Studio**

### Langkah Instalasi
1. Clone repositori ini.
2. Instal dependensi:
   ```bash
   npm install @supabase/supabase-js lucide-react react-router-dom framer-motion tailwindcss postcss autoprefixer @types/react @types/react-dom
   ```
   ## --- NEXT RUN COMMAND ---
   ```bash
   ./node_modules/.bin/tailwindcss init -p
   
   ```
4. Buat file `.env` di root direktori dan masukkan kunci berikut:
   ```env
   # --- GOOGLE SERVICES & AI ---
   VITE_API_KEY=AIza... (Google Gemini Key)
   
   # --- SUPABASE CLOUD (AUTO-CONNECT) ---
   VITE_SUPABASE_URL=https://your-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJh...

   # --- AUTO SINC TO GITHUB REPOSITORY ---
   VITE_GITHUB_TOKEN=github_pat_...
   
   # --- OPTIONAL PROVIDERS ---
   VITE_OPENAI_API_KEY=sk-...
   VITE_OPENROUTER_API_KEY=sk-or-...

   # --- OPTIONAL PROVIDERS ---
   VITE_POLLINATIONS_API_KEY=sk-...
   
   # --- GCP SERVICE ACCOUNT (FOR ENTERPRISE FEATURES) ---
   GCP_PROJECT_ID=your-project
   GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   GCP_CLIENT_EMAIL=ryuu...
   ```

---

## 🧪 2. Uji Coba Lokal

Jalankan server pengembangan:
```bash
npm run dev
```
Buka `http://localhost:5173`. Sistem akan otomatis mendeteksi kunci di `.env` dan menampilkan status **"Connected"** pada Dashboard.

### Verifikasi Fitur:
1. **Terminal**: Coba kirim pesan teks.
2. **Vision Gen**: Manifestasikan gambar dengan Art Style pilihan.
3. **Celestial Call**: Lakukan panggilan suara (pastikan izin mic diberikan).
4. **Cloud Sync**: Login dengan Google untuk mensinkronisasi data ke Supabase.

---

## 🏗️ 3. Tahap Build & Optimalisasi

Untuk membangun aplikasi versi produksi:
```bash
npm run build
```
Hasil build akan berada di folder `dist/`. Aplikasi ini menggunakan sistem **Zero-Runtime JS** untuk performa maksimal pada aset statis.

---

## 🚢 4. Strategi Deployment

### Opsi A: Netlify (Direkomendasikan)
1. Hubungkan GitHub ke **Netlify**.
2. Set Build Command: `npm run build` dan Directory: `dist`.
3. Masukkan seluruh variabel `.env` ke menu **Site Settings > Environment Variables**.

### Opsi B: Vercel
1. Jalankan ` vercel` di terminal root .
2. Pilih pengaturan default.
3. Tambahkan Variabel Lingkungan di dashboard Vercel.

---

## 🗄️ 5. Inisialisasi Database (Ritual SQL)

Jika Anda baru pertama kali menghubungkan Supabase:
1. Buka Dashboard Supabase > SQL Editor.
2. Klik tombol ** "Celestial Schema" ** di menu ** Admin Console ** aplikasi web ini.
3. Salin skrip SQL yang muncul.
4. Paste ke SQL Editor Supabase dan klik ** RUN ** .
5. Mulai ulang aplikasi. Database akan siap menyimpan Memory Chat dan VFS.

---

## 🛡️ Keamanan & Privasi
- Seluruh data chat disimpan dengan enkripsi ** AES-256 ** sebelum masuk ke database.
- Sistem **Omni-Shield V12.0** aktif secara default untuk mencegah inspeksi kode dan injeksi SQL.

**Created with ❤️ by Akasha Developers. Ad Astra Abyssosque!**
