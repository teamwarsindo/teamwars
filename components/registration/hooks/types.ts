import { useTeamDetails } from "@/components/registration/hooks/use-team-details"
import { useRoster } from "@/components/registration/hooks/use-roster"

// 🚀 JURUS PAMUNGKAS:
// Menyalin tipe data persis 100% dari apa yang di-return oleh hook aslimu.
// Tidak perlu lagi membuat interface TeamState & RosterState secara manual!

export type TeamState = ReturnType<typeof useTeamDetails>;
export type RosterState = ReturnType<typeof useRoster>;

// Mengekstrak tipe 1 pemain dari dalam array roster.players
export type PlayerState = RosterState["players"][0];

// Ini tetap manual karena dipakai khusus untuk penangkap error backend
export interface BackendError { 
  field: string; 
  message: string; 
}
