import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { revalidatePath } from "next/cache";

const webhookAvatar = "https://teamwars.web.id/logo-dc.png";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    
    // 1. TANGKAP SEMUA DATA (Bukan cuma token & players)
    const { token, players, namaTim, warna, email } = payload;

    if (!token) return NextResponse.json({ error: "Akses ditolak. Token hilang." }, { status: 400 });

    // 2. Cari slug dari token
    const teamSlug = await kv.get(`token:map:${token}`);
    if (!teamSlug) return NextResponse.json({ error: "Sesi edit tidak valid/kadaluarsa." }, { status: 403 });

    // 3. Tarik data roster LAMA dari database
    const oldTeamData: any = await kv.hgetall(`teams:${teamSlug}`);
    if (!oldTeamData) return NextResponse.json({ error: "Tim tidak ditemukan." }, { status: 404 });
    
    const oldPlayers = typeof oldTeamData.players === "string" ? JSON.parse(oldTeamData.players) : oldTeamData.players;

    // ==========================================================
    // 4. LOGIKA ARRAY DIFFING (Penanganan Duplikat)
    // ==========================================================
    const oldIgns = oldPlayers.map((p: any) => p.ign.toLowerCase());
    const oldDiscords = oldPlayers.map((p: any) => p.discord.toLowerCase());
    const oldDuelIds = oldPlayers.map((p: any) => p.idDuelLinks || p.duelId);

    const newIgns = players.map((p: any) => p.ign.toLowerCase());
    const newDiscords = players.map((p: any) => p.discord.toLowerCase());
    const newDuelIds = players.map((p: any) => p.idDuelLinks || p.duelId);

    const ignsToRemove = oldIgns.filter((ign: string) => !newIgns.includes(ign));
    const discordsToRemove = oldDiscords.filter((d: string) => !newDiscords.includes(d));
    const duelIdsToRemove = oldDuelIds.filter((id: string) => !newDuelIds.includes(id));

    const ignsToAdd = newIgns.filter((ign: string) => !oldIgns.includes(ign));
    const discordsToAdd = newDiscords.filter((d: string) => !oldDiscords.includes(d));
    const duelIdsToAdd = newDuelIds.filter((id: string) => !oldDuelIds.includes(id));

    if (ignsToRemove.length > 0) await kv.srem("global:ign", ...ignsToRemove);
    if (discordsToRemove.length > 0) await kv.srem("global:discord", ...discordsToRemove);
    if (duelIdsToRemove.length > 0) await kv.srem("global:duelId", ...duelIdsToRemove);

    if (ignsToAdd.length > 0) await kv.sadd("global:ign", ...ignsToAdd);
    if (discordsToAdd.length > 0) await kv.sadd("global:discord", ...discordsToAdd);
    if (duelIdsToAdd.length > 0) await kv.sadd("global:duelId", ...duelIdsToAdd);

    // ==========================================================
    // 5. SIMPAN HASIL AKHIR KE DATABASE UTAMA
    // ==========================================================
    // 🔥 FIX: Ambil data baru jika ada, atau gunakan data lama
    const updatedName = namaTim ? namaTim.trim() : oldTeamData.namaTim;
    const updatedColor = warna ? warna.trim() : oldTeamData.warna;
    const updatedEmail = email ? email.trim() : oldTeamData.email;

    await kv.hset(`teams:${teamSlug}`, {
      namaTim: updatedName,
      warna: updatedColor,
      email: updatedEmail,
      players: JSON.stringify(players), // Wajib stringify biar formatnya konsisten sama route submit
      updatedAt: new Date().toISOString()
    });

    // ==========================================================
    // 6. AUTO-PATCH DISCORD (ROLE, ADMIN, CREATIVE, PUBLIC)
    // ==========================================================
    const parsedColor = parseInt(updatedColor.replace('#', ''), 16) || 3447003;
    
    const isNameChanged = oldTeamData.namaTim !== updatedName;
    const isColorChanged = oldTeamData.warna !== updatedColor;

    // A. UPDATE ROLE DISCORD (Ganti Nama Role & Warna Role)
    if ((isNameChanged || isColorChanged) && oldTeamData.discordRoleId) {
      try {
        await fetch(`https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/roles/${oldTeamData.discordRoleId}`, {
          method: 'PATCH',
          headers: { 
            'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            name: updatedName, // Nama role ikut diganti kalau ada revisi typo
            color: parsedColor
          })
        });
      } catch (err) {
        console.error("Gagal update Role Discord:", err);
      }
    }

    // B. PATCH ADMIN WEBHOOK (Selalu update untuk roster)
    const ketua = players.find((p: any) => p.role === "Ketua") || players[0];
    const wakil = players.find((p: any) => p.role === "Wakil Ketua") || { ign: "-" };
    const playerListString = players.map((p: any) => `${p.ign} (${p.idDuelLinks || p.duelId})`).join('\n');

    // Pastikan fungsi helper format tanggal ini ada di atas sebelum fetch Discord
    const formatDate = (dateString: string) => {
      const d = new Date(dateString);
      const tgl = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
      const waktu = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(':', '.');
      return `${tgl} pukul ${waktu} WIB`;
    };

    if (oldTeamData.adminMsgId && process.env.DISCORD_WEBHOOK_ADMIN) {
      await fetch(`${process.env.DISCORD_WEBHOOK_ADMIN}/messages/${oldTeamData.adminMsgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: updatedName,
            color: parsedColor,
            thumbnail: { url: oldTeamData.logoTim },
            fields: [
              { name: "Ketua", value: ketua?.ign || "-", inline: true },
              { name: "Wakil", value: wakil?.ign || "-", inline: true },
              { name: "Players", value: playerListString, inline: false }
            ],
            footer: {
              text: `Tercatat di sistem pada ${formatDate(oldTeamData.createdAt)}\nDiperbarui pada ${formatDate(new Date().toISOString())}`
            }
        })
      }).catch(err => console.error("Gagal patch Admin:", err));
    }

    // C. PATCH CREATIVE WEBHOOK (Hanya jalan kalau Nama atau Warna berubah!)
    if ((isNameChanged || isColorChanged) && oldTeamData.creativeMsgId && process.env.DISCORD_WEBHOOK_CREATIVE) {
      let maskedLogoUrl = oldTeamData.logoTim;
      if (maskedLogoUrl.includes('/upload/')) {
        const splitUrl = maskedLogoUrl.split('/upload/');
        if (splitUrl.length > 1) {
          maskedLogoUrl = `https://teamwars.web.id/logo/${splitUrl[1]}/download`;
        }
      }

      await fetch(`${process.env.DISCORD_WEBHOOK_CREATIVE}/messages/${oldTeamData.creativeMsgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `<@&1171096454685794324> 🎨 Aset Tim Update: **${updatedName}**!`, 
          embeds: [{
            title: `Aset Visual: ${updatedName}`,
            color: parsedColor,
            description: `**[⬇️ KLIK DISINI UNTUK DOWNLOAD LOGO MENTAH](${maskedLogoUrl})**`,
            image: { url: oldTeamData.logoTim },
            fields: [{ name: "Kode Warna (Hex)", value: `\`${updatedColor}\``, inline: true }]
          }]
        })
      }).catch(err => console.error("Gagal patch Creative:", err));
    }

    // D. PENGUMUMAN KE CHANNEL PUBLIC (Hanya jalan kalau Nama beda atau Jumlah Player berubah)
    const oldNameLower = oldTeamData.namaTim.toLowerCase();
    const newNameLower = updatedName.toLowerCase();
    const isNamePublicChanged = oldNameLower !== newNameLower;
    
    const oldPlayerCount = oldPlayers.length;
    const newPlayerCount = players.length;
    const countDiff = newPlayerCount - oldPlayerCount;
    const isCountChanged = countDiff !== 0;

    if ((isNamePublicChanged || isCountChanged) && process.env.DISCORD_WEBHOOK_PUBLIC) {
      let publicMsg = "";
      
      if (isNamePublicChanged) {
         publicMsg = `📢 Tim **${oldTeamData.namaTim}** ganti nama jadi **${updatedName}**`;
      } else {
         publicMsg = `📢 Tim **${updatedName}**`;
      }

      if (isCountChanged) {
         const actionText = countDiff > 0 ? `menambah ${countDiff}` : `mengurangi ${Math.abs(countDiff)}`;
         publicMsg += ` ${isNamePublicChanged ? "dan" : ""} ${actionText} pemain (Total: ${newPlayerCount} Pemain).`;
      } else {
         publicMsg += ".";
      }

      await fetch(process.env.DISCORD_WEBHOOK_PUBLIC, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: publicMsg,
          username: "Registration TWI Season 7", // 👈 Nama bot lu
          avatar_url: webhookAvatar // 👈 Masukin link URL gambar logo bot lu di sini
        })
      }).catch(err => console.error("Gagal kirim pengumuman Public:", err));
    }
    // ==========================================================
    // 7. CACHE BUSTER
    // ==========================================================
    revalidatePath("/admin-dashboard"); 

    return NextResponse.json({ success: true, message: "Roster dan Webhook berhasil diperbarui!" }); 
    
  } catch (error: any) {
    console.error("Update Team Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal saat update." }, { status: 500 });
  }
}
