import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/config';
import { KV_BID_KEY, BidStore, syncBidMessages } from '@/lib/discord/bidding';
import { formatRupiah } from '@/lib/discord/messages/bidding';

function makeEphemeralResponse(content: string) {
  return NextResponse.json({
    type: 4,
    data: { content, flags: 64 }
  });
}

function getFullWibTimestamp(): string {
  const date = new Date();
  const dateStr = date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${dateStr} ${timeStr} WIB`;
}

export async function handleCancelBid(interaction: any) {
  // 1. Cek Hak Akses Admin (Mendukung ROLE_ADMIN, ROLE_REFEREE, atau Administrator Permission)
  const member = interaction.member;
  const userRoles: string[] = member?.roles || [];
  
  // Menggunakan Role Admin yang ada di DISCORD_CONFIG
  const ADMIN_ROLES = [DISCORD_CONFIG.ROLE_ADMIN, DISCORD_CONFIG.ROLE_REFEREE];
  const isAdmin = userRoles.some(roleId => ADMIN_ROLES.includes(roleId)) || member?.permissions === "8";

  if (!isAdmin) {
    return makeEphemeralResponse("❌ **Akses Ditolak!** Hanya Panitia/Admin yang dapat membatalkan bid.");
  }
 
  // 2. Ekstrak Parameter Command
  const options = interaction.data.options || [];
  const groupTargetOption = options.find((opt: any) => opt.name === 'group');
  const reasonOption = options.find((opt: any) => opt.name === 'alasan');

  const groupTarget = groupTargetOption?.value; // "A" atau "B"
  const reason = reasonOption?.value || "Pelanggaran ketentuan / Nominal tidak wajar";

  if (!groupTarget || (groupTarget !== "A" && groupTarget !== "B")) {
    return makeEphemeralResponse("❌ **Pilih group yang valid (Group A atau Group B).**");
  }

  // 3. Load Data Bidding dari KV
  const data: BidStore = (await kv.get<BidStore>(KV_BID_KEY)) || { groupA: null, groupB: null, logs: [] };

  const targetBid = groupTarget === "A" ? data.groupA : data.groupB;

  if (!targetBid) {
    return makeEphemeralResponse(`ℹ️ **Group ${groupTarget} saat ini belum memiliki bid untuk dibatalkan.**`);
  }

  const cancelledBidAmount = targetBid.amount;
  const cancelledBidName = targetBid.name;
  const cancelledUser = targetBid.displayName || targetBid.username;

  // 4. Rollback ke Bid Sah Terakhir (Filter log yang bukan milik bid yang dibatalkan)
  const remainingLogsForGroup = data.logs.filter(
    log => log.group === groupTarget && log.amount !== cancelledBidAmount && !log.displayName.includes('[ADMIN]')
  );

  const previousValidBid = remainingLogsForGroup.length > 0 ? remainingLogsForGroup[0] : null;

  if (groupTarget === "A") {
    data.groupA = previousValidBid ? {
      amount: previousValidBid.amount,
      name: previousValidBid.name,
      userId: "",
      username: previousValidBid.username,
      displayName: previousValidBid.displayName,
      timestamp: previousValidBid.timestamp
    } : null;
  } else {
    data.groupB = previousValidBid ? {
      amount: previousValidBid.amount,
      name: previousValidBid.name,
      userId: "",
      username: previousValidBid.username,
      displayName: previousValidBid.displayName,
      timestamp: previousValidBid.timestamp
    } : null;
  }

  // 5. Catat Log Pembatalan oleh Admin
  const adminUser = member?.user || interaction.user;
  const adminName = member?.nick || adminUser.global_name || adminUser.username;
  const timestamp = getFullWibTimestamp();

  data.logs.unshift({
    group: groupTarget,
    amount: cancelledBidAmount,
    name: `🚫 DIBATALKAN ADMIN (${reason})`,
    username: adminUser.username,
    displayName: `[ADMIN] ${adminName}`,
    timestamp
  });

  // 6. Simpan kembali ke Redis KV
  await kv.set(KV_BID_KEY, data);

  // 7. Update Pesan Embed di Discord Channel
  await syncBidMessages();

  const successMsg = `🚨 **BID DIBATALKAN OLEH ADMIN** 🚨\n\n` +
    `• **Group:** Group ${groupTarget}\n` +
    `• **Bid Dibatalkan:** ${formatRupiah(cancelledBidAmount)} (*"${cancelledBidName}"*) oleh **${cancelledUser}**\n` +
    `• **Alasan:** ${reason}\n` +
    `• **Status Saat Ini:** ${previousValidBid ? `Kembali ke bid ${formatRupiah(previousValidBid.amount)} (*"${previousValidBid.name}"*)` : 'Kembali ke Base Price (Belum ada bid)'}`;

  return makeEphemeralResponse(successMsg);
}
