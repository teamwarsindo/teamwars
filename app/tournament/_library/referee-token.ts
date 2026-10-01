const SECRET = process.env.MATCH_TOKEN_SECRET || 'twi-secret-referee-token-key-2026';

const encoder = new TextEncoder();

async function getHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function toBase64Url(buf: Uint8Array): string {
  let str = '';
  for (let i = 0; i < buf.length; i++) {
    str += String.fromCharCode(buf[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const raw = atob(base64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    buf[i] = raw.charCodeAt(i);
  }
  return buf;
}

/** Buat token wasit terenkripsi dari discordId */
export async function generateRefereeToken(discordId: string): Promise<string> {
  const payload = `${discordId}.${Date.now()}`;
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const sigPart = toBase64Url(new Uint8Array(signature)).slice(0, 16);

  const finalPayload = `${payload}.${sigPart}`;
  return toBase64Url(encoder.encode(finalPayload));
}

/** Validasi token wasit dan kembalikan discordId jika valid */
export async function verifyRefereeToken(token: string): Promise<string | null> {
  try {
    const rawBytes = fromBase64Url(token);
    const decoded = new TextDecoder().decode(rawBytes);
    const parts = decoded.split('.');
    if (parts.length !== 3) return null;

    const [discordId, tsStr, receivedSig] = parts;
    const payload = `${discordId}.${tsStr}`;

    const key = await getHmacKey();
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSig = toBase64Url(new Uint8Array(signature)).slice(0, 16);

    if (receivedSig !== expectedSig) return null;
    return discordId;
  } catch {
    return null;
  }
}
