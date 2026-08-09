import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG, BID_START_TARGET, BID_CLOSE_TARGET } from '@/lib/config';
import { getBidButtons } from '@/lib/discord/buttons/bidding';
import { buildMainBidEmbed, patchMainBidMessage, formatRupiah } from '@/lib/discord/messages/bidding';
import { buildLogBidPayload, patchLogBidMessage } from '@/lib/discord/messages/log-bidding';

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

// Batas Akhir Bidding: Hari Ini (Minggu, 9 Agustus 2026, 20:00:00 WIB)
const BID_DEADLINE_TIMESTAMP = 1786279200;

export function isBidOpen(): boolean {
  const now = Date.now();
  if (BID_START_TARGET && BID_CLOSE_TARGET) {
    return now >= BID_START_TARGET && now <= BID_CLOSE_TARGET;
  }
  return now < (BID_DEADLINE_TIMESTAMP * 1000);
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

/**
 * 🚀 Inisialisasi awal pengiriman pesan (OTOMATIS RESET DATA LELANG)
 */
export async function initBiddingMessages(overrideStatus?: 'closed' | 'open') {
  const isClosed = overrideStatus ? overrideStatus === 'closed' : !isBidOpen();

  // 🟢 RESET DATA: Selalu mulai dengan data bersih (Group A & B null, logs kosong)
  const initialData: BidStore = { groupA: null, groupB: null, logs: [] };

  const mainEmbed = buildMainBidEmbed(initialData, isClosed);
  const logPayload = buildLogBidPayload(initialData.logs);
  const components = getBidButtons(isClosed);

  const token = process.env.DISCORD_BOT_TOKEN;
  const headers = { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' };

  // Kirim Pesan Utama Lelang
  const resMain = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages`, {
    method: 'POST', headers, body: JSON.stringify({ embeds: [mainEmbed], components })
  });
  const msgMain: any = await resMain.json();

  // Kirim Pesan Log Lelang
  const resLog = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages`, {
    method: 'POST', headers, body: JSON.stringify(logPayload)
  });
  const msgLog: any = await resLog.json();

  // Simpan ID pesan baru & Timpa/Overwrite data lama di KV dengan data bersih
  await kv.set(KV_MSG_MAIN_KEY, msgMain.id);
  await kv.set(KV_MSG_LOG_KEY, msgLog.id);
  await kv.set(KV_BID_KEY, initialData); 
}

/**
 * 🔄 Sync Update Embed (Dipanggil saat ada user Bid agar Embed ter-update)
 */
export async function syncBidMessages(forceClosed?: boolean) {
  const isClosed = typeof forceClosed === 'boolean' ? forceClosed : !isBidOpen();

  let data: BidStore | null = await kv.get<BidStore>(KV_BID_KEY);
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch {}
  }
  const currentData: BidStore = data || { groupA: null, groupB: null, logs: [] };

  const mainMsgId = await kv.get<string>(KV_MSG_MAIN_KEY);
  const logMsgId = await kv.get<string>(KV_MSG_LOG_KEY);

  const token = process.env.DISCORD_BOT_TOKEN;

  await Promise.all([
    mainMsgId ? patchMainBidMessage(mainMsgId, currentData, isClosed, token!) : Promise.resolve(),
    logMsgId ? patchLogBidMessage(logMsgId, currentData.logs || [], token!) : Promise.resolve()
  ]);
}

/**
 * 📜 Handler Tombol Lihat Seluruh Log
 */
export async function handleViewFullLog() {
  let data: BidStore | null = await kv.get<BidStore>(KV_BID_KEY);
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch {}
  }
  const currentData: BidStore = data || { groupA: null, groupB: null, logs: [] };

  if (!currentData.logs || currentData.logs.length === 0) {
    return makeEphemeralResponse("ℹ️ **Belum ada riwayat bidding saat ini.**");
  }

  const fullLogList = currentData.logs.map((log, index) => {
    const displayName = log.displayName || log.username;
    return `**${index + 1}.** \`[${log.timestamp}]\` **${displayName}** bid **${formatRupiah(log.amount)}** ➔ **Group ${log.group}** (*"${log.name}"*)`;
  }).join("\n\n");

  const trimmedList = fullLogList.length > 3900 ? fullLogList.substring(0, 3900) + "\n\n_...dan riwayat lama lainnya._" : fullLogList;

  return NextResponse.json({
    type: 4,
    data: {
      flags: 64, // Ephemeral
      embeds: [
        {
          title: `📜 SELURUH RIWAYAT BIDDING (${currentData.logs.length} Total)`,
          description: trimmedList,
          color: 0x5865F2,
          footer: { text: "Team Wars Indonesia • Full Audit Trail" },
          timestamp: new Date().toISOString()
        }
      ]
    }
  });
}

/**
 * 📝 Pemroses Submisi Form Modal Bidding
 */
export async function processBidSubmission(interaction: any) {
  if (!isBidOpen()) {
    await syncBidMessages(true);
    return makeEphemeralResponse("❌ **Bidding sudah ditutup!** (Batas waktu: Hari Ini, 9 Agustus 2026, 20:00 WIB)");
  }

  const customId = interaction.data.custom_id; 
  const groupTarget = customId.replace("modal_bid_", ""); 
  
  const rows = interaction.data.components || [];
  let nameA = "";
  let amountRaw = "";

  for (const row of rows) {
    for (const comp of (row.components || [])) {
      if (comp.custom_id === "input_division_name") nameA = comp.value?.trim() || "";
      if (comp.custom_id === "input_bid_amount") amountRaw = comp.value?.trim() || "";
    }
  }

  const amountInput = parseInt(amountRaw.replace(/[^0-9]/g, ''), 10);

  if (isNaN(amountInput) || amountInput < 100000) {
    return makeEphemeralResponse("❌ **Bid ditolak!** Minimal nominal bid adalah **Rp 100.000**.");
  }

  if ((amountInput - 100000) % 10000 !== 0) {
    return makeEphemeralResponse("❌ **Bid ditolak!** Nominal bid harus kelipatan **Rp 10.000** (Contoh: 110000, 120000).");
  }

  let dataStore: BidStore | null = await kv.get<BidStore>(KV_BID_KEY);
  if (typeof dataStore === 'string') {
    try { dataStore = JSON.parse(dataStore); } catch {}
  }
  const data: BidStore = dataStore || { groupA: null, groupB: null, logs: [] };

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
  } 

  const member = interaction.member;
  const user = member?.user || interaction.user;
  const displayName = member?.nick || user.global_name || user.username;
  const timestamp = getFullWibTimestamp();

  if (groupTarget === "A") {
    data.groupA = { amount: amountInput, name: nameA, userId: user.id, username: user.username, displayName, timestamp };
  } else if (groupTarget === "B") {
    data.groupB = { amount: amountInput, name: nameA, userId: user.id, username: user.username, displayName, timestamp };
  }

  if (!Array.isArray(data.logs)) data.logs = [];
  data.logs.unshift({ group: groupTarget, amount: amountInput, name: nameA, username: user.username, displayName, timestamp });

  await kv.set(KV_BID_KEY, data);

  // 1. Sync / Update Tampilan Embed Utama di Discord Channel Bidding
  await syncBidMessages();

  // 🟢 2. NOTIFIKASI PING REAL-TIME KE CHANNEL LOG ADMIN (CH_LOG)
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    const adminRoleId = DISCORD_CONFIG.ROLE_ADMIN;
    const logChannelId = DISCORD_CONFIG.CH_LOG;

    if (token && logChannelId) {
      await fetch(`https://discord.com/api/v10/channels/${logChannelId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: `<@&${adminRoleId}> 🚨 **BIDDING BARU MASUK!**`,
          embeds: [
            {
              title: `💸 Penawaran Baru — Group ${groupTarget}`,
              color: 0x57F287, // Warna Hijau Neon
              fields: [
                { name: "👤 Penawar", value: `**${displayName}**`, inline: true },
                { name: "💰 Nominal Bid", value: `**${formatRupiah(amountInput)}**`, inline: true },
                { name: "🏷️ Nama Divisi", value: `*"${nameA}"*`, inline: false },
              ],
              footer: { text: "Team Wars Indonesia • Real-time Admin Alert" },
              timestamp: new Date().toISOString()
            }
          ]
        })
      });
    }
  } catch (err) {
    console.error("Gagal mengirim notifikasi bid ke CH_LOG:", err);
  }

  return makeEphemeralResponse(`✅ **Berhasil!** Bid **${formatRupiah(amountInput)}** untuk **Group ${groupTarget}** (*"${nameA}"*) telah dicatat!`);
    }
