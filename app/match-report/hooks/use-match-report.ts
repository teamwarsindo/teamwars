"use client";

import { useState, useEffect } from "react";
import { MatchItem, MatchReportEntry, STORAGE_KEY, generateFileName } from "../utils/lib-match-report";
import { compressAndUpload } from "@/lib/cloudinary";

export function useMatchReport(availableMatches: MatchItem[]) {
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [reports, setReports] = useState<Record<string, MatchReportEntry>>({});
  const [isSending, setIsSending] = useState(false);

  // Restore Draft dari LocalStorage
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

  // Save State ke LocalStorage
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
    const fileName = generateFileName(match);

    // Set Loading State
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
      let secureUrl = "";

      // 🟢 STRATEGI 1: Panggil fungsi kompresi resmi project (@/lib/cloudinary)
      try {
        secureUrl = await compressAndUpload(file, "report" as any, fileName);
      } catch (libErr) {
        console.warn("Fungsi compressAndUpload gagal/tidak cocok, mencoba Direct Upload Preset...", libErr);

        // 🟢 STRATEGI 2: Fallback Direct API Upload dengan Limit Timeout & Preset
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "twi_unsigned");
        formData.append("public_id", `report/${fileName}`);
        formData.append("overwrite", "true");

        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dhplw8rsd";
        
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData?.error?.message || "Upload ke Cloudinary gagal.");
        }

        const data = await res.json();
        secureUrl = data.secure_url;
      }

      if (secureUrl) {
        setReports((prev) => ({
          ...prev,
          [match.id]: {
            ...prev[match.id],
            imageUrl: secureUrl,
            isUploading: false,
          },
        }));
      } else {
        throw new Error("Tidak menerima URL gambar dari Cloudinary.");
      }
    } catch (err: any) {
      console.error("Gagal mengunggah gambar match report:", err);
      alert(`Gagal mengunggah gambar: ${err.message || "Pastikan koneksi internet stabil."}`);
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
