"use client";

import { useEffect, useRef } from "react";

interface RouletteWheelProps {
  teams: string[];
  winningIndex: number | null;
  isSpinning: boolean;
  onSpinEnd: () => void;
}

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
    const colors = ["#00FFFF", "#1A1D24", "#008B8B", "#2A2E39", "#00BFFF", "#111827"];

    const draw = (angleOffset: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      teams.forEach((team, i) => {
        const start = angleOffset + i * sliceAngle;
        const end = start + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(radius, radius);
        ctx.arc(radius, radius, radius - 10, start, end);
        ctx.closePath();

        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(0,255,255,0.3)";
        ctx.stroke();

        // Render Teks Nama Tim
        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(start + sliceAngle / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(team.length > 12 ? team.slice(0, 10) + ".." : team, radius - 30, 4);
        ctx.restore();
      });

      // Jarum Penunjuk Atas (Marker)
      ctx.beginPath();
      ctx.moveTo(radius - 12, 10);
      ctx.lineTo(radius + 12, 10);
      ctx.lineTo(radius, 30);
      ctx.closePath();
      ctx.fillStyle = "#FF0055";
      ctx.fill();
    };

    if (!isSpinning) {
      draw(currentAngleRef.current);
      return;
    }

    // Animasi Spin
    let animationId: number;
    const startTime = performance.now();
    const duration = 4000; // 4 Detik
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
        width={360}
        height={360}
        className="rounded-full shadow-[0_0_50px_rgba(0,255,255,0.2)] border-2 border-primary/30"
      />
    </div>
  );
                                                   }
