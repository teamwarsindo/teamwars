import Link from "next/link";

export default function MaintenancePage() {
    return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center animate-in fade-in duration-500">
            <div className="mb-6 rounded-full bg-yellow-500/20 p-6">
                <span className="text-6xl">🛠️</span>
            </div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Sistem Sedang Diperbaiki
            </h1>
            <p className="mx-auto mb-8 max-w-md text-muted-foreground">
                Mohon maaf, halaman Registrasi dan Edit Tim saat ini sedang ditutup sementara untuk perbaikan sistem dan pembersihan bug. Kami akan segera kembali!
            </p>
            <Link 
                href="/" 
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
                Kembali ke Beranda
            </Link>
        </div>
    )
}
