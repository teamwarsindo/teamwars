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
    data: { content, flags: 64 }
  });
}

/**
 * Memperbarui (PATCH) 2 Pesan Embed Terpisah di Channel Bidding
 */
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
 * Mengirim 2 Pesan terpisah pertama kali ke Channel Discord
 */
export async function initBiddingMessages(env: any) {
  const initialData: BidStore = { groupA: null, groupB: null, logs: [] };
  const isClosed = !isBidOpen();

  const mainEmbed = buildMainBidEmbed(initialData, isClosed);
  const logEmbed = buildLogBidEmbed(initialData.logs);
  const components = getBidButtons(isClosed);

  const token = process.env.DISCORD_BOT_TOKEN || env?.DISCORD_TOKEN;
  const headers = { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' };

  // 1. Send Pesan Utama
  const resMain = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ embeds: [mainEmbed], components })
  });
  const msgMain: any = await resMain.json();

  // 2. Send Pesan Log
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

/**
 * Pemroses Logika Bidding saat Modal Submit Dikirim
 */
export async function processBidSubmission(interaction: any, env: any) {
  if (!isBidOpen()) {
    await syncBidMessages(env, true);
    return makeEphemeralResponse("❌ **Bidding sudah ditutup!** (Batas waktu: 8 Agustus 2026, 20:00 WIB)");
  }

  const customId = interaction.data.custom_id; 
  const groupTarget = customId.replace("modal_bid_", ""); 
  
  const components = interaction.data.components;
  let nameInput = "";
  let amountRaw = "";

  for (const row of components) {
    for (const comp of row.components) {
      if (comp.custom_id === "input_division_name") nameInput = comp.value.trim();
      if (comp.custom_id === "input_bid_amount") amountRaw = comp.value;
    }
  }

  const amountInput = parseInt(amountRaw.replace(/[^0-9]/g, ''), 10);

  // Validasi Input
  if (isNaN(amountInput) || amountInput < 100000) {
    return makeEphemeralResponse("❌ **Bid ditolak!** Minimal nominal bid adalah **Rp100.000**.");
  }

  if ((amountInput - 100000) % 10000 !== 0) {
    return makeEphemeralResponse("❌ **Bid ditolak!** Nominal bid harus dalam kelipatan **Rp10.000**.");
  }

  const rawData = env?.KV_STORE ? await env.KV_STORE.get(KV_BID_KEY) : null;
  let data: BidStore = typeof rawData === 'string' ? JSON.parse(rawData) : (rawData || { groupA: null, groupB: null, logs: [] });

  const currentA = data.groupA?.amount || 0;
  const currentB = data.groupB?.amount || 0;

  if (groupTarget === "A" && amountInput <= currentA) {
    return makeEphemeralResponse(`❌ Bid harus LEBIH TINGGI dari bid Group A saat ini (${formatRupiah(currentA)}).`);
  }
  if (groupTarget === "B" && amountInput <= currentB) {
    return makeEphemeralResponse(`❌ Bid harus LEBIH TINGGI dari bid Group B saat ini (${formatRupiah(currentB)}).`);
  }
  if (groupTarget === "BOTH" && (amountInput <= currentA || amountInput <= currentB)) {
    return makeEphemeralResponse(`❌ Bid Keduanya harus LEBIH TINGGI dari bid Group A (${formatRupiah(currentA)}) dan Group B (${formatRupiah(currentB)}).`);
  }

  // Simpan Data
  const user = interaction.member?.user || interaction.user;
  const newBid: BidData = {
    amount: amountInput,
    name: nameInput,
    userId: user.id,
    username: user.username,
    timestamp: getWibTimestamp()
  };

  if (groupTarget === "A" || groupTarget === "BOTH") data.groupA = newBid;
  if (groupTarget === "B" || groupTarget === "BOTH") data.groupB = newBid;

  data.logs.unshift({
    group: groupTarget,
    amount: amountInput,
    name: nameInput,
    username: user.username,
    timestamp: getWibTimestamp()
  });

  if (env?.KV_STORE) {
    await env.KV_STORE.put(KV_BID_KEY, JSON.stringify(data));
  }

  // Sync update kedua pesan embed
  await syncBidMessages(env);

  return makeEphemeralResponse(`✅ **Berhasil!** Bid kamu sebesar **${formatRupiah(amountInput)}** untuk Group **${groupTarget}** (*"${nameInput}"*) telah diterima!`);
}
