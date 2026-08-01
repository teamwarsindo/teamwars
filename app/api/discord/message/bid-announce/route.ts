import { NextRequest, NextResponse } from 'next/server';
import { DISCORD_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * Helper untuk menguji apakah waktu saat ini di WIB persis Jam 07 Pagi
 */
function is07AMWib(): boolean {
  const now = new Date();
  // Ambil jam dalam zona waktu Asia/Jakarta (0-23)
  const hourWib = parseInt(
    now.toLocaleTimeString('en-US', { timeZone: 'Asia/Jakarta', hour12: false, hour: '2-digit' }),
    10
  );
  return hourWib === 7;
}

/**
 * Helper untuk mengubah Permission Overwrite Channel di Discord API v10
 * Bitwise Permission:
 * - VIEW_CHANNEL = 1024 ("1024")
 * - SEND_MESSAGES = 2048 ("2048")
 */
async function updateChannelPermissions(
  channelId: string,
  roleId: string,
  token: string,
  allowBit: string,
  denyBit: string
) {
  const url = `https://discord.com/api/v10/channels/${channelId}/permissions/${roleId}`;
  
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      allow: allowBit, // Permission View Channel
      deny: denyBit,   // Permission Send Messages (Disertai Deny agar tidak bisa chat)
      type: 0          // 0 = Role
    })
  });

  if (!res.ok) {
    const err = await res.json();
    console.error(`Gagal update permission untuk Role ${roleId}:`, err);
  }
  return res.ok;
}

export async function GET(req: NextRequest) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    const { searchParams } = new URL(req.url);
    const isForce = searchParams.get('force') === 'true'; // Mode Tester Bypass

    // 🔴 1. CEK BATASAN WAKTU (Jika bukan jam 7 pagi WIB & bukan mode force -> ABAIKAN)
    const isScheduledTime = is07AMWib();

    if (!isForce && !isScheduledTime) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'ℹ️ Diabaikan: Eksekusi otomatis hanya berjalan pada jam 07:00 WIB.'
      });
    }

    const newsChannelId = DISCORD_CONFIG.CH_NEWS;
    const logChannelId = DISCORD_CONFIG.CH_LOG;
    const bidChannelId = DISCORD_CONFIG.CH_BID;

    const adminRoleId = DISCORD_CONFIG.ROLE_ADMIN;
    const refereeRoleId = DISCORD_CONFIG.ROLE_REFEREE;
    const verifiedRoleId = DISCORD_CONFIG.ROLE_VERIFIED;

    if (!token || !newsChannelId || !bidChannelId) {
      return NextResponse.json(
        { success: false, error: 'Missing BOT TOKEN or Channel Config' },
        { status: 500 }
      );
    }

    // ==========================================
    // 2. PENENTUAN MODE & PERMISSION
    // ==========================================
    let targetChannelId = newsChannelId;
    let targetTag = "@everyone";
    let modeText = "LIVE MODE (Cron Job - 07:00 WIB)";

    if (isForce) {
      // 🧪 MODE TESTER (?force=true)
      targetChannelId = logChannelId || newsChannelId;
      targetTag = `<@&${adminRoleId}> \`[TESTING MODE]\``;
      modeText = "TESTING MODE (?force=true)";

      // Permission Referee: Can View (1024), Deny Send Messages (2048)
      if (refereeRoleId) {
        await updateChannelPermissions(bidChannelId, refereeRoleId, token, "1024", "2048");
      }
    } else {
      // 🚀 MODE ASLI (Jam 07:00 WIB)
      // Permission Verified: Can View (1024), Deny Send Messages (2048)
      if (verifiedRoleId) {
        await updateChannelPermissions(bidChannelId, verifiedRoleId, token, "1024", "2048");
      }
    }

    // ==========================================
    // 3. ANNOUNCEMENT PAYLOAD
    // ==========================================
    const announcementMessage = {
      content: `${targetTag} 📢 **PEMBUKAAN LELANG PENAMAAN DIVISI TWI 2026!**`,
      embeds: [
        {
          title: "🏆 Kesempatan Menamai Divisi Resmi TWI 2026!",
          description:
            "Halo semuanya! Lelang Penamaan Divisi TWI 2026 resmi dibuka untuk umum. Siapa saja berhak memberikan nama terbaik dan paling keren untuk divisi turnamen kita!",
          color: 0xFEE75C, // Warna Emas
          fields: [
            {
              name: "📌 Cara Melakukan Bidding:",
              value: [
                "1️⃣ Buka channel lelang utama di <#" + bidChannelId + ">.",
                "2️⃣ Klik tombol **`[ Bid Group A ]`** atau **`[ Bid Group B ]`**.",
                "3️⃣ Isi **Nama Divisi Pilihan** dan **Nominal Bid** pada form modal yang muncul.",
                "4️⃣ Klik **Submit** dan nominal bid kamu akan langsung ter-update secara otomatis!"
              ].join("\n"),
              inline: false
            },
            {
              name: "⚙️ Ketentuan Singkat:",
              value: [
                "• **Minimal Bid Awal:** Rp 100.000 (Bid pertama min. Rp 110.000)",
                "• **Kelipatan Bid:** Rp 10.000",
                "• **Batas Waktu Bidding:** 8 Agustus 2026, Pukul 20:00 WIB"
              ].join("\n"),
              inline: false
            }
          ],
          footer: { text: `Team Wars Indonesia • ${modeText}` },
          timestamp: new Date().toISOString()
        }
      ]
    };

    // ==========================================
    // 4. KIRIM PESAN KE DISCORD
    // ==========================================
    const res = await fetch(`https://discord.com/api/v10/channels/${targetChannelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(announcementMessage)
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Gagal kirim pengumuman bidding:", data);
      return NextResponse.json({ success: false, error: data }, { status: res.status });
    }

    return NextResponse.json({
      success: true,
      mode: modeText,
      message: `✅ Pengumuman bidding berhasil dikirim (${modeText})!`,
      messageId: data.id
    });

  } catch (error: any) {
    console.error('Error Single Bid Announce:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
      }
         
