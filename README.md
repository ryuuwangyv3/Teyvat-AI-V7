
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
   npm install
   ```
3. Buat file `.env` di root direktori dan masukkan kunci berikut:
   ```env
   # --- GOOGLE SERVICES & AI ---
   API_KEY=AIza... (Google Gemini Key)
   
   # --- SUPABASE CLOUD (AUTO-CONNECT) ---
   SUPABASE_URL=https://your-id.supabase.co
   SUPABASE_ANON_KEY=eyJh...
   
   # --- OPTIONAL PROVIDERS ---
   OPENAI_API_KEY=sk-...
   OPENROUTER_API_KEY=sk-or-...
   
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
1. Jalankan `vercel` di terminal root.
2. Pilih default settings.
3. Tambahkan Environment Variables di dashboard Vercel.

---

## 🗄️ 5. Inisialisasi Database (SQL Ritual)

Jika Anda baru pertama kali menghubungkan Supabase:
1. Buka Dashboard Supabase > SQL Editor.
2. Klik tombol **"Celestial Schema"** di menu **Admin Console** aplikasi web ini.
3. Copy script SQL yang muncul.
4. Paste ke SQL Editor Supabase dan klik **RUN**.
5. Restart aplikasi. Database akan siap menyimpan Memory Chat dan VFS.

---

## 🛡️ Keamanan & Privasi
- Seluruh data chat disimpan dengan enkripsi **AES-256** sebelum masuk ke database.
- Sistem **Omni-Shield V12.0** aktif secara default untuk mencegah inspeksi kode dan injeksi SQL.

**Created with ❤️ by Akasha Developers. Ad Astra Abyssosque!**
