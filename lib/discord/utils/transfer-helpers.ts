import { TeamKVData } from '../services/transfer-service';

export function formatDuelId(input: string): string {
  if (!input) return '-';
  const clean = input.replace(/\D/g, '');
  if (clean.length !== 9) return input.trim();
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 9)}`;
}

export function parsePlayers(playersData: any): any[] {
  if (Array.isArray(playersData)) return playersData;
  try {
    return JSON.parse(playersData);
  } catch {
    return [];
  }
}

export function getTeamPrefix(teamData: TeamKVData): string {
  if (teamData.emojiId) return `<:team:${teamData.emojiId}> `;
  if (teamData.kodeTim) return `[${teamData.kodeTim}] `;
  return '';
}

export function parseTransferSmartText(rawText: string) {
  const textLower = rawText.toLowerCase();

  let action: 'ADD' | 'OUT' | 'EDIT' = 'ADD';
  if (textLower.includes('req out') || textLower.includes('mengeluarkan')) {
    action = 'OUT';
  } else if (textLower.includes('ganti') || textLower.includes('edit')) {
    action = 'EDIT';
  }

  const idMatches = rawText.match(/(\d{3}[-\s]?\d{3}[-\s]?\d{3}|\d{9})/g);
  let idDl: string | null = null;
  if (idMatches && idMatches.length > 0) {
    idDl = idMatches[idMatches.length - 1].replace(/\D/g, '');
  }

  let ign: string | null = null;
  const ignMatch = rawText.match(/IGN\s*:\s*([^\n\r\t]+)/i);
  if (ignMatch) {
    let extracted = ignMatch[1].trim();
    const cutoffIndex = extracted.search(/\b(ID|ID DL|MD|MD lama|MD baru|Discord)\b/i);
    if (cutoffIndex !== -1) {
      extracted = extracted.substring(0, cutoffIndex).trim();
    }
    ign = extracted || null;
  }

  return { action, ign, idDl };
}
