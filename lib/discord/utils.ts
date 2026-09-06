import nacl from 'tweetnacl';

// ── ROSTER TYPES & UTILS GLOBAL ────────────────────────────────

export interface PlayerItem {
  role: 'Ketua' | 'Wakil Ketua' | 'Anggota';
  namaLengkap: string;
  discord: string;
  discordId: string;
  ign: string;
  idDuelLinks: string;
  teamsJoinedCount?: number;
}

export function parsePlayers(playersData: any): PlayerItem[] {
  if (Array.isArray(playersData)) return playersData;
  try {
    return JSON.parse(playersData);
  } catch {
    return [];
  }
}

// ── DISCORD ID & API UTILS ─────────────────────────────────────

export function isValidSnowflake(id?: string): boolean {
  return !!id && /^\d{17,20}$/.test(id);
}

export async function discordAPI(endpoint: string, method: string, body?: any) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error('❌ DISCORD_BOT_TOKEN tidak ditemukan di .env');
    return null;
  }

  try {
    const res = await fetch(`https://discord.com/api/v10${endpoint}`, {
      method,
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 429) {
      const retryData = await res.json().catch(() => ({ retry_after: 1 }));
      console.warn(`⚠️ Rate limited oleh Discord. Menunggu ${retryData.retry_after} detik...`);
      await new Promise((resolve) => setTimeout(resolve, (retryData.retry_after || 1) * 1000));
      return discordAPI(endpoint, method, body);
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ Discord API Error [${res.status}] ${method} ${endpoint}:`, errorText);
      return null;
    }

    if (res.status === 204) return true;
    return await res.json();
  } catch (err) {
    console.error(`❌ Error API Discord [${method} ${endpoint}]:`, err);
    return null;
  }
}

export function verifySignature(rawBody: string, signature: string | null, timestamp: string | null): boolean {
  if (!signature || !timestamp || !process.env.DISCORD_PUBLIC_KEY) return false;
  try {
    return nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, 'hex'),
      Buffer.from(process.env.DISCORD_PUBLIC_KEY, 'hex')
    );
  } catch {
    return false;
  }
}

// ── STRING & TIME FORMATTERS ───────────────────────────────────

export const toProperCase = (str: string) =>
  str.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase());

export const getWIBTime = () =>
  new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'long',
    timeStyle: 'medium',
  });

export function formatWIBDate(dateRaw?: string | Date): string {
  if (!dateRaw) return 'Belum ditentukan';
  const d = new Date(dateRaw);
  if (isNaN(d.getTime())) return 'Belum ditentukan';

  return (
    d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }) +
    ', ' +
    d
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta',
      })
      .replace('.', ':') +
    ' WIB'
  );
}

export function getFooterText(createdAt?: string, updatedAt?: string) {
  const waktuBuat = createdAt ? formatWIBDate(createdAt) : formatWIBDate(new Date());
  return updatedAt
    ? `Registered: ${waktuBuat}\nLast Updated: ${formatWIBDate(updatedAt)}`
    : `Registered: ${waktuBuat}`;
}

export function getEmbedFooterText(dateInput?: string | Date) {
  const isoStr = dateInput instanceof Date ? dateInput.toISOString() : dateInput;
  return getFooterText(isoStr).replace('Registered:', 'Team Wars Indonesia |');
}

export function hexToDecimal(hexString: string, fallbackColor = 11146056): number {
  if (!hexString) return fallbackColor;
  return parseInt(hexString.replace('#', ''), 16) || fallbackColor;
}
