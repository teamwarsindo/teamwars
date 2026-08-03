"use client"
import { useState, useEffect } from "react"

interface CaptchaProps {
    onValidChange: (isValid: boolean) => void;
    resetTrigger?: boolean;
}

export function Captcha({ onValidChange, resetTrigger }: CaptchaProps) {
    const [a, setA] = useState(0);
    const [b, setB] = useState(0);
    const [answer, setAnswer] = useState("");

    // Generate angka acak setiap kali komponen dimuat atau resetTrigger berubah
    useEffect(() => {
        setA(Math.floor(Math.random() * 8) + 1);
        setB(Math.floor(Math.random() * 8) + 1);
        setAnswer("");
        onValidChange(false);
    }, [resetTrigger]);

    // Validasi jawaban secara real-time
    useEffect(() => {
        const parsed = Number.parseInt(answer, 10);
        const isValid = !isNaN(parsed) && parsed === a + b;
        onValidChange(isValid);
    }, [answer, a, b]);

    return (
        <div className="mt-4 flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
            <span className="shrink-0 font-mono text-lg font-bold">
                {a} + {b} =
            </span>
            <input
                type="number"
                min="0"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="?"
                className="w-20 rounded-md border bg-background px-3 py-1.5 text-center text-lg font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
        </div>
    );
}
