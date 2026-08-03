# 🏆 Team Wars Indonesia (TWI) Season 7 - Web Application

Dokumentasi resmi dan panduan teknis untuk platform web & integrasi bot Discord **Team Wars Indonesia (TWI) Season 7**. Platform ini dibangun untuk mengelola operasional turnamen esports, pendaftaran tim, verifikasi pembayaran, pengundian grup (*roulette drawing*), hingga sinkronisasi otomatis ke server Discord.

---

## 📐 Arsitektur & Teknologi

Aplikasi ini menggunakan ekosistem modern berbasis **Next.js App Router** dengan performa tinggi dan skalabilitas *serverless*:

- **Framework:** [Next.js 15+/16](https://nextjs.org/) (React 19, App Router, TypeScript)
- **Styling & UI:** [Tailwind CSS](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), Lucide Icons
- **Database & State:** [Vercel KV](https://vercel.com/docs/storage/vercel-kv) (Redis) untuk penyimpanan data tim, registrasi, dan state turnamen
- **Storage & Media:** [Cloudinary](https://cloudinary.com/) untuk penyimpanan logo tim dan bukti transfer
- **Email Service:** [Resend](https://resend.com/) untuk pengiriman email konfirmasi & tiket registrasi
- **Integrasi Bot:** [Discord API / Webhooks](https://discord.com/developers/docs) (Interaction Ed25519 verification, Slash Commands, Button Role Mapping)
- **Deployment:** Vercel Platform

---

## ✨ Fitur Utama

### 1. 📝 Sistem Registrasi Tim & Roster
- Formulir pendaftaran interaktif dengan validasi *real-time* (IGN, Discord ID, Duel ID, Hex Color Tim).
- Modul unggah file terintegrasi Cloudinary untuk logo tim dan bukti pembayaran.
- Validasi data terpusat (`@/lib/validators.ts`) untuk memastikan format ID dan nama tim valid.
- Pengiriman email konfirmasi otomatis via Resend.

### 2. 🔑 Manajemen & Edit Roster Tim
- Tautan unik berbasis token (`/edit-team/[token]`) untuk setiap kapten tim memodifikasi data roster.
- Mode override Admin dengan verifikasi kunci rahasia (*Admin Key*).

### 3. 🛡️ Admin Dashboard & Moderasi
- Panel kontrol khusus (`/admin/dashboard`) untuk verifikasi bukti pembayaran, persetujuan tim (*Approval*), dan penolakan (*Rejection*).
- Fitur sinkronisasi data tim langsung ke Vercel KV dan Discord Server.

### 4. 🎰 Interactive Group Drawing (Roulette)
- Modul pengundian grup interaktif (`/roulette`) untuk pembagian tim secara acak dan adil.
- Kontrol penuh oleh panitia admin dengan tampilan *real-time viewer*.

### 5. 🤖 Integrasi Bot Discord
- Handler interaction Ed25519 pada `/api/discord` untuk memproses *slash command* dan interaksi tombol.
- Fitur otomatisasi penetapan Role Discord, pemberian akses channel tim, dan rekapitulasi data tournament.

---

## 📁 Struktur Direktori Project

```text
├── app/                        # Next.js App Router
│   ├── admin/                  # Admin Dashboard & Login Page
│   │   └── dashboard/          # Panel Manajemen Admin
│   ├── api/                    # API Routes (Serverless Functions)
│   │   ├── admin/              # Endpoint Khusus Admin (Sync, Approval, dll)
│   │   ├── discord/            # Handler Interaction & Webhook Bot Discord
│   │   ├── registration/       # Endpoint Pemrosesan Pendaftaran Tim
│   │   ├── pre-flight/         # Endpoint Validasi Cepat Data Form
│   │   └── roulette/           # Endpoint Kontrol & State Undian Roulette
│   ├── edit-team/[token]/      # Halaman Edit Tim berbasis Unique Token
│   ├── registration/           # Halaman Formulir Pendaftaran Publik
│   ├── roulette/               # Halaman Visualisasi Roulette Pengundian Grup
│   ├── layout.tsx              # Root Layout & ThemeProvider
│   └── page.tsx                # Landing Page Utama TWI Season 7
├── components/                 # Reusable UI Components
│   ├── ui/                     # Komponen Base Shadcn UI
│   ├── team-identity.tsx       # Komponen Form Identitas Tim & File Upload
│   └── roulette-container.tsx  # Engine & Visualisasi Roulette Undian
├── lib/                        # Core Utilities & Configurations
│   ├── discord/                # Bot Config, Commands, Buttons, & Messages
│   ├── email-templates.ts      # Template HTML Email Resend
│   ├── validators.ts           # Centralized Validator Logic
│   └── kv.ts                   # Klien Vercel KV (Redis)
├── proxy.ts                    # Next.js Middleware (Auth Guard, CSRF, Redirect)
├── tailwind.config.ts          # Konfigurasi Styling Tailwind
└── package.json                # Manifest Dependensi Project
