import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import {
  executeTransferOut,
  executeTransferAdd,
  executeTransferEditDl,
  executeTransferSetLeader,
  parsePlayers,
  parseTransferSmartText,
  formatDuelId,
  PlayerItem,
} from '@/lib/discord/services/transfer-service';

function isAuth(interaction: any): boolean {
  const member = interaction.member;
  const roles: string[] = member?.roles || [];
  const isAdmin = (BigInt(member?.permissions || '0') & BigInt(0x8)) === BigInt(0x8);
  return (
    isAdmin ||
    (!!DISCORD_CONFIG.ROLE_ADMIN && roles.includes(DISCORD_CONFIG.ROLE_ADMIN)) ||
    (!!DISCORD_CONFIG.ROLE_CHIEF && roles.includes(DISCORD_CONFIG.ROLE_CHIEF))
  );
}

function getSubcommandData(interaction: any) {
  const options = interaction.data?.options || [];
  const subcommandObj = options.find((o: any) => o.type === 1);
  if (!subcommandObj) return { subcommand: null, opts: [] };
  return {
    subcommand: subcommandObj.name,
    opts: subcommandObj.options || [],
  };
}

export async function handleTransferAutocomplete(interaction: any) {
  const { opts } = getSubcommandData(interaction);
  const focusedOption = opts.find((o: any) => o.focused);
  if (!focusedOption) return { type: 8, data: { choices: [] } };

  const userId = interaction.member?.user?.id;
  const userUsername = interaction.member?.user?.username;

  if (focusedOption.name === 'team') {
    const allTeamSlugs = await kv.smembers('global:teams');
    const searchValue = (focusedOption.value || '').toLowerCase();
    const choices = [];

    for (const slug of allTeamSlugs) {
      const teamData = await kv.hgetall<any>(`teams:${slug}`);
      if (teamData && teamData.namaTim) {
        if (teamData.namaTim.toLowerCase().includes(searchValue) || slug.includes(searchValue)) {
          choices.push({ name: teamData.namaTim, value: slug });
        }
      }
      if (choices.length >= 25) break;
    }
    return { type: 8, data: { choices } };
  }

  if (focusedOption.name === 'user') {
    const selectedTeamOpt = opts.find((o: any) => o.name === 'team')?.value;
    let targetTeamSlug = selectedTeamOpt;

    if (!targetTeamSlug) {
      targetTeamSlug = await kv.hget<string>('global:discord_ids', userId);
      if (!targetTeamSlug && userUsername) {
        targetTeamSlug = await kv.hget<string>('global:discord', userUsername.toLowerCase());
      }
    }

    if (!targetTeamSlug) return { type: 8, data: { choices: [] } };

    const teamData = await kv.hgetall<any>(`teams:${targetTeamSlug}`);
    if (!teamData || !teamData.players) return { type: 8, data: { choices: [] } };

    const players: PlayerItem[] = parsePlayers(teamData.players);
    const searchValue = (focusedOption.value || '').toLowerCase();

    const choices = players
      .filter((p) => p.ign.toLowerCase().includes(searchValue) || p.discord.toLowerCase().includes(searchValue))
      .slice(0, 25)
      .map((p) => ({
        name: `${p.ign} (@${p.discord}) - ${p.role}`,
        value: p.discord,
      }));

    return { type: 8, data: { choices } };
  }

  return { type: 8, data: { choices: [] } };
}

export async function handleTransferCommand(interaction: any) {
  const { subcommand, opts } = getSubcommandData(interaction);
  if (!subcommand) return { type: 4, data: { content: '❌ Subcommand tidak valid!', flags: 64 } };

  const userId = interaction.member?.user?.id;
  const userUsername = interaction.member?.user?.username;
  const isAdmin = isAuth(interaction);

  const inputTeamSlug = opts.find((o: any) => o.name === 'team')?.value;

  let teamSlug = inputTeamSlug;
  if (!teamSlug) {
    teamSlug = await kv.hget<string>('global:discord_ids', userId);
    if (!teamSlug && userUsername) {
      teamSlug = await kv.hget<string>('global:discord', userUsername.toLowerCase());
    }
  }

  if (isAdmin && !inputTeamSlug && !teamSlug) {
    return {
      type: 4,
      data: { content: '❌ **Akses Admin:** Kamu wajib memilih opsi `team` saat menggunakan command transfer!', flags: 64 },
    };
  }

  if (!teamSlug) {
    return {
      type: 4,
      data: { content: '❌ **Akses Ditolak!** Kamu harus menjadi Ketua/Wakil/Admin tim untuk menggunakan command ini.', flags: 64 },
    };
  }

  try {
    // -------------------------------------------------------------
    // 1. SUBCOMMAND: OUT
    // -------------------------------------------------------------
    if (subcommand === 'out') {
      const targetUser = opts.find((o: any) => o.name === 'user')?.value;
      if (!targetUser) return { type: 4, data: { content: '❌ Option `user` wajib diisi!', flags: 64 } };

      const result = await executeTransferOut(teamSlug, targetUser);
      return {
        type: 4,
        data: { content: `✅ **Berhasil!** Pemain **${result.removedIgn}** telah dikeluarkan dari tim **${result.teamName}**.`, flags: 64 },
      };
    }

    // -------------------------------------------------------------
    // 2. SUBCOMMAND: ADD
    // -------------------------------------------------------------
    if (subcommand === 'add') {
      const targetDiscordId = opts.find((o: any) => o.name === 'user')?.value;
      const ign = opts.find((o: any) => o.name === 'ign')?.value;
      const rawIdDl = opts.find((o: any) => o.name === 'id_dl')?.value;

      if (!targetDiscordId || !ign || !rawIdDl) {
        return { type: 4, data: { content: '❌ Option `user`, `ign`, dan `id_dl` wajib diisi!', flags: 64 } };
      }

      const resolvedUsers = interaction.data?.resolved?.users || {};
      const targetUserData = resolvedUsers[targetDiscordId] || {};
      const targetUsername = targetUserData.username || targetDiscordId;

      const result = await executeTransferAdd({
        teamSlug,
        targetDiscordId,
        targetUsername,
        ign,
        rawIdDl,
      });

      return {
        type: 4,
        data: {
          content: `✅ **Berhasil!** Pemain **${result.addedIgn}** berhasil dimasukkan ke dalam tim **${result.teamName}**.\nℹ️ Sisa kuota transfer tim saat ini: **${
            2 - result.currentQuota
          }**`,
          flags: 64,
        },
      };
    }

    // -------------------------------------------------------------
    // 3. SUBCOMMAND: EDIT
    // -------------------------------------------------------------
    if (subcommand === 'edit') {
      const targetUser = opts.find((o: any) => o.name === 'user')?.value;
      const newIdDl = opts.find((o: any) => o.name === 'new_id_dl')?.value;
      const position = opts.find((o: any) => o.name === 'position')?.value as 'Ketua' | 'Wakil Ketua' | undefined;

      if (!targetUser) return { type: 4, data: { content: '❌ Option `user` wajib diisi!', flags: 64 } };

      if (!newIdDl && !position) {
        return { type: 4, data: { content: '❌ Wajib mengisikan salah satu opsi: `new_id_dl` atau `position`!', flags: 64 } };
      }

      const results = [];

      if (newIdDl) {
        const resDl = await executeTransferEditDl(teamSlug, targetUser, newIdDl);
        results.push(`ID Duel Links **${resDl.ign}** diperbarui menjadi \`${resDl.newDl}\` (Sisa kuota transfer: **${2 - resDl.currentQuota}**)`);
      }

      if (position) {
        const resLeader = await executeTransferSetLeader(teamSlug, targetUser, position, isAdmin);
        results.push(`**${resLeader.ign}** sekarang ditugaskan sebagai **${resLeader.newRole}** tim **${resLeader.teamName}**`);
      }

      return {
        type: 4,
        data: { content: `✅ **Berhasil!**\n• ${results.join('\n• ')}`, flags: 64 },
      };
    }

    // -------------------------------------------------------------
    // 4. SUBCOMMAND: PARSE (RINGKAS CUSTOM_ID < 100 CHARS)
    // -------------------------------------------------------------
    if (subcommand === 'parse') {
      if (!isAdmin) {
        return { type: 4, data: { content: '❌ Fitur Parse Request khusus untuk **Admin**!', flags: 64 } };
      }

      const rawText = opts.find((o: any) => o.name === 'text')?.value || '';
      const targetDiscordId = opts.find((o: any) => o.name === 'user')?.value;

      if (!rawText || !targetDiscordId) {
        return { type: 4, data: { content: '❌ Option `text` dan `user` wajib diisi!', flags: 64 } };
      }

      const parsed = parseTransferSmartText(rawText);

      const resolvedUsers = interaction.data?.resolved?.users || {};
      const targetUserData = resolvedUsers[targetDiscordId] || {};
      const targetUsername = targetUserData.username || targetDiscordId;

      // SIMPAN DATA TEMPORARY KE KV AGAR CUSTOM_ID RINGKAS & TIDAK MELEBIHI 100 KARAKTER
      const sessionKey = `parse_session:${interaction.id}`;
      await kv.set(
        sessionKey,
        {
          teamSlug,
          targetDiscordId,
          targetUsername,
          ign: parsed.ign || '',
          idDl: parsed.idDl || '',
          action: parsed.action,
        },
        { ex: 600 } // Expire dalam 10 menit
      );

      return {
        type: 4,
        data: {
          flags: 64, // Ephemeral Privat
          embeds: [
            {
              title: '🔍 PREVIEW AUTO-PARSE TRANSFER REQUEST',
              description: 'Periksa data di bawah ini. Data **BELUM** tersimpan ke database sampai kamu menekan tombol Proses.',
              color: 0x3498db,
              fields: [
                { name: '⚡ Aksi Terdeteksi', value: `**${parsed.action}**`, inline: true },
                { name: '👤 Target User', value: `<@${targetDiscordId}> (\`@${targetUsername}\`)`, inline: true },
                { name: '🛡️ Tim Target', value: `**${teamSlug}**`, inline: true },
                { name: '🎮 IGN Pemain', value: parsed.ign ? `\`${parsed.ign}\`` : '⚠️ *Tidak Ditemukan*', inline: true },
                { name: '🆔 ID Duel Links', value: parsed.idDl ? `\`${formatDuelId(parsed.idDl)}\`` : '⚠️ *Tidak Ditemukan*', inline: true },
                { name: '📝 Teks Pesan Asli', value: `\`\`\`${rawText.slice(0, 180)}\`\`\``, inline: false },
              ],
              footer: { text: 'Klik "Proses" jika sesuai, atau klik tombol "Paksa Ubah" jika deteksi aksi keliru.' },
            },
          ],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 3, // Hijau
                  label: `Proses ${parsed.action}`,
                  custom_id: `btn_parse_EXEC_${parsed.action}_${interaction.id}`,
                  emoji: { name: '✅' },
                },
                {
                  type: 2,
                  style: 4, // Merah
                  label: 'Batal',
                  custom_id: 'btn_parse_CANCEL',
                  emoji: { name: '❌' },
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 2, // Abu-abu
                  label: 'Paksa Ubah ke ADD',
                  custom_id: `btn_parse_EXEC_ADD_${interaction.id}`,
                },
                {
                  type: 2,
                  style: 2,
                  label: 'Paksa Ubah ke OUT',
                  custom_id: `btn_parse_EXEC_OUT_${interaction.id}`,
                },
                {
                  type: 2,
                  style: 2,
                  label: 'Paksa Ubah ke EDIT DL',
                  custom_id: `btn_parse_EXEC_EDIT_${interaction.id}`,
                },
              ],
            },
          ],
        },
      };
    }

    return { type: 4, data: { content: '❌ Action tidak dikenali!', flags: 64 } };
  } catch (error: any) {
    return {
      type: 4,
      data: { content: error.message || '❌ Terjadi kesalahan saat memproses transfer.', flags: 64 },
    };
  }
        }
