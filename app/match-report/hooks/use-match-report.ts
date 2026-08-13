"use client";

import { useState, useEffect, useMemo } from "react";
import { MatchItem, MatchReportEntry, STORAGE_KEY, generateFileName } from "../utils/lib-match-report";

export function useMatchReport(availableMatches: MatchItem[]) {
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [reports, setReports] = useState<Record<string, MatchReportEntry>>({});
  const [isSending, setIsSending] = useState(false);

  // Restore dari LocalStorage
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

  // Sync ke LocalStorage
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ selectedWeek, selectedMatchIds, reports })
    );
  }, [selectedWeek, selectedMatchIds, reports]);

  // Filter match secara dinamis berdasarkan week yang dipilih
  const filteredMatches = useMemo(() => {
    return availableMatches.filter((m) => m.week === selectedWeek);
  }, [availableMatches, selectedWeek]);

  // Ambil daftar week unik yang tersedia dari data match
  const availableWeeks = useMemo(() => {
    const weeks = Array.from(new Set(availableMatches.map((m) => m.week)));
    return weeks.sort((a, b) => a - b);
  }, [availableMatches]);

  const handleMatchToggle = (matchId: string) => {
    setSelectedMatchIds((prev) =>
      prev.includes(matchId) ? prev.filter((id) => id !== matchId) : [...prev, matchId]
    );
  };

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
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "upload_preset",
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "twi_unsigned"
      );
      formData.append("public_id", `report/${fileName}`);
      formData.append("overwrite", "true");

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dhplw8rsd";

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.secure_url) {
        setReports((prev) => ({
          ...prev,
          [match.id]: {
            ...prev[match.id],
            imageUrl: data.secure_url,
            imagePublicId: data.public_id,
            isUploading: false,
          },
        }));
      } else {
        alert(data.error?.message || "Gagal mengunggah gambar ke Cloudinary.");
        setReports((prev) => ({
          ...prev,
          [match.id]: { ...prev[match.id], isUploading: false },
        }));
      }
    } catch (err) {
      console.error("Direct upload gagal:", err);
      alert("Terjadi kesalahan koneksi saat upload.");
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
    filteredMatches,
    availableWeeks,
  };
}