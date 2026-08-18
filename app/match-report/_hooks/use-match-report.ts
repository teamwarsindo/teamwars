"use client";

import { useState, useEffect } from "react";
import { MatchItem, MatchReportEntry, STORAGE_KEY, generateFileName } from "../_utils/lib-match-report";

export function useMatchReport(availableMatches: MatchItem[]) {
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [reports, setReports] = useState<Record<string, MatchReportEntry>>({});
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let initialReports: Record<string, MatchReportEntry> = {};
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedWeek, selectedMatchIds, reports }));
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
      setReports((prev) => ({
        ...prev,
        [match.id]: {
          ...(prev[match.id] || { notes: "" }),
          matchId: match.id,
          isUploading: false,
          uploadStatus: "error",
          errorMessage: err.message || "Kode tim tidak valid.",
        },
      }));
      return;
    }

    setReports((prev) => ({
      ...prev,
      [match.id]: {
        ...(prev[match.id] || { notes: "" }),
        matchId: match.id,
        imageUrl: prev[match.id]?.imageUrl || "",
        isUploading: true,
        uploadStatus: "idle",
        errorMessage: undefined,
      },
    }));

    try {
      const signRes = await fetch("/api/sign-cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "report", public_id: fileName }),
      });

      if (!signRes.ok) throw new Error("Gagal generate signature.");

      const { api_key, signature, timestamp, folder, format } = await signRes.json();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", api_key);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("folder", folder || "report");
      formData.append("public_id", fileName);
      formData.append("overwrite", "true");
      formData.append("invalidate", "true");
      if (format) formData.append("format", format);

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dhplw8rsd";
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Gagal upload ke Cloudinary.");
      }

      const uploadData = await uploadRes.json();
      if (uploadData.secure_url) {
        setReports((prev) => ({
          ...prev,
          [match.id]: {
            ...prev[match.id],
            imageUrl: uploadData.secure_url,
            isUploading: false,
            uploadStatus: "success",
            errorMessage: undefined,
          },
        }));
      }
    } catch (err: any) {
      setReports((prev) => ({
        ...prev,
        [match.id]: {
          ...prev[match.id],
          isUploading: false,
          uploadStatus: "error",
          errorMessage: err.message || "Upload gagal.",
        },
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