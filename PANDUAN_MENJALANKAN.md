# Panduan Menjalankan WiseFinance (Next.js + Prisma + MySQL 8 di Laragon)

Selamat datang di **WiseFinance**! Proyek ini menggabungkan tampilan antarmuka visual asli dari `WiseFinance-Updated_claude_11.html` dengan arsitektur backend modern **Next.js (App Router) + Prisma ORM + MySQL 8**.

---

## 1. Prasyarat Sistem
1. **Laragon** (dengan MySQL 8 berjalan di Port `3306`).
2. **Node.js** (v18.x atau lebih baru).
3. **pnpm** (atau `npm`).

---

## 2. Struktur Proyek yang Rapi & Best Practice

```text
wisefinance/
├─ prisma/
│  ├─ schema.prisma         # Definisi 25 model database MySQL (Decimal strict)
│  └─ seed.ts               # Seeder akun demo dan aturan pos keuangan
├─ public/
│  ├─ app.html              # Antarmuka asli WiseFinance 11 (100% identik)
│  ├─ manifest.webmanifest  # Konfigurasi PWA offline
│  └─ icons/                # Ikon & aset visual
├─ src/
│  ├─ app/                  # Next.js App Router & API Route Handlers
│  │  ├─ api/
│  │  │  ├─ auth/           # /api/auth/login, /api/auth/register
│  │  │  ├─ transactions/   # CRUD transaksi atomik (WalletEntry + PosEntry)
│  │  │  ├─ ledger/         # /api/ledger/balance (Invarian 2 Lapisan)
│  │  │  ├─ sync/           # Sinkronisasi otomatis ke database MySQL
│  │  │  ├─ debts/          # Manajemen hutang & cicilan
│  │  │  ├─ assets/         # Manajemen aset & kekayaan bersih
│  │  │  ├─ goals/          # Target tabungan berjangka
│  │  │  └─ ai/             # Wise AI Agent (Chat & OCR Struk)
│  │  └─ [locale]/          # Halaman aplikasi multi-bahasa
│  ├─ domain/               # Domain murni tanpa framework (Pure TypeScript)
│  │  ├─ money/             # Nilai uang Decimal & konversi kurs
│  │  ├─ split/             # Pembagian otomatis pemasukan (40/45/15)
│  │  ├─ period/            # Kalkulator periode anggaran bulanan
│  │  └─ rules/             # Invarian ledger & validasi Zod
│  ├─ server/               # Business Logic & Data Access Layer
│  │  ├─ services/          # TransactionService, LedgerService, AuthService, dll.
│  │  └─ repositories/      # Query Prisma
│  ├─ lib/                  # db.ts (Prisma Client), session.ts, fx.ts
│  └─ styles/               # CSS tokens & tema
├─ .env                     # Variabel koneksi MySQL & rahasia sistem
└─ PANDUAN_MENJALANKAN.md   # Panduan ini
```

---

## 3. Langkah-Langkah Menjalankan Website

### Langkah 1: Pastikan MySQL di Laragon Berjalan
1. Buka aplikasi **Laragon**.
2. Klik tombol **Start All** (atau pastikan **MySQL** aktif berwarna hijau di port `3306`).
3. Database `wisefinance` sudah dibuat dan disinkronkan secara otomatis.
   - Host: `localhost:3306`
   - User: `root`
   - Password: *(kosong)*
   - Database: `wisefinance`

### Langkah 2: Jalankan Server Next.js
Buka Terminal / PowerShell di folder proyek (`c:\laragon\www\wise finance`), lalu jalankan:

```powershell
pnpm dev
```
*(Atau jika menggunakan npm: `npm run dev`)*

Server akan aktif di: **`http://localhost:3000`**

### Langkah 3: Buka di Browser
1. Buka browser (Chrome, Edge, atau Firefox) lalu kunjungi:
   👉 **`http://localhost:3000`**
2. Anda akan langsung diarahkan ke aplikasi **WiseFinance** dengan tampilan lengkap, responsif, dan identik dengan `WiseFinance-Updated_claude_11.html`.

---

## 4. Cara Masuk / Login

Pada layar pembuka, tersedia 3 opsi:
1. **Masuk sebagai Demo (1-Klik)**:
   - Cukup klik tombol abu-abu muda *"Masuk sebagai Demo (1-Klik)"* untuk langsung mencoba aplikasi.
2. **Masuk dengan Akun Anda**:
   - Email: `syazaif14@gmail.com` (atau `zaif`)
   - Kata Sandi: Kata sandi yang Anda daftarkan sebelumnya.
3. **Daftar Akun Baru**:
   - Klik link *"Belum punya akun? Buat akun baru"*.
   - Masukkan Nama Panggilan, Email, dan Password (minimal 8 karakter).
   - Akun langsung tersimpan di tabel `users` MySQL.

---

## 5. Fitur Utama & Invarian Keuangan

1. **Satu Sumber Kebenaran & Invarian Dua Lapisan**:
   $$\text{Total Semua Dompet} = \text{Lapisan 1 (Living + Playing)} + \text{Lapisan 2 (Emergency + Savings + Investment + Goals)}$$
   Setiap rupiah di dompet teralokasi ke pos tujuan secara tepat.
2. **Pencatatan Transaksi**:
   - Tombol **(+) Catat** di navigasi bawah atau bar atas membuka pilihan: Pengeluaran, Pemasukan, Pindah Dompet, Transfer, Foto Struk AI, dan Voice AI.
3. **Sinkronisasi Otomatis ke MySQL**:
   - Setiap perubahan transaksi, dompet, hutang, dan aset secara otomatis disinkronkan ke MySQL via endpoint `/api/sync`.
   - Di menu **Profil & Pengaturan**, terdapat indikator: `Database: Tersinkron ke MySQL (Port 3306)`.

