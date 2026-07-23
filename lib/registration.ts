// ==========================================
// 1. TIPE STATE UI (KEMBALI KE NAMA ASLI LU)
// ==========================================
export interface UploadedFile {
    file: File | null;
    url: string;
    publicId?: string;
}

// Sengaja dibalikin ke FormState biar file review-modal & hooks lu nggak hancur
export interface FormState {
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
// 2. KONTRAK API BARU (Hanya dipakai saat submit)
// ==========================================
export interface PlayerPayload {
    id: string;
    role: string;
    ign: string;
    discordId: string;
    idDuelLinks: string;
}

export interface RegistrationPayload {
    namaTim: string;
    email: string;
    hex: string;
    logo?: string; 
    bukti?: string; 
    players: PlayerPayload[];
    isEditMode?: boolean;
    editToken?: string; 
}

// ==========================================
// 3. FUNGSI UTILITAS LAMA LU
// ==========================================
export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;

export function countRole(players: PlayerState[], role: string): number {
    return players.filter((p) => p.role === role).length;
}

export function findDuplicateFields(players: PlayerState[]): Set<string> {
    const duplicates = new Set<string>();
    const igns = new Set<string>();
    const discords = new Set<string>();
    const duelIds = new Set<string>();

    players.forEach((p) => {
        if (p.ign) {
            const ignLower = p.ign.toLowerCase();
            if (igns.has(ignLower)) duplicates.add(`${p.id}-ign`);
            else igns.add(ignLower);
        }
        if (p.discordId) {
            if (discords.has(p.discordId)) duplicates.add(`${p.id}-discordId`);
            else discords.add(p.discordId);
        }
        if (p.idDuelLinks) {
            if (duelIds.has(p.idDuelLinks)) duplicates.add(`${p.id}-duelId`);
            else duelIds.add(p.idDuelLinks);
        }
    });
    return duplicates;
}

export function createEmptyPlayer(role: string = "Anggota"): PlayerState {
    return {
        id: crypto.randomUUID(),
        role,
        ign: "",
        discordId: "",
        idDuelLinks: "",
    };
}
