import { useState } from "react";
import { RefereeProfile, RefereeAggregatedData } from "@/app/tournament/_library/referee-types";
import { Edit3, Receipt, X, Upload, Image as ImageIcon } from "lucide-react";

export function EditProfileModal({
  profile,
  onClose,
  onSave,
  isPending,
}: {
  profile: RefereeProfile;
  onClose: () => void;
  onSave: (data: RefereeProfile) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState(profile);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
            <Edit3 className="h-4 w-4 text-primary" /> Edit Data Rekening: {formData.name}
          </span>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(formData);
          }}
          className="space-y-3 text-xs"
        >
          <div className="space-y-1">
            <label className="font-bold text-muted-foreground">Bank / E-Wallet</label>
            <input
              type="text"
              placeholder="BCA, DANA, GoPay, Mandiri"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              required
              className="w-full rounded-xl border border-border bg-muted/40 p-2.5 font-semibold text-foreground focus:outline-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-muted-foreground">Nomor Rekening / HP</label>
            <input
              type="text"
              placeholder="Nomor rekening asli"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              required
              className="w-full rounded-xl border border-border bg-muted/40 p-2.5 font-semibold text-foreground focus:outline-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-muted-foreground">Atas Nama Pemilik</label>
            <input
              type="text"
              placeholder="Nama di rekening"
              value={formData.accountHolder}
              onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
              required
              className="w-full rounded-xl border border-border bg-muted/40 p-2.5 font-semibold text-foreground focus:outline-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3.5 py-2 rounded-xl border border-border hover:bg-muted font-semibold">
              Batal
            </button>
            <button type="submit" disabled={isPending} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 disabled:opacity-50">
              {isPending ? "Menyimpan..." : "Simpan Rekening"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PaymentModal({
  referee,
  onClose,
  onSave,
  isPending,
}: {
  referee: RefereeAggregatedData;
  onClose: () => void;
  onSave: (amount: number, notes: string, receiptUrl: string) => void;
  isPending: boolean;
}) {
  const [amount, setAmount] = useState<number>(referee.remainingUnpaid);
  const [notes, setNotes] = useState<string>("");
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", "twi_reports");

      const res = await fetch("https://api.cloudinary.com/v1_1/teamwars/image/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.secure_url) setReceiptUrl(data.secure_url);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
            <Receipt className="h-4 w-4 text-primary" /> Catat Pembayaran: {referee.name}
          </span>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(amount, notes, receiptUrl);
          }}
          className="space-y-3 text-xs"
        >
          <div className="space-y-1">
            <label className="font-bold text-muted-foreground">Nominal Ditransfer (Rp)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
              className="w-full rounded-xl border border-border bg-muted/40 p-2.5 font-bold text-foreground text-sm focus:outline-primary"
            />
            <span className="text-[10.5px] text-muted-foreground">
              Sisa tagihan: Rp {referee.remainingUnpaid.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-muted-foreground">Upload Bukti Transfer</label>
            <label className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-dashed border-border bg-muted/30 hover:bg-muted cursor-pointer transition">
              <Upload className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-bold text-muted-foreground">
                {uploading ? "Mengunggah..." : "Pilih Gambar Bukti"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
            </label>
            {receiptUrl && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 mt-1">
                <ImageIcon className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1 font-semibold text-[11px]">Bukti berhasil diunggah</span>
                <a href={receiptUrl} target="_blank" rel="noreferrer" className="underline font-bold text-[11px]">
                  Lihat
                </a>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="font-bold text-muted-foreground">Catatan (Opsional)</label>
            <input
              type="text"
              placeholder="Transfer via BCA m-Banking"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/40 p-2.5 font-semibold text-foreground focus:outline-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3.5 py-2 rounded-xl border border-border hover:bg-muted font-semibold">
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending || uploading}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "Menyimpan..." : "Konfirmasi Pembayaran"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
              }
