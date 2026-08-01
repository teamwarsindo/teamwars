import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG, BID_START_TARGET, BID_CLOSE_TARGET } from '@/lib/config';
import { getBidButtons } from '@/lib/discord/buttons/bidding';
import { buildMainBidEmbed, patchMainBidMessage, formatRupiah } from '@/lib/discord/messages/bidding';
import { buildLogBidEmbed, patchLogBidMessage } from '@/lib/discord/messages/log-bidding';

export interface BidData {
  amount: number;
  name: string;
  userId: string;
  username: string;
  displayName: string;
  timestamp: string;
}

export interface BidStore {
  groupA: BidData | null;
  groupB: BidData | null;
  logs: Array<{ group: string; amount: number; name: string; username: string; displayName: string; timestamp: string }>;
}

export const KV_BID_KEY = "twi_bidding_data";
export const KV_MSG_MAIN_KEY = "twi_bid_msg_main_id";
export const KV_MSG_LOG_KEY = "twi_bid_msg_log_id";

export function isBidOpen(): boolean {
  const now = Date.now();
  return now >= BID_START_TARGET && now <= BID_CLOSE_TARGET;
}

function getFullWibTimestamp(): string {
  const date = new Date();
  const dateStr = date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${dateStr} ${timeStr} WIB`;
}

function makeEphemeralResponse(content: string) {
  return NextResponse.json({
    type: 4,
    data: { content, flags: 64 }
  });
}

export async function initBiddingMessages() {
  const initialData: BidStore = { groupA: null, groupB: null, logs: [] };
  const isClosed = !isBidOpen();

  const mainEmbed = buildMainBidEmbed(initialData, isClosed);
  const logEmbed = buildLogBidEmbed(initialData.logs);
  const components = getBidButtons(isClosed);

  const token = process.env.DISCORD_BOT_TOKEN;
  const headers = { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' };

  const resMain = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages`, {
    method: 'POST', headers, body: JSON.stringify({ embeds: [mainEmbed], components })
  });
  const msgMain: any = await resMain.json();

  const resLog = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages`, {
    method: 'POST', headers, body: JSON.stringify({ embeds: [logEmbed] })
  });
  const msgLog: any = await resLog.json();

  await kv.set(KV_MSG_MAIN_KEY, msgMain.id);
  await kv.set(KV_MSG_LOG_KEY, msgLog.id);
  await kv.set(KV_BID_KEY, initialData);
}

export async function syncBidMessages(forceClosed: boolean = false) {
  const isClosed = forceClosed || !isBidOpen();

  const data: BidStore = (await kv.get<BidStore>(KV_BID_KEY)) || { groupA: null, groupB: null, logs: [] };
  const mainMsgId = await kv.get<string>(KV_MSG_MAIN_KEY);
  const logMsgId = await kv.get<string>(KV_MSG_LOG_KEY);

  const token = process.env.DISCORD_BOT_TOKEN;

  if (mainMsgId) await patchMainBidMessage(mainMsgId, data, isClosed, token!);
  if (logMsgId) await patchLogBidMessage(logMsgId, data.logs, token!);
}

export async function processBidSubmission(interaction: any) {
  if (!isBidOpen()) {
    return makeEphemeralResponse("❌ **Bidding sudah ditutup!** (Batas waktu: 8 Agustus 2026, 20:00 WIB)");
  }

  const customId = interaction.data.custom_id; 
  const groupTarget = customId.replace("modal_bid_", ""); 
  
  const rows = interaction.data.components || [];
  let nameA = "";
  let nameB = "";
  let amountRaw = "";

  for (const row of rows) {
    for (const comp of (row.components || [])) {
      if (comp.custom_id === "input_division_name") nameA = comp.value.trim();
      if (comp.custom_id === "input_division_name_a") nameA = comp.value.trim();
      if (comp.custom_id === "input_division_name_b") nameB = comp.value.trim();
      if (comp.custom_id === "input_bid_amount") amountRaw = comp.value;
    }
  }

  const amountInput = parseInt(amountRaw.replace(/[^0-9]/g, ''), 10);

  if (isNaN(amountInput) || amountInput < 100000) {
    return makeEphemeralResponse("❌ **Bid ditolak!** Minimal nominal bid adalah **Rp 100.000**.");
  }

  if ((amountInput - 100000) % 10000 !== 0) {
    return makeEphemeralResponse("❌ **Bid ditolak!** Nominal bid harus kelipatan **Rp 10.000** (Contoh: 110000, 120000).");
  }

  const data: BidStore = (await kv.get<BidStore>(KV_BID_KEY)) || { groupA: null, groupB: null, logs: [] };

  const currentA = data.groupA?.amount || 0;
  const currentB = data.groupB?.amount || 0;

  if (groupTarget === "A") {
    const minRequiredA = currentA === 0 ? 110000 : currentA + 10000;
    if (amountInput < minRequiredA) {
      return makeEphemeralResponse(`❌ **Bid ditolak!** Group A saat ini **${formatRupiah(currentA === 0 ? 100000 : currentA)}**. Bid minimal kamu harus **${formatRupiah(minRequiredA)}**.`);
    }
  } else if (groupTarget === "B") {
    const minRequiredB = currentB === 0 ? 110000 : currentB + 10000;
    if (amountInput < minRequiredB) {
      return makeEphemeralResponse(`❌ **Bid ditolak!** Group B saat ini **${formatRupiah(currentB === 0 ? 100000 : currentB)}**. Bid minimal kamu harus **${formatRupiah(minRequiredB)}**.`);
    }
  } else if (groupTarget === "BOTH") {
    const minReqA = currentA === 0 ? 110000 : currentA + 10000;
    const minReqB = currentB === 0 ? 110000 : currentB + 10000;
    if (amountInput < minReqA || amountInput < minReqB) {
      return makeEphemeralResponse(`❌ **Bid ditolak!** Nominal **${formatRupiah(amountInput)}** harus lebih tinggi dari Group A (Min: ${formatRupiah(minReqA)}) DAN Group B (Min: ${formatRupiah(minReqB)}).`);
    }
  }

  const member = interaction.member;
  const user = member?.user || interaction.user;
  const displayName = member?.nick || user.global_name || user.username;
  const timestamp = getFullWibTimestamp();

  if (groupTarget === "A" || groupTarget === "BOTH") {
    data.groupA = { amount: amountInput, name: nameA, userId: user.id, username: user.username, displayName, timestamp };
  }

  if (groupTarget === "B" || groupTarget === "BOTH") {
    const finalNameB = groupTarget === "BOTH" ? nameB : nameA;
    data.groupB = { amount: amountInput, name: finalNameB, userId: user.id, username: user.username, displayName, timestamp };
  }

  if (groupTarget === "BOTH") {
    data.logs.unshift({ group: "BOTH", amount: amountInput, name: `A: "${nameA}" | B: "${nameB}"`, username: user.username, displayName, timestamp });
  } else {
    data.logs.unshift({ group: groupTarget, amount: amountInput, name: nameA, username: user.username, displayName, timestamp });
  }

  await kv.set(KV_BID_KEY, data);

  syncBidMessages().catch(err => console.error("Sync Embed Error:", err));

  const successMessage = groupTarget === "BOTH"
    ? `✅ **Berhasil!** Bid **${formatRupiah(amountInput)}** untuk **Group A** (*"${nameA}"*) & **Group B** (*"${nameB}"*) telah dicatat!`
    : `✅ **Berhasil!** Bid **${formatRupiah(amountInput)}** untuk **Group ${groupTarget}** (*"${nameA}"*) telah dicatat!`;

  return makeEphemeralResponse(successMessage);
}
