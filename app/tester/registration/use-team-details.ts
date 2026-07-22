import { useState } from "react"
import type { UploadedFile } from "./lib-registration"

export function useTeamDetails() {
  const [email, setEmail] = useState("")
  const [namaTim, setNamaTim] = useState("")
  const [hex, setHex] = useState("")
  const [logo, setLogo] = useState<UploadedFile | null>(null)
  const [bukti, setBukti] = useState<UploadedFile | null>(null)

  return {
    email, setEmail,
    namaTim, setNamaTim,
    hex, setHex,
    logo, setLogo,
    bukti, setBukti
  }
}

