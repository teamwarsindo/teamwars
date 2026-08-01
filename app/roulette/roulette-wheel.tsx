"use client";

import { useEffect, useRef } from "react";
import { TeamItem } from "@/app/api/roulette-state/route";

interface RouletteWheelProps {
  teams: TeamItem[];
  winningIndex: number | null;
  isSpinning: boolean;
  onSpinEnd: () => void;
}

// 🎨 Warna dasar esports senada dengan background theme (Selang-seling dark)
const SLICE_COLORS = [
  "#0f172a", // Dark Slate
  "#1e293b", // Slate
  "#111827", // Gray Dark
  "#1f2937", // Gray
];

export function RouletteWheel({ teams, winningIndex, isSpinning, onSpinEnd }: RouletteWheelProps) {
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

        // 1. Gambar Irisan Wajah (Wedge) dengan warna senada background
        ctx.beginPath();
        ctx.moveTo(radius, radius);
        ctx.arc(radius, radius, radius - 10, start, end);
        ctx.closePath();

        ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(0, 255, 255, 0.25)"; // Border cyan halus
        ctx.stroke();

        // 2. Render Teks Nama Tim (Full & Auto-Fit Size)
        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(start + sliceAngle / 2);

        // Kuantitas tim makin banyak -> font awal disesuaikan
        let fontSize = Math.max(8, Math.min(13, Math.floor(220 / numSlices)));
        ctx.font = `bold ${fontSize}px sans-serif`;

        // Ukur panjang teks & auto-downscale jika teks terlalu panjang untuk irisan
        const maxTextWidth = radius - 60;
        let textWidth = ctx.measureText(team.name).width;

        while (textWidth > maxTextWidth && fontSize > 7) {
          fontSize -= 0.5;
          ctx.font = `bold ${fontSize}px sans-serif`;
          textWidth = ctx.measureText(team.name).width;
        }

        ctx.textAlign = "right";
        ctx.fillStyle = "#E2E8F0"; // Warna teks putih terang bersih
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 4;
        
        // Render Nama Tim Full
        ctx.fillText(team.name, radius - 25, fontSize / 3);

        ctx.restore();
      });

      // 3. Jarum Marker Atas (Esports Accent Glow)
      ctx.beginPath();
      ctx.moveTo(radius - 12, 10);
      ctx.lineTo(radius + 12, 10);
      ctx.lineTo(radius, 32);
      ctx.closePath();
      ctx.fillStyle = "#00F0FF";
      ctx.shadowColor = "rgba(0, 240, 255, 0.8)";
      ctx.shadowBlur = 10;
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
  }, [teams, winningIndex, isSpinning, onSpinEnd]);

  return (
    <div className="relative flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        width={380}
        height={380}
        className="rounded-full border-2 border-cyan-500/30 shadow-[0_0_50px_rgba(0,255,255,0.15)] bg-slate-950"
      />
    </div>
  );
}
  
