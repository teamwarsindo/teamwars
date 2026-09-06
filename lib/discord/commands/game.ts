import { waitUntil } from '@vercel/functions';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';
import { resolveMatchFromChannel, getOptionMap, GameContext } from './game/types';
import { handleGameAdd } from './game/add';
import { handleGameEdit } from './game/edit';
import { handleGameDel } from './game/del';

function isAdminOrChief(interaction: any): boolean {
  try {
    const member = interaction?.member;
    const roles: string[] = member?.roles || [];
    const permissions = BigInt(member?.permissions || '0');
    return (
      (permissions & BigInt(0x8)) === BigInt(0x8) ||
      (!!DISCORD_CONFIG.ROLE_ADMIN && roles.includes(DISCORD_CONFIG.ROLE_ADMIN)) ||
      (!!DISCORD_CONFIG.ROLE_CHIEF && roles.includes(DISCORD_CONFIG.ROLE_CHIEF))
    );
  } catch {
    return false;
  }
}

function isStaff(interaction: any): boolean {
  try {
    const member = interaction?.member;
    const roles: string[] = member?.roles || [];
    return (
      isAdminOrChief(interaction) ||
      (!!DISCORD_CONFIG.ROLE_REFEREE && roles.includes(DISCORD_CONFIG.ROLE_REFEREE))
    );
  } catch {
    return false;
  }
}

export async function handleGameCommand(interaction: any) {
  // 1. Validasi Hak Akses Cepat (<1ms)
  if (!isStaff(interaction)) {
    return {
      type: 4,
      data: {
        content: '❌ Akses Ditolak! Hanya **Wasit Bertugas** dan **Admin** yang dapat menggunakan command ini.',
        flags: 64,
      },
    };
  }

  const channelId = interaction.channel_id;
  const token = interaction.token;
  const appId = interaction.application_id || process.env.DISCORD_CLIENT_ID;

  // 2. Cek Match Terkait Channel
  const match = await resolveMatchFromChannel(channelId);
  if (!match) {
    return {
      type: 4,
      data: {
        content: '❌ Command ini hanya dapat dijalankan di dalam **Channel Match** yang aktif!',
        flags: 64,
      },
    };
  }

  // 3. ATOMIC LOCK (Cegah Tabrakan Input Admin & Wasit)
  // Kunci per match ID selama 5 detik
  const lockKey = `lock:match:${match.id}`;
  const acquiredLock = await kv.set(lockKey, 'LOCKED', { nx: true, ex: 5 });

  if (!acquiredLock) {
    return {
      type: 4,
      data: {
        content: '⚠️ **Pertandingan sedang diproses oleh Wasit/Admin lain!** Mohon tunggu beberapa detik sebelum menginput command berikutnya.',
        flags: 64,
      },
    };
  }

  // 4. Background Task Eksekusi Penuh dengan waitUntil
  waitUntil(
    (async () => {
      try {
        const kickoffTime = match.matchDate ? new Date(match.matchDate).getTime() : 0;
        const isBeforeKickoff = kickoffTime > 0 && Date.now() < kickoffTime;
        const userIsAdmin = isAdminOrChief(interaction);

        // Blocker Kickoff untuk Wasit
        if (isBeforeKickoff && !userIsAdmin) {
          const matchHourStr =
            new Date(match.matchDate)
              .toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Jakarta',
              })
              .replace(':', '.') + ' WIB';

          if (appId && token) {
            await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
              content: `⚠️ Pertandingan baru dimulai pukul **${matchHourStr}**. Command \`/game\` belum dapat digunakan sebelum kick-off.`,
            });
          }
          return;
        }

        const reportData = (await kv.hget<any>('twi:match_reports', match.id)) || {};
        if (!reportData.teamA || !reportData.teamB) {
          if (appId && token) {
            await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
              content: '❌ Dokumen match report belum ditemukan untuk pertandingan ini.',
            });
          }
          return;
        }

        const rawOptions = interaction.data?.options || [];
        const subCommandObj = rawOptions[0]?.type === 1 ? rawOptions[0] : null;
        const subCommandName = subCommandObj?.name || 'add';
        const subOptions = subCommandObj ? subCommandObj.options || [] : rawOptions;
        const optMap = getOptionMap(subOptions);

        const ctx: GameContext = {
          interaction,
          channelId,
          appId,
          token,
          match,
          reportData,
          optMap,
          isBeforeKickoff,
          userIsAdmin,
        };

        // Routing Subcommand
        if (subCommandName === 'add') {
          await handleGameAdd(ctx);
        } else if (subCommandName === 'edit') {
          await handleGameEdit(ctx);
        } else if (subCommandName === 'del') {
          await handleGameDel(ctx);
        } else if (appId && token) {
          await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
            content: `❌ Subcommand '${subCommandName}' tidak dikenali.`,
          });
        }
      } catch (error: any) {
        console.error('Error in handleGameCommand worker:', error);
        if (appId && token) {
          await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
            content: `❌ Terjadi kesalahan: ${error.message || 'Internal Error'}`,
          }).catch(() => null);
        }
      } finally {
        // Lepas lock setelah operasi KV dan rendering selesai
        await kv.del(lockKey).catch(() => {});
      }
    })()
  );

  // 5. Response Instan Type 5
  return {
    type: 5,
    data: { flags: 64 },
  };
}
