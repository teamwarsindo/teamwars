"use client";

import { useState, useEffect } from "react";
import { MatchItem, MatchReportEntry, STORAGE_KEY, generateFileName } from "../utils/lib-match-report";

export function useMatchReport(availableMatches: MatchItem[]) {
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [reports, setReports] = useState<Record<string, MatchReportEntry>>({});
  const [isSending, setIsSending] = useState(false);

  // Inisialisasi awal: Gabungkan data LocalStorage dengan data KV
  useEffect(() => {
    let initialReports: Record<string, MatchReportEntry> = {};

    // 1. Ambil data tersimpan dari KV database terlebih dahulu
    if (availableMatches && availableMatches.length > 0) {
      availableMatches.forEach((m: any) => {
        if (m.reportImageUrl || m.reportNotes) {
          initialReports[m.id] = {
            matchId: m.id,
            imageUrl: m.reportImageUrl || "",
            notes: m.reportNotes || "",
          };
        }
      });
    }

    // 2. Timpa dengan LocalStorage jika ada draft yang belum disubmit
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.selectedWeek) setSelectedWeek(parsed.selectedWeek);
        if (parsed.selectedMatchIds) setSelectedMatchIds(parsed.selectedMatchIds);
        if (parsed.reports) {
          initialReports = { ...initialReports, ...parsed.reports };
        }
      } catch (e) {
        console.error("Gagal load draft dari LocalStorage", e);
      }
    }

    setReports(initialReports);
  }, [availableMatches]);

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

  const handleDirectUpload = async (match: MatchItem, file: File) => {
    let fileName = "";
    try {
      fileName = generateFileName(match);
    } catch (err: any) {
      alert(`[ERROR KODETIM DB]: ${err.message}`);
      return;
    }

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
      const signRes = await fetch("/api/sign-cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: "report",
          public_id: fileName,
        }),
      });

      if (!signRes.ok) {
        throw new Error("Gagal mendapatkan signature dari server /api/sign-cloudinary.");
      }

      const signData = await signRes.json();
      const { api_key, signature, timestamp, folder, format } = signData;

      if (!api_key || !signature) {
        throw new Error("Respon signature tidak lengkap.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", api_key);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("folder", folder || "report");
      formData.append("public_id", fileName);
      formData.append("overwrite", "true");
      if (format) {
        formData.append("format", format);
      }

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dhplw8rsd";

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
        throw new Error("Cloudinary tidak mengembalikan URL gambar yang valid.");
      }
    } catch (err: any) {
      console.error("Gagal upload match report:", err);
      alert(`[UPLOAD ERROR]: ${err.message}`);
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