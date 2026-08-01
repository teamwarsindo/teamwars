"use client";

import { useEffect, useRef } from "react";
import { TeamItem } from "@/app/api/roulette-state/route";

interface RouletteWheelProps {
  teams: TeamItem[];
  winningIndex: number | null;
  isSpinning: boolean;
  onSpinEnd: () => void;
}

// 🎨 Palette Warna Soft Modern Esports (Slate, Soft Indigo, Deep Cyan, Dark Violet)
const SLICE_COLORS = [
  "#1e293b", // Slate 800
  "#312e81", // Indigo 900 (Soft)
  "#164e63", // Cyan 900 (Soft)
  "#3b0764", // Purple 950 (Soft)
  "#1e1b4b", // Deep Indigo
  "#0f766e", // Teal 700 (Soft)
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

        // Gambar Irisan dengan warna Modern Soft
        ctx.beginPath();
        ctx.moveTo(radius, radius);
        ctx.arc(radius, radius, radius - 10, start, end);
        ctx.closePath();

        ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(56, 189, 248, 0.25)"; // Cyan border glow
        ctx.stroke();

        // Teks Nama Tim Auto-Fit
        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(start + sliceAngle / 2);

        let fontSize = Math.max(8, Math.min(13, Math.floor(220 / numSlices)));
        ctx.font = `600 ${fontSize}px sans-serif`;

        const maxTextWidth = radius - 55;
        let textWidth = ctx.measureText(team.name).width;

        while (textWidth > maxTextWidth && fontSize > 7) {
          fontSize -= 0.5;
          ctx.font = `600 ${fontSize}px sans-serif`;
          textWidth = ctx.measureText(team.name).width;
        }

        ctx.textAlign = "right";
        ctx.fillStyle = "#F1F5F9"; // Soft Slate White
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 3;
        
        ctx.fillText(team.name, radius - 25, fontSize / 3);
        ctx.restore();
      });

      // Pointer Marker Atas
      ctx.beginPath();
      ctx.moveTo(radius - 12, 10);
      ctx.lineTo(radius + 12, 10);
      ctx.lineTo(radius, 32);
      ctx.closePath();
      ctx.fillStyle = "#38BDF8"; // Sky Blue Glow
      ctx.shadowColor = "rgba(56, 189, 248, 0.8)";
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
        className="rounded-full border-2 border-sky-500/20 shadow-[0_0_60px_rgba(56,189,248,0.12)] bg-slate-900/90"
      />
    </div>
  );
      }
