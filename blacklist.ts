"use client"
import { useState, useEffect } from "react"
import { CloseIcon } from "@/components/icons"

interface ZoomLightboxProps {
    src: string;
    alt: string;
    className?: string;
}

export function ZoomLightbox({ src, alt, className = "" }: ZoomLightboxProps) {
    const [isZoomed, setIsZoomed] = useState(false);

    // Kunci scroll body saat lightbox terbuka
    useEffect(() => {
        if (isZoomed) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "unset";
        
        return () => { document.body.style.overflow = "unset" };
    }, [isZoomed]);

    return (
        <>
            <img 
                src={src} 
                alt={alt} 
                className={`cursor-zoom-in rounded-md border object-cover transition-transform hover:scale-105 ${className}`}
                onClick={() => setIsZoomed(true)}
            />

            {isZoomed && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in"
                    onClick={() => setIsZoomed(false)}
                >
                    <button 
                        className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
                        onClick={() => setIsZoomed(false)}
                    >
                        <CloseIcon className="size-6" />
                    </button>
                    <img 
                        src={src} 
                        alt={alt} 
                        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
                        onClick={(e) => e.stopPropagation()} 
                    />
                </div>
            )}
        </>
    );
}
