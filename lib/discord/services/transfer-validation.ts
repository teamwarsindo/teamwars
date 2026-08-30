import { kv } from '@vercel/kv';
import { getTeamBySlug, parsePlayers, cleanDuelId, PlayerItem } from './transfer-types';

export async function getConflictingPlayerDetails(
  teamSlug: string,
  matcher: { ign?: string; dl?: string; discordId?: string }
) {
  const teamRes = await getTeamBySlug(teamSlug);
  if (!teamRes) return { teamName: teamSlug, ign: '-', discord: '-', idDuelLinks: '-' };

  const players = parsePlayers(teamRes.data.players);
  const cleanDlMatcher = matcher.dl ? cleanDuelId(matcher.dl) : '';

  const found = players.find((p) => {
    if (matcher.ign && p.ign.toLowerCase() === matcher.ign.toLowerCase()) return true;
    if (cleanDlMatcher && cleanDuelId(p.idDuelLinks) === cleanDlMatcher) return true;
    if (matcher.discordId && p.discordId === matcher.discordId) return true;
    return false;
  });

  return {
    teamName: teamRes.data.namaTim || teamSlug,
    ign: found?.ign || matcher.ign || '-',
    discord: found?.discord ? `@${found.discord}` : '-',
    idDuelLinks: found?.idDuelLinks || matcher.dl || '-',
  };
}

export async function validateAddAvailability(
  teamSlug: string,
  players: PlayerItem[],
  cleanIgn: string,
  targetDiscordId: string,
  formattedDl: string,
  cleanDl: string
) {
  // 1. Cek di tim sendiri
  const existingInTeam = players.find(
    (p) => p.ign.toLowerCase() === cleanIgn.toLowerCase() || (p.discordId && p.discordId === targetDiscordId)
  );
  if (existingInTeam) {
    throw new Error(
      `Pemain ini sudah terdaftar di tim Anda:\n• **IGN:** ${existingInTeam.ign}\n• **Discord:** @${existingInTeam.discord}\n• **ID DL:** ${existingInTeam.idDuelLinks}`
    );
  }

  // 2. Cek ID Duel Links di tim lain
  const existingTeamByDl = await kv.hget<string>('global:duellinks', cleanDl);
  if (existingTeamByDl && existingTeamByDl !== teamSlug) {
    const detail = await getConflictingPlayerDetails(existingTeamByDl, { dl: cleanDl });
    throw new Error(
      `ID Duel Links **${formattedDl}** sedang aktif digunakan oleh pemain di tim lain:\n• **Tim:** ${detail.teamName}\n• **IGN:** ${detail.ign}\n• **Discord:** ${detail.discord}\n• **ID DL:** ${detail.idDuelLinks}`
    );
  }

  // 3. Cek IGN di tim lain
  const existingTeamByIgn = await kv.hget<string>('global:ign', cleanIgn);
  if (existingTeamByIgn && existingTeamByIgn !== teamSlug) {
    const detail = await getConflictingPlayerDetails(existingTeamByIgn, { ign: cleanIgn });
    throw new Error(
      `IGN **${cleanIgn}** sedang aktif digunakan oleh pemain di tim lain:\n• **Tim:** ${detail.teamName}\n• **IGN:** ${detail.ign}\n• **Discord:** ${detail.discord}\n• **ID DL:** ${detail.idDuelLinks}`
    );
  }

  // 4. Cek Akun Discord di tim lain
  const existingTeamByDiscord = await kv.hget<string>('global:discord_ids', targetDiscordId);
  if (existingTeamByDiscord && existingTeamByDiscord !== teamSlug) {
    const detail = await getConflictingPlayerDetails(existingTeamByDiscord, { discordId: targetDiscordId });
    throw new Error(
      `Akun Discord <@${targetDiscordId}> sedang aktif terdaftar di tim lain:\n• **Tim:** ${detail.teamName}\n• **IGN:** ${detail.ign}\n• **Discord:** ${detail.discord}\n• **ID DL:** ${detail.idDuelLinks}`
    );
  }
}
