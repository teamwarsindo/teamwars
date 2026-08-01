"use client";

import { useEffect, useRef, useState } from "react";
import { TeamItem } from "@/app/api/roulette-state/route";

interface RouletteWheelProps {
  teams: TeamItem[];
  winningIndex: number | null;
  isSpinning: boolean;
  onSpinEnd: () => void;
}

const FALLBACK_COLORS = ["#00FFFF", "#1A1D24", "#008B8B", "#2A2E39", "#00BFFF", "#111827"];

// 🗜️ Fungsi Kompresi Logo ke Ukuran Ringan (64x64 px)
function compressAndResizeImage(img: HTMLImageElement, targetSize = 64): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = targetSize;
    offCanvas.height = targetSize;
    const ctx = offCanvas.getContext("2d");

    if (!ctx) return resolve(img);

    // Gambar ulang ke canvas kecil untuk kompresi
    ctx.drawImage(img, 0, 0, targetSize, targetSize);

    const compressedImg = new Image();
    compressedImg.src = offCanvas.toDataURL("image/png", 0.7); // Kompresi kualitas 70%
    compressedImg.onload = () => resolve(compressedImg);
    compressedImg.onerror = () => resolve(img);
  });
}

export function RouletteWheel({ teams, winningIndex, isSpinning, onSpinEnd }: RouletteWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentAngleRef = useRef(0);
  
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});

  // 1. PRELOAD & KOMPRES GAMBAR LOGO secara Asynchronous
  useEffect(() => {
    let isMounted = true;

    const promises = teams.map((team) => {
      return new Promise<{ logo: string; img: HTMLImageElement | null }>((resolve) => {
        if (!team.logo) return resolve({ logo: team.logo, img: null });

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = team.logo;

        img.onload = async () => {
          // Kompres logo ke 64x64px agar sangat ringan diputar
          const compressed = await compressAndResizeImage(img, 64);
          resolve({ logo: team.logo, img: compressed });
        };
        img.onerror = () => resolve({ logo: team.logo, img: null });
      });
    });

    Promise.all(promises).then((results) => {
      if (!isMounted) return;
      const imgMap: Record<string, HTMLImageElement> = {};
      results.forEach((res) => {
        if (res.img) imgMap[res.logo] = res.img;
      });
      setLoadedImages(imgMap);
    });

    return () => {
      isMounted = false;
    };
  }, [teams]);

  // 2. RENDER CANVAS ROULETTE
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const numSlices = teams.length;
    if (numSlices === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const sliceAngle = (2 * Math.PI) / numSlices;
    const radius = canvas.width / 2;

    const draw = (angleOffset: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      teams.forEach((team, i) => {
        const start = angleOffset + i * sliceAngle;
        const end = start + sliceAngle;

        // Draw Irisan / Wedge
        ctx.beginPath();
        ctx.moveTo(radius, radius);
        ctx.arc(radius, radius, radius - 10, start, end);
        ctx.closePath();

        ctx.fillStyle = team.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(0,255,255,0.3)";
        ctx.stroke();

        // Render Gambar Logo Terkompresi
        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(start + sliceAngle / 2);

        const img = loadedImages[team.logo];
        if (img) {
          const logoSize = numSlices > 12 ? 26 : 32;
          const logoDistance = radius - 45;
          ctx.drawImage(img, logoDistance - logoSize / 2, -logoSize / 2, logoSize, logoSize);
        } else {
          ctx.textAlign = "right";
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 11px sans-serif";
          ctx.fillText(team.name.substring(0, 4), radius - 30, 4);
        }

        ctx.restore();
      });

      // Jarum Marker Atas
      ctx.beginPath();
      ctx.moveTo(radius - 12, 10);
      ctx.lineTo(radius + 12, 10);
      ctx.lineTo(radius, 32);
      ctx.closePath();
      ctx.fillStyle = "#FF0055";
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    if (!isSpinning) {
      draw(currentAngleRef.current);
      return;
    }

    let animationId: number;
    const startTime = performance.now();
    const duration = 4000;
    const targetSlice = winningIndex ?? 0;

    const sliceMiddle = targetSlice * sliceAngle + sliceAngle / 2;
    const targetAngle = 6 * Math.PI * 2 + (1.5 * Math.PI - sliceMiddle);

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentAngle = easeOut * targetAngle;
      currentAngleRef.current = currentAngle % (2 * Math.PI);
      draw(currentAngle);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        onSpinEnd();
      }
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [teams, winningIndex, isSpinning, onSpinEnd, loadedImages]);

  return (
    <div className="relative flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        width={380}
        height={380}
        className="rounded-full border-2 border-primary/30 shadow-[0_0_50px_rgba(0,255,255,0.2)]"
      />
    </div>
  );
            }
