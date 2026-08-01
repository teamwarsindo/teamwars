import { NextResponse } from 'next/server';
import { DISCORD_CONFIG, BID_START_TARGET, BID_CLOSE_TARGET } from '@/lib/config';
import { getBidButtons, getConfirmButtons } from '@/lib/discord/buttons/bidding';
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

function makeEphemeralResponse(content: string, components: any[] = []) {
  return NextResponse.json({
    type: 4,
    data: {
      content,
      flags: 64,
      components
    }
  });
}

/**
 * 🛠️ EXPORT FUNGSI SETUP UTAMA (Kirim Pesan Pertama Kali)
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
 * Form Submit Handler
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

  if (groupTarget === "A") {
    const minRequired = currentA === 0 ? 100000 : currentA + 10000;
    if (amountInput < minRequired) {
      return makeEphemeralResponse(`❌ **Bid ditolak!** Bid Group A saat ini **${formatRupiah(currentA)}**. Bid kamu minimal **${formatRupiah(minRequired)}**.`);
    }
  } else if (groupTarget === "B") {
    const minRequired = currentB === 0 ? 100000 : currentB + 10000;
    if (amountInput < minRequired) {
      return makeEphemeralResponse(`❌ **Bid ditolak!** Bid Group B saat ini **${formatRupiah(currentB)}**. Bid kamu minimal **${formatRupiah(minRequired)}**.`);
    }
  } else if (groupTarget === "BOTH") {
    const minReqA = currentA === 0 ? 100000 : currentA + 10000;
    const minReqB = currentB === 0 ? 100000 : currentB + 10000;
    if (amountInput < minReqA || amountInput < minReqB) {
      return makeEphemeralResponse(`❌ **Bid ditolak!** Nominal **${formatRupiah(amountInput)}** harus lebih tinggi dari Group A (Min: ${formatRupiah(minReqA)}) DAN Group B (Min: ${formatRupiah(minReqB)}).`);
    }
  }

  const pendingId = `pending_${Date.now()}_${interaction.member?.user?.id || interaction.user?.id}`;
  const pendingData = {
    groupTarget,
    nameA,
    nameB,
    amountInput,
    userId: interaction.member?.user?.id || interaction.user?.id,
    username: interaction.member?.user?.username || interaction.user?.username
  };

  if (env?.KV_STORE) {
    await env.KV_STORE.put(pendingId, JSON.stringify(pendingData), { expirationTtl: 300 });
  }

  const confirmText = groupTarget === "BOTH"
    ? `⚠️ **KONFIRMASI BIDDING**\n\n` +
      `• **Group A:** "${nameA}"\n` +
      `• **Group B:** "${nameB}"\n` +
      `• **Nominal Bid:** **${formatRupiah(amountInput)}**\n\n` +
      `Apakah kamu yakin ingin mengajukan bid ini?`
    : `⚠️ **KONFIRMASI BIDDING**\n\n` +
      `• **Group:** Group ${groupTarget}\n` +
      `• **Nama Divisi:** "${nameA}"\n` +
      `• **Nominal Bid:** **${formatRupiah(amountInput)}**\n\n` +
      `Apakah kamu yakin ingin mengajukan bid ini?`;

  return makeEphemeralResponse(confirmText, getConfirmButtons(pendingId));
}

/**
 * Button Confirmation Handler
 */
export async function handleConfirmBid(interaction: any, env: any) {
  const customId = interaction.data.custom_id;
  
  if (customId.startsWith("confirm_bid_no_")) {
    return NextResponse.json({
      type: 7,
      data: { content: "❌ Bidding dibatalkan.", components: [] }
    });
  }

  const pendingId = customId.replace("confirm_bid_yes_", "");
  const rawPending = env?.KV_STORE ? await env.KV_STORE.get(pendingId) : null;

  if (!rawPending) {
    return NextResponse.json({
      type: 7,
      data: { content: "❌ Sesi konfirmasi telah kadaluarsa. Silakan lakukan bid ulang.", components: [] }
    });
  }

  const pending = typeof rawPending === 'string' ? JSON.parse(rawPending) : rawPending;

  const rawData = env?.KV_STORE ? await env.KV_STORE.get(KV_BID_KEY) : null;
  let data: BidStore = typeof rawData === 'string' ? JSON.parse(rawData) : (rawData || { groupA: null, groupB: null, logs: [] });

  const timestamp = getWibTimestamp();

  if (pending.groupTarget === "A" || pending.groupTarget === "BOTH") {
    data.groupA = {
      amount: pending.amountInput,
      name: pending.nameA,
      userId: pending.userId,
      username: pending.username,
      timestamp
    };
    data.logs.unshift({
      group: "A",
      amount: pending.amountInput,
      name: pending.nameA,
      username: pending.username,
      timestamp
    });
  }

  if (pending.groupTarget === "B" || pending.groupTarget === "BOTH") {
    data.groupB = {
      amount: pending.amountInput,
      name: pending.groupTarget === "BOTH" ? pending.nameB : pending.nameA,
      userId: pending.userId,
      username: pending.username,
      timestamp
    };
    data.logs.unshift({
      group: "B",
      amount: pending.amountInput,
      name: pending.groupTarget === "BOTH" ? pending.nameB : pending.nameA,
      username: pending.username,
      timestamp
    });
  }

  if (env?.KV_STORE) {
    await env.KV_STORE.put(KV_BID_KEY, JSON.stringify(data));
    await env.KV_STORE.delete(pendingId);
  }

  await syncBidMessages(env);

  return NextResponse.json({
    type: 7,
    data: {
      content: `✅ **Berhasil!** Bid kamu sebesar **${formatRupiah(pending.amountInput)}** telah resmi tercatat! Pesan di channel telah diperbarui.`,
      components: []
    }
  });
}
