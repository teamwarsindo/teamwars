"use client";

import { useEffect, useRef } from "react";
import { TeamItem } from "@/app/api/roulette-state/route";

interface RouletteWheelProps {
  teams: TeamItem[];
  winningIndex: number | null;
  isSpinning: boolean;
  targetAngleServer?: number | null;
  startTimeMs?: number;
  durationMs?: number;
  onSpinEnd: () => void;
}

const DUAL_COLORS = ["#0284C7", "#334155"];

export function RouletteWheel({
  teams,
  winningIndex,
  isSpinning,
  targetAngleServer,
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

    const draw = (rotationAngle: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Start dari Jam 12 (-PI/2) agar pendaftar #1 ada di atas dan bergerak SEARAH JARUM JAM
      const startBaseAngle = -Math.PI / 2 + rotationAngle;

      teams.forEach((team, i) => {
        const start = startBaseAngle + i * sliceAngle;
        const end = start + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(radius, radius);
        ctx.arc(radius, radius, radius - 10, start, end);
        ctx.closePath();

        ctx.fillStyle = DUAL_COLORS[i % 2];
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.stroke();

        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(start + sliceAngle / 2);

        let fontSize = Math.max(8, Math.min(13, Math.floor(220 / numSlices)));
        ctx.font = `700 ${fontSize}px sans-serif`;

        const maxTextWidth = radius - 55;
        let textWidth = ctx.measureText(team.name).width;

        while (textWidth > maxTextWidth && fontSize > 7) {
          fontSize -= 0.5;
          ctx.font = `700 ${fontSize}px sans-serif`;
          textWidth = ctx.measureText(team.name).width;
        }

        ctx.textAlign = "right";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(team.name, radius - 25, fontSize / 3);
        ctx.restore();
      });

      // Jarum Jam 12 Atas
      ctx.beginPath();
      ctx.moveTo(radius - 12, 10);
      ctx.lineTo(radius + 12, 10);
      ctx.lineTo(radius, 32);
      ctx.closePath();
      ctx.fillStyle = "#38BDF8";
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

    // 🎯 RUMUS ROTASI PENGUNDIAN SEARAH JARUM JAM:
    // Posisikan tengah irisan targetSlice tepat berhenti di bawah jarum jam 12
    const sliceMiddle = (targetSlice + 0.5) * sliceAngle;
    const baseTargetAngle = 10 * Math.PI - sliceMiddle;

    const computedTargetAngle = targetAngleServer ?? baseTargetAngle;

    const animate = () => {
      const now = performance.now();
      const elapsed = Math.max(0, now - startAnimTime);
      const progress = Math.min(elapsed / durationMs, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentAngle = easeOut * computedTargetAngle;
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
  }, [teams, winningIndex, isSpinning, targetAngleServer, startTimeMs, durationMs, onSpinEnd]);

  return (
    <div className="relative flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        width={380}
        height={380}
        className="rounded-full border-2 border-primary/20 bg-card"
      />
    </div>
  );
}
