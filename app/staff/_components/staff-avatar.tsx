'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface StaffAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_STYLES = {
  sm: 'h-5 w-5 text-[9px]',
  md: 'h-7 w-7 text-xs',
  lg: 'h-11 w-11 sm:h-12 sm:w-12 text-sm',
};

export default function StaffAvatar({
  name,
  avatarUrl,
  size = 'md',
  className = '',
}: StaffAvatarProps) {
  const [imgErr, setImgErr] = useState(false);
  const initials = (name || 'ST').trim().slice(0, 2).toUpperCase();

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-border/80 bg-muted/40 font-bold flex items-center justify-center select-none shadow-xs ${SIZE_STYStyles(size)} ${className}`}
    >
      {avatarUrl && !imgErr ? (
        <Image
          src={avatarUrl}
          alt={name}
          fill
          sizes="48px"
          className="object-cover rounded-full"
          onError={() => setImgErr(true)}
          unoptimized
        />
      ) : (
        <span className="text-primary font-black">{initials}</span>
      )}
    </div>
  );
}

function SIZE_STYStyles(s: 'sm' | 'md' | 'lg') {
  return SIZE_STYLES[s] || SIZE_STYLES.md;
}