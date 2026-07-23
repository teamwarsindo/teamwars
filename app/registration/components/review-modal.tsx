"use client"
import { useEffect, useState } from "react"
import { CloseIcon, AlertIcon } from "@/components/icons"
import type { FormState, UploadedFile } from "@/lib/registration"
import { Captcha } from "./captcha"
import { ZoomLightbox } from "./zoom-lightbox"

interface ReviewModalProps {
    open: boolean
    onClose: () => void
    form: FormState
    logo: UploadedFile | null
    bukti: UploadedFile | null
    submitting: boolean
    serverError: string | null
    onConfirm: () => void
    isEditMode?: boolean
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col border-b border-border/50 pb-2 last:border-0 last:pb-0">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="font-medium text-foreground">{value || "—"}</span>
        </div>
    )
}

export function ReviewModal({
    open, onClose, form, logo, bukti, submitting, serverError, onConfirm, isEditMode = false
}: ReviewModalProps) {
    
    // Checkbox Persetujuan State (Masih di sini karena terkait erat dengan form final)
    const [setujuData, setSetujuData] = useState(false)
    const [setujuRules, setSetujuRules] = useState(false)
    
    // Status validasi Captcha dari komponen anak
    const [isCaptchaValid, setIsCaptchaValid] = useState(false)

    // Reset state ketika modal dibuka/ditutup
    useEffect(() => {
        if (open) {
            setSetujuData(false)
            setSetujuRules(false)
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "unset"
        }
        return () => { document.body.style.overflow = "unset" }
    }, [open])

    // Tombol konfirmasi hanya aktif jika semua syarat terpenuhi
    const canConfirm = setujuData && setujuRules && isCaptchaValid && !submitting

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl animate-in zoom-in-95">
                
                {/* Header Modal */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h2 className="text-lg font-bold">Review Data Tim</h2>
                    <button onClick={onClose} disabled={submitting} className="rounded-full p-2 hover:bg-muted transition-colors">
                        <CloseIcon className="size-5" />
                    </button>
                </div>

                {/* Konten Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    
                    {serverError && (
                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
                            <AlertIcon className="size-5 shrink-0" />
                            <p>{serverError}</p>
                        </div>
                    )}

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Kolom 1: Detail Identitas */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-primary">Identitas Tim</h3>
                            <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                                <Row label="Nama Tim" value={form.namaTim} />
                                <Row label="Email Perwakilan" value={form.email} />
                                <div className="flex flex-col border-b border-border/50 pb-2">
                                    <span className="text-xs text-muted-foreground">Warna Hex</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="size-4 rounded-full border shadow-sm" style={{ backgroundColor: form.hex }} />
                                        <span className="font-mono text-sm">{form.hex}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Kolom 2: Bukti File */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-primary">Berkas Lampiran</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="mb-1.5 block text-xs text-muted-foreground">Logo Tim</span>
                                    {logo?.url ? (
                                        <ZoomLightbox src={logo.url} alt="Logo Tim" className="aspect-square w-full" />
                                    ) : (
                                        <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed bg-muted/50 text-xs text-muted-foreground">Kosong</div>
                                    )}
                                </div>
                                <div>
                                    <span className="mb-1.5 block text-xs text-muted-foreground">Bukti Transfer</span>
                                    {bukti?.url ? (
                                        <ZoomLightbox src={bukti.url} alt="Bukti Transfer" className="aspect-[3/4] w-full" />
                                    ) : (
                                        <div className="flex aspect-[3/4] w-full items-center justify-center rounded-md border border-dashed bg-muted/50 text-xs text-muted-foreground">Kosong</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="my-6" />

                    {/* Persetujuan & Captcha */}
                    <div className="space-y-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input type="checkbox" checked={setujuData} onChange={(e) => setSetujuData(e.target.checked)} className="mt-1 size-4 rounded border-border" />
                            <span className="text-sm text-muted-foreground">Saya menjamin bahwa seluruh data pemain yang didaftarkan adalah benar, asli, dan telah diperiksa ulang.</span>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input type="checkbox" checked={setujuRules} onChange={(e) => setSetujuRules(e.target.checked)} className="mt-1 size-4 rounded border-border" />
                            <span className="text-sm text-muted-foreground">Tim kami telah membaca dan menyetujui seluruh <a href="/rules" target="_blank" className="text-primary hover:underline">Rulebook & Guidelines</a> yang berlaku.</span>
                        </label>

                        {/* Komponen Captcha yang sudah diisolasi */}
                        <Captcha onValidChange={setIsCaptchaValid} resetTrigger={open} />
                    </div>
                </div>

                {/* Footer Modal */}
                <div className="flex items-center justify-end gap-3 border-t bg-muted/10 px-6 py-4">
                    <button onClick={onClose} disabled={submitting} className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                        Kembali
                    </button>
                    <button 
                        onClick={onConfirm} 
                        disabled={!canConfirm}
                        className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting ? "Memproses..." : "Konfirmasi & Kirim"}
                    </button>
                </div>
            </div>
        </div>
    )
}
