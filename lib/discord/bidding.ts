import { NextResponse } from 'next/server';
import { DISCORD_CONFIG, BID_START_TARGET, BID_CLOSE_TARGET } from '@/lib/config';
import { getBidButtons } from '@/lib/discord/buttons/bidding';
import { buildMainBidEmbed, patchMainBidMessage, formatRupiah } from '@/lib/discord/messages/bidding';
import { buildLogBidEmbed, patchLogBidMessage } from '@/lib/discord/messages/log-bidding';

export interface BidData {
  amount: number;
  name: string;
  userId: string;
  username: string;
  timestamp: string;
}

export interface BidStore {
  groupA: BidData | null;
  groupB: BidData | null;
  logs: Array<{ group: string; amount: number; name: string; username: string; timestamp: string }>;
}

export const KV_BID_KEY = "twi_bidding_data";
export const KV_MSG_MAIN_KEY = "twi_bid_msg_main_id";
export const KV_MSG_LOG_KEY = "twi_bid_msg_log_id";

export function isBidOpen(): boolean {
  const now = Date.now();
  return now >= BID_START_TARGET && now <= BID_CLOSE_TARGET;
}

function getWibTimestamp(): string {
  return new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

function makeEphemeralResponse(content: string) {
  return NextResponse.json({
    type: 4,
    data: {
      content,
      flags: 64
    }
  });
}

export async function initBiddingMessages(env: any) {
  const initialData: BidStore = { groupA: null, groupB: null, logs: [] };
  const isClosed = !isBidOpen();

  const mainEmbed = buildMainBidEmbed(initialData, isClosed);
  const logEmbed = buildLogBidEmbed(initialData.logs);
  const components = getBidButtons(isClosed);

  const token = process.env.DISCORD_BOT_TOKEN || env?.DISCORD_TOKEN;
  const headers = { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' };

  const resMain = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ embeds: [mainEmbed], components })
  });
  const msgMain: any = await resMain.json();

  const resLog = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ embeds: [logEmbed] })
  });
  const msgLog: any = await resLog.json();

  if (env?.KV_STORE) {
    await env.KV_STORE.put(KV_MSG_MAIN_KEY, msgMain.id);
    await env.KV_STORE.put(KV_MSG_LOG_KEY, msgLog.id);
    await env.KV_STORE.put(KV_BID_KEY, JSON.stringify(initialData));
  }
}

export async function syncBidMessages(env: any, forceClosed: boolean = false) {
  const isClosed = forceClosed || !isBidOpen();

  const rawData = env?.KV_STORE ? await env.KV_STORE.get(KV_BID_KEY) : null;
  const data: BidStore = typeof rawData === 'string' ? JSON.parse(rawData) : (rawData || { groupA: null, groupB: null, logs: [] });

  const mainMsgId = env?.KV_STORE ? await env.KV_STORE.get(KV_MSG_MAIN_KEY) : null;
  const logMsgId = env?.KV_STORE ? await env.KV_STORE.get(KV_MSG_LOG_KEY) : null;

  const token = process.env.DISCORD_BOT_TOKEN || env?.DISCORD_TOKEN;

  if (mainMsgId) {
    await patchMainBidMessage(mainMsgId, data, isClosed, token);
  }
  if (logMsgId) {
    await patchLogBidMessage(logMsgId, data.logs, token);
  }
}

/**
 * PROSES SUBMISSION MODAL SECARA LANGSUNG & REAL-TIME
 */
export async function processBidSubmission(interaction: any, env: any) {
  if (!isBidOpen()) {
    await syncBidMessages(env, true);
    return makeEphemeralResponse("❌ **Bidding sudah ditutup!** (Batas waktu: 8 Agustus 2026, 20:00 WIB)");
  }

  const customId = interaction.data.custom_id; 
  const groupTarget = customId.replace("modal_bid_", ""); 
  
  const components = interaction.data.components;
  let nameA = "";
  let nameB = "";
  let amountRaw = "";

  for (const row of components) {
    for (const comp of row.components) {
      if (comp.custom_id === "input_division_name") nameA = comp.value.trim();
      if (comp.custom_id === "input_division_name_a") nameA = comp.value.trim();
      if (comp.custom_id === "input_division_name_b") nameB = comp.value.trim();
      if (comp.custom_id === "input_bid_amount") amountRaw = comp.value;
    }
  }

  const amountInput = parseInt(amountRaw.replace(/[^0-9]/g, ''), 10);

  // 1. Validasi Minimal Nominal Bid (Minimal Rp100.000)
  if (isNaN(amountInput) || amountInput < 100000) {
    return makeEphemeralResponse("❌ **Bid ditolak!** Minimal nominal bid adalah **Rp100.000**.");
  }

  // 2. Validasi Kelipatan Rp10.000
  if ((amountInput - 100000) % 10000 !== 0) {
    return makeEphemeralResponse("❌ **Bid ditolak!** Nominal bid harus dalam kelipatan **Rp10.000** (Contoh: 110.000, 120.000).");
  }

  // 3. Load Data Bidding Saat Ini
  const rawData = env?.KV_STORE ? await env.KV_STORE.get(KV_BID_KEY) : null;
  let data: BidStore = typeof rawData === 'string' ? JSON.parse(rawData) : (rawData || { groupA: null, groupB: null, logs: [] });

  const currentA = data.groupA?.amount || 0;
  const currentB = data.groupB?.amount || 0;

  // 4. Validasi Min Bid Lebih Tinggi dari Papan Harga Saat Ini
  if (groupTarget === "A") {
    const minRequiredA = currentA === 0 ? 110000 : currentA + 10000;
    if (amountInput < minRequiredA) {
      return makeEphemeralResponse(`❌ **Bid ditolak!** Bid Group A saat ini **${formatRupiah(currentA === 0 ? 100000 : currentA)}**. Bid kamu minimal harus **${formatRupiah(minRequiredA)}**.`);
    }
  } else if (groupTarget === "B") {
    const minRequiredB = currentB === 0 ? 110000 : currentB + 10000;
    if (amountInput < minRequiredB) {
      return makeEphemeralResponse(`❌ **Bid ditolak!** Bid Group B saat ini **${formatRupiah(currentB === 0 ? 100000 : currentB)}**. Bid kamu minimal harus **${formatRupiah(minRequiredB)}**.`);
    }
  } else if (groupTarget === "BOTH") {
    const minReqA = currentA === 0 ? 110000 : currentA + 10000;
    const minReqB = currentB === 0 ? 110000 : currentB + 10000;
    if (amountInput < minReqA || amountInput < minReqB) {
      return makeEphemeralResponse(`❌ **Bid ditolak!** Nominal **${formatRupiah(amountInput)}** harus lebih tinggi dari Group A (Min: ${formatRupiah(minReqA)}) DAN Group B (Min: ${formatRupiah(minReqB)}).`);
    }
  }

  // 5. Simpan Langsung Data Permanen ke KV
  const user = interaction.member?.user || interaction.user;
  const timestamp = getWibTimestamp();

  if (groupTarget === "A" || groupTarget === "BOTH") {
    data.groupA = { amount: amountInput, name: nameA, userId: user.id, username: user.username, timestamp };
    data.logs.unshift({ group: "A", amount: amountInput, name: nameA, username: user.username, timestamp });
  }

  if (groupTarget === "B" || groupTarget === "BOTH") {
    const finalNameB = groupTarget === "BOTH" ? nameB : nameA;
    data.groupB = { amount: amountInput, name: finalNameB, userId: user.id, username: user.username, timestamp };
    data.logs.unshift({ group: "B", amount: amountInput, name: finalNameB, username: user.username, timestamp });
  }

  if (env?.KV_STORE) {
    await env.KV_STORE.put(KV_BID_KEY, JSON.stringify(data));
  }

  // 6. Langsung Update Embed Discord di Channel
  await syncBidMessages(env);

  // 7. Balas sukses ke user
  const successMessage = groupTarget === "BOTH"
    ? `✅ **Berhasil!** Bid sebesar **${formatRupiah(amountInput)}** untuk **Group A** (*"${nameA}"*) & **Group B** (*"${nameB}"*) telah diterima dan dicatat!`
    : `✅ **Berhasil!** Bid sebesar **${formatRupiah(amountInput)}** untuk **Group ${groupTarget}** (*"${nameA}"*) telah diterima dan dicatat!`;

  return makeEphemeralResponse(successMessage);
}
