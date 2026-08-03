"use client"

import { useEffect } from "react"
import { useSearchParams } from 'next/navigation'

export function AlertNotOpen() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('error') === 'not_open') {
      alert("Sabar ya! Registrasi belum dibuka. Tunggu hitung mundur selesai ⏳")
    }
  }, [searchParams])

  return null
}
