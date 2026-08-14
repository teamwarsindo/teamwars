"use client";

import { useState, useEffect } from "react";
import { MatchItem, MatchReportEntry, STORAGE_KEY, generateFileName } from "../utils/lib-match-report";

export function useMatchReport(availableMatches: MatchItem[]) {
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [reports, setReports] = useState<Record<string, MatchReportEntry>>({});
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.selectedWeek) setSelectedWeek(parsed.selectedWeek);
        if (parsed.selectedMatchIds) setSelectedMatchIds(parsed.selectedMatchIds);
        if (parsed.reports) setReports(parsed.reports);
      } catch (e) {
        console.error("Gagal load draft dari LocalStorage", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ selectedWeek, selectedMatchIds, reports })
    );
  }, [selectedWeek, selectedMatchIds, reports]);

  const handleMatchToggle = (matchId: string) => {
    setSelectedMatchIds((prev) =>
      prev.includes(matchId) ? prev.filter((id) => id !== matchId) : [...prev, matchId]
    );
  };

  // 🟢 FUNGSI UPLOAD YANG MATCH 100% DENGAN /api/sign-cloudinary
  const handleDirectUpload = async (match: MatchItem, file: File) => {
    const fileName = generateFileName(match);

    setReports((prev) => ({
      ...prev,
      [match.id]: {
        ...(prev[match.id] || { notes: "" }),
        matchId: match.id,
        imageUrl: prev[match.id]?.imageUrl || "",
        isUploading: true,
      },
    }));

    try {
      const publicId = `report/${fileName}`;

      // 1. Minta Signature lengkap dari backend Next.js
      const signRes = await fetch("/api/sign-cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: "report",
          public_id: publicId,
        }),
      });

      if (!signRes.ok) {
        throw new Error("Gagal mendapatkan signature dari server.");
      }

      const signData = await signRes.json();
      const { api_key, signature, timestamp, folder, format } = signData;

      if (!api_key || !signature) {
        throw new Error("Respon API signature tidak lengkap.");
      }

      // 2. Susun FormData SESUAI EXACT PARAMETER dari /api/sign-cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", api_key); // 🟢 Diambil langsung dari return JSON /api/sign-cloudinary
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("folder", folder || "report");
      formData.append("public_id", publicId);
      formData.append("overwrite", "true");
      if (format) {
        formData.append("format", format); // 🟢 format "png" dari server
      }

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dhplw8rsd";

      // 3. Eksekusi Signed Upload ke Cloudinary
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errJson = await uploadRes.json();
        throw new Error(errJson?.error?.message || "Upload ke Cloudinary gagal.");
      }

      const uploadData = await uploadRes.json();

      if (uploadData.secure_url) {
        // Tambahkan query timestamp agar gambar baru langsung ke-refresh
        const finalUrl = `${uploadData.secure_url}?t=${Date.now()}`;

        setReports((prev) => ({
          ...prev,
          [match.id]: {
            ...prev[match.id],
            imageUrl: finalUrl,
            isUploading: false,
          },
        }));
      } else {
        throw new Error("Respon Cloudinary tidak memuat URL gambar.");
      }
    } catch (err: any) {
      console.error("Gagal upload match report:", err);
      alert(`Gagal Mengunggah: ${err.message || "Terjadi kesalahan jaringan."}`);
      setReports((prev) => ({
        ...prev,
        [match.id]: { ...prev[match.id], isUploading: false },
      }));
    }
  };

  const updateNotes = (matchId: string, notes: string) => {
    setReports((prev) => ({
      ...prev,
      [matchId]: { ...(prev[matchId] || { imageUrl: "" }), matchId, notes },
    }));
  };

  return {
    selectedWeek,
    setSelectedWeek,
    selectedMatchIds,
    handleMatchToggle,
    reports,
    updateNotes,
    handleDirectUpload,
    isSending,
    setIsSending,
  };
}
