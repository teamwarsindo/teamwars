import { DISCORD_CONFIG } from './config'; // Pastikan config sudah di-import
import { discordAPI } from './utils';

export async function createDiscordChannel(teamName: string, roleId: string) {
  const guildId = DISCORD_CONFIG.GUILD_ID; // 👈 Ubah di sini
  const parentCategoryId = DISCORD_CONFIG.CT_TEAM_ID; 

  if (!guildId || !roleId) return null;

  const data = await discordAPI(`/guilds/${guildId}/channels`, 'POST', {
    name: teamName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    type: 0, 
    parent_id: parentCategoryId,
    permission_overwrites: [
      { id: guildId, type: 0, deny: "1024" }, // guildId = @everyone role id
      { id: roleId, type: 0, allow: "3072", deny: "139280" },
      { id: DISCORD_CONFIG.BOT_ROLE_ID, type: 0, allow: "142352" }
    ]
  });

  return data?.id || null;
}

export async function createDiscordVoiceChannel(teamName: string, roleId: string) {
  const guildId = DISCORD_CONFIG.GUILD_ID; // 👈 Ubah di sini
  const parentCategoryId = DISCORD_CONFIG.CT_TEAM_ID; 

  if (!guildId || !roleId) return null;

  const data = await discordAPI(`/guilds/${guildId}/channels`, 'POST', {
    name: teamName, 
    type: 2, 
    parent_id: parentCategoryId,
    permission_overwrites: [
      { id: guildId, type: 0, deny: "1049600" },
      { id: roleId, type: 0, allow: "1049600" },
      { id: DISCORD_CONFIG.BOT_ROLE_ID, type: 0, allow: "1049616" }
    ]
  });

  return data?.id || null;
}

// Helper untuk membuat singkatan nama tim (misal: "UX Dino Rampage" -> "uxdr")
function getTeamAbbreviation(teamName: string): string {
  const words = teamName.trim().split(/\s+/);
  if (words.length > 1) {
    return words.map((w) => w[0]).join('').toLowerCase();
  }
  return teamName.substring(0, 4).toLowerCase();
}

// 🟢 GENERATE CHANNEL MATCH OTOMATIS (FORMAT RINGKAS: m1-uxdr-vs-fpfd)
export async function createMatchDiscordChannel(params: {
  matchId: string;
  teamAName: string;
  teamBName: string;
  roleAId?: string;
  roleBId?: string;
  refereeDiscordId?: string;
  streamerDiscordId?: string;
}) {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const parentCategoryId = DISCORD_CONFIG.CT_MATCH_ID;

  if (!guildId) return null;

  // Format ID Match singkat (misal "match-12" -> "m12")
  const shortMatchId = params.matchId.replace("match-", "m");
  const abbrA = getTeamAbbreviation(params.teamAName);
  const abbrB = getTeamAbbreviation(params.teamBName);

  // Hasil nama channel singkat: ⚔️-m12-uxdr-vs-fpfd
  const channelName = `⚔️-${shortMatchId}-${abbrA}-vs-${abbrB}`;

  const permission_overwrites: any[] = [
    { id: guildId, type: 0, deny: "1024" }, // Lock dari @everyone
    { id: DISCORD_CONFIG.BOT_ROLE_ID, type: 0, allow: "142352" }, // Bot Full Access
  ];

  // User Wasit ID
  if (params.refereeDiscordId) {
    permission_overwrites.push({
      id: params.refereeDiscordId,
      type: 1,
      allow: "3072",
    });
  }

  // User Streamer ID
  if (params.streamerDiscordId) {
    permission_overwrites.push({
      id: params.streamerDiscordId,
      type: 1,
      allow: "3072",
    });
  }

  // Role Tim A & Tim B
  if (params.roleAId) {
    permission_overwrites.push({ id: params.roleAId, type: 0, allow: "3072" });
  }
  if (params.roleBId) {
    permission_overwrites.push({ id: params.roleBId, type: 0, allow: "3072" });
  }

  const data = await discordAPI(`/guilds/${guildId}/channels`, 'POST', {
    name: channelName,
    type: 0,
    parent_id: parentCategoryId,
    permission_overwrites,
  });

  return data?.id || null;
                                                }
