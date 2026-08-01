"use client";

import { useEffect, useRef } from "react";
import { TeamItem } from "@/app/api/roulette-state/route";

interface RouletteWheelProps {
  teams: TeamItem[];
  winningIndex: number | null;
  isSpinning: boolean;
  startTimeMs?: number;
  durationMs?: number;
  onSpinEnd: () => void;
}

// 🎨 Palette Warna Neon Soft Esports (Sangat Kontras & Catchy)
const VIBRANT_PALETTE = [
  "#00E5FF", // Cyan Neon
  "#FF2A85", // Magenta Neon
  "#FFB800", // Gold / Amber
  "#7C3AED", // Vivid Purple
  "#10B981", // Emerald Green
  "#2563EB", // Royal Blue
  "#F43F5E", // Rose Pink
  "#0284C7", // Sky Blue
];

export function RouletteWheel({
  teams,
  winningIndex,
  isSpinning,
  startTimeMs,
  durationMs = 4000,
  onSpinEnd,
}: RouletteWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentAngleRef = useRef(0);

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

        // Irisan Roda
        ctx.beginPath();
        ctx.moveTo(radius, radius);
        ctx.arc(radius, radius, radius - 10, start, end);
        ctx.closePath();

        ctx.fillStyle = VIBRANT_PALETTE[i % VIBRANT_PALETTE.length];
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#0F172A"; // Border gelap pembatas antar irisan
        ctx.stroke();

        // Teks Nama Tim
        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(start + sliceAngle / 2);

        let fontSize = Math.max(8, Math.min(13, Math.floor(220 / numSlices)));
        ctx.font = `800 ${fontSize}px sans-serif`;

        const maxTextWidth = radius - 55;
        let textWidth = ctx.measureText(team.name).width;

        while (textWidth > maxTextWidth && fontSize > 7) {
          fontSize -= 0.5;
          ctx.font = `800 ${fontSize}px sans-serif`;
          textWidth = ctx.measureText(team.name).width;
        }

        ctx.textAlign = "right";
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
        ctx.shadowBlur = 5;

        ctx.fillText(team.name, radius - 25, fontSize / 3);
        ctx.restore();
      });

      // Pointer Marker Atas
      ctx.beginPath();
      ctx.moveTo(radius - 12, 10);
      ctx.lineTo(radius + 12, 10);
      ctx.lineTo(radius, 32);
      ctx.closePath();
      ctx.fillStyle = "#FF0055";
      ctx.shadowColor = "rgba(255, 0, 85, 0.9)";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#FFFFFF";
      ctx.stroke();
    };

    if (!isSpinning) {
      draw(currentAngleRef.current);
      return;
    }

    let animationId: number;
    const startAnimTime = startTimeMs || performance.now();
    const targetSlice = winningIndex ?? 0;

    const sliceMiddle = targetSlice * sliceAngle + sliceAngle / 2;
    const targetAngle = 6 * Math.PI * 2 + (1.5 * Math.PI - sliceMiddle);

    const animate = () => {
      const now = performance.now();
      const elapsed = Math.max(0, now - startAnimTime);
      const progress = Math.min(elapsed / durationMs, 1);
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
  }, [teams, winningIndex, isSpinning, startTimeMs, durationMs, onSpinEnd]);

  return (
    <div className="relative flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        width={380}
        height={380}
        className="rounded-full border-4 border-cyan-500/40 shadow-[0_0_50px_rgba(0,229,255,0.25)] bg-slate-950"
      />
    </div>
  );
                    }
