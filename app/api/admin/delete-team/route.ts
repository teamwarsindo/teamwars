import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { v2 as cloudinary } from 'cloudinary';

// ⚙️ Konfigurasi Cloudinary Admin API
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🛠️ Helper: Ekstrak "Public ID" Cloudinary dari URL Web
function getCloudinaryPublicId(url: string, type: 'logo' | 'bukti') {
  try {
    if (!url) return null;
    const urlObj = new URL(url);
    const filenameWithExt = urlObj.pathname.split('/').pop();
    if (!filenameWithExt) return null;
    
    const filename = filenameWithExt.split('.')[0];
    const folder = type === 'logo' ? 'twi-season-7/logos' : 'twi-season-7/bukti';
    return `${folder}/${filename}`;
  } catch (e) {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { teamSlug } = await req.json();

    // 1. Ambil data tim & map verified user
    const [team, verifiedUsersMap] = await Promise.all([
      kv.hgetall(`teams:${teamSlug}`),
      kv.hgetall('global:verified_users')
    ]);

    if (!team) {
      return NextResponse.json({ error: 'Data tim tidak ditemukan di database.' }, { status: 404 });
    }

    const verifiedMap = (verifiedUsersMap as Record<string, string>) || {};
    const players = typeof team.players === 'string' ? JSON.parse(team.players) : (team.players || []);

    // =========================================================================
    // 1. CLOUDINARY CLEANUP (Hapus Gambar Logo & Bukti Transfer)
    // =========================================================================
    const logoPublicId = getCloudinaryPublicId(team.logoTim as string, 'logo');
    if (logoPublicId) {
      await cloudinary.uploader.destroy(logoPublicId).catch((err) => {
        console.error(`Gagal hapus logo ${logoPublicId} di Cloudinary:`, err);
      });
    }

    const buktiPublicId = getCloudinaryPublicId(team.buktiTransfer as string, 'bukti');
    if (buktiPublicId) {
      await cloudinary.uploader.destroy(buktiPublicId).catch((err) => {
        console.error(`Gagal hapus bukti transfer ${buktiPublicId} di Cloudinary:`, err);
      });
    }

    // =========================================================================
    // 2. DISCORD FULL CLEANUP (TERMASUK COPOT ROLE KETUA, WAKIL & DUELIST)
    // =========================================================================
    
    for (const p of players) {
      const originalDiscord = p.discord ? p.discord.replace(/^@/, '').trim() : '';
      const searchKeyDiscord = originalDiscord.toLowerCase();
      const discordId = verifiedMap[originalDiscord] || verifiedMap[searchKeyDiscord];
      const roleJabatan = (p.role || '').toLowerCase();

      if (discordId) {
        // A. Reset Nickname Pemain (Copot IGN)
        try {
          await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${discordId}`, 'PATCH', { nick: null });
        } catch (err) {
          console.error(`Gagal reset nickname user ${originalDiscord}:`, err);
        }

        // B. Copot Role Jabatan (Ketua / Wakil) di Discord
        if (roleJabatan === 'ketua' && DISCORD_CONFIG.ROLE_KETUA) {
          await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${discordId}/roles/${DISCORD_CONFIG.ROLE_KETUA}`, 'DELETE').catch(() => {});
        } else if ((roleJabatan === 'wakil' || roleJabatan === 'wakil ketua') && DISCORD_CONFIG.ROLE_WAKIL) {
          await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${discordId}/roles/${DISCORD_CONFIG.ROLE_WAKIL}`, 'DELETE').catch(() => {});
        }

        // C. Copot Role Duelist (Karena timnya sudah bubar/diskualifikasi)
        if (DISCORD_CONFIG.ROLE_DUELIST) {
          await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${discordId}/roles/${DISCORD_CONFIG.ROLE_DUELIST}`, 'DELETE').catch(() => {});
        }
      }
    }

    // D. Hapus Role Tim
    const roleId = team.discordRoleId || team.roleId;
    if (roleId) {
      await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/roles/${roleId}`, 'DELETE').catch(() => {});
    }

    // E. Hapus TEXT Channel & VOICE Channel
    const channelId = team.discordChannelId || team.channelId;
    if (channelId) {
      await discordAPI(`/channels/${channelId}`, 'DELETE').catch(() => {});
    }
    const voiceChannelId = team.discordVoiceChannelId;
    if (voiceChannelId) {
      await discordAPI(`/channels/${voiceChannelId}`, 'DELETE').catch(() => {});
    }

    // F. Hapus Pesan Embed di Channel #roster, #bukti-transfer, dan #logo
    if (team.adminMsgId) {
      await discordAPI(`/channels/${DISCORD_CONFIG.CH_ROSTER}/messages/${team.adminMsgId}`, 'DELETE').catch(() => {});
    }
    if (team.financeMsgId) {
      await discordAPI(`/channels/${DISCORD_CONFIG.CH_BUKTI}/messages/${team.financeMsgId}`, 'DELETE').catch(() => {});
    }
    if (team.creativeMsgId) {
      await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOGO}/messages/${team.creativeMsgId}`, 'DELETE').catch(() => {});
    }

    // =========================================================================
    // 3. DATABASE SAPU BERSIH (EXACT MATCH)
    // =========================================================================
    for (const p of players) {
      const originalDiscord = p.discord ? p.discord.replace(/^@/, '').trim() : '';
      const searchKeyDiscord = originalDiscord.toLowerCase();
      const originalIgn = p.ign ? p.ign.trim() : '';
      const idDuelLinks = p.idDuelLinks ? p.idDuelLinks.toString().trim() : '';

      if (originalDiscord) {
        await kv.srem('global:discord', originalDiscord);
        await kv.del(`player:${searchKeyDiscord}`);
        
        await kv.hdel('global:verified_users', originalDiscord);
        await kv.hdel('global:verified_users', searchKeyDiscord);

        const discordId = verifiedMap[originalDiscord] || verifiedMap[searchKeyDiscord];
        if (discordId) {
          await kv.srem('global:discord_ids', discordId);
        }
      }
      if (originalIgn) {
        await kv.srem('global:ign', originalIgn);
      }
      if (idDuelLinks) {
        await kv.srem('global:duellinks', idDuelLinks);
        await kv.srem('global:duelId', idDuelLinks);
      }
    }

    if (team.editToken) {
      await kv.del(`token:map:${team.editToken}`);
    }
    await kv.del(`teams:${teamSlug}`);
    await kv.srem('global:teams', teamSlug);

    return NextResponse.json({ success: true, message: 'Tim beserta seluruh channel, role tim/ketua/wakil/duelist, roster, logo, bukti transfer, dan jejak datanya berhasil dibasmi!' });
  } catch (error: any) {
    console.error('Error delete team:', error);
    return NextResponse.json({ error: 'Gagal menghapus tim: ' + error.message }, { status: 500 });
  }
      }
      
