// ==========================================
// 1. KONSTANTA
// ==========================================
export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;

// ==========================================
// 2. KONTRAK PAYLOAD API (FRONTEND <-> BACKEND)
// ==========================================
export interface PlayerPayload {
    id: string;
    role: "Ketua" | "Wakil Ketua" | "Anggota" | string;
    ign: string;
    discordId: string;
    idDuelLinks: string;
}

export interface RegistrationPayload {
    namaTim: string;
    email: string;
    hex: string;
    logo?: string; // Berupa URL string
    bukti?: string; // Berupa URL string
    players: PlayerPayload[];
    
    // Properti khusus untuk fitur Edit Tim
    isEditMode?: boolean;
    editToken?: string; 
}

// ==========================================
// 3. TIPE STATE UI (KHUSUS UNTUK KOMPONEN REACT)
// ==========================================
export interface UploadedFile {
    file: File | null;
    url: string;
    publicId?: string;
}

export interface TeamState {
    namaTim: string;
    email: string;
    hex: string;
    logo: UploadedFile | null;
    bukti: UploadedFile | null;
}

export interface PlayerState {
    id: string;
    role: string;
    ign: string;
    discordId: string;
    idDuelLinks: string;
}

export interface RosterState {
    players: PlayerState[];
}

// ==========================================
// 4. FUNGSI UTILITAS (VALIDASI & HELPER)
// ==========================================

/**
 * Menghitung jumlah pemain dengan role tertentu (misal: "Ketua")
 */
export function countRole(players: PlayerState[], role: string): number {
    return players.filter((p) => p.role === role).length;
}

/**
 * Mencari data duplikat (IGN, Discord, Duel Links ID) di dalam internal tim
 * Mengembalikan Set berisi key error (misal: "playerID-ign")
 */
export function findDuplicateFields(players: PlayerState[]): Set<string> {
    const duplicates = new Set<string>();
    const igns = new Set<string>();
    const discords = new Set<string>();
    const duelIds = new Set<string>();

    players.forEach((p) => {
        // Cek IGN duplikat (Case Insensitive)
        if (p.ign) {
            const ignLower = p.ign.toLowerCase();
            if (igns.has(ignLower)) duplicates.add(`${p.id}-ign`);
            else igns.add(ignLower);
        }
        
        // Cek Discord duplikat
        if (p.discordId) {
            if (discords.has(p.discordId)) duplicates.add(`${p.id}-discordId`);
            else discords.add(p.discordId);
        }
        
        // Cek ID Duel Links duplikat
        if (p.idDuelLinks) {
            if (duelIds.has(p.idDuelLinks)) duplicates.add(`${p.id}-duelId`);
            else duelIds.add(p.idDuelLinks);
        }
    });

    return duplicates;
}

/**
 * Membuat object pemain kosong baru dengan ID unik (UUID)
 */
export function createEmptyPlayer(role: string = "Anggota"): PlayerState {
    return {
        id: crypto.randomUUID(),
        role,
        ign: "",
        discordId: "",
        idDuelLinks: "",
    };
}
