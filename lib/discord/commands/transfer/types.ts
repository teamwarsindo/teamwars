import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake } from '@/lib/discord/utils';

export interface TransferContext {
  interaction: any;
  actorId: string;
  actorRoleText: string;
  isAdmin: boolean;
  isKetua: boolean;
  isWakil: boolean;
  channelId: string;
  token: string;
  appId: string;
  teamSlug: string;
  teamName: string;
  teamData: any;
  opts: any[];
}

export function getSubcommandData(interaction: any) {
  const options = interaction.data?.options || [];
  const subcommandObj = options.find((o: any) => o.type === 1);
  if (!subcommandObj) return { subcommand: null, opts: [] };
  return {
    subcommand: subcommandObj.name,
    opts: subcommandObj.options || [],
  };
}

export function getWibTimestamp(): string {
  return (
    new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date()) + ' WIB'
  );
}

// 🔍 Resolusi Discord ID (Fallback ke global:verified_users)
export async function resolveTargetDiscordId(rawIdentifier?: string): Promise<string | null> {
  if (!rawIdentifier) return null;
  const clean = String(rawIdentifier).trim();

  // Jika sudah merupakan Snowflake angka murni
  if (isValidSnowflake(clean)) return clean;

  // Jika berupa username (dengan atau tanpa @)
  const cleanUsername = clean.toLowerCase().replace(/^@/, '');
  const id = await kv.hget<string>('global:verified_users', cleanUsername);
  return id && isValidSnowflake(id) ? id : null;
}

export async function sendAdminAuditLog(params: {
  actorId: string;
  actorRoleText: string;
  teamSlug: string;
  teamName: string;
  subcommand: string;
  targetUserId?: string;
  targetIgn?: string;
  targetDl?: string;
  roleChanges?: { added?: string[]; removed?: string[] };
  quotaUsed?: number;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}) {
  const {
    actorId,
    actorRoleText,
    teamSlug,
    teamName,
    subcommand,
    targetUserId,
    targetIgn,
    targetDl,
    roleChanges,
    quotaUsed,
    status,
    errorMessage,
  } = params;

  if (!DISCORD_CONFIG.CH_LOG) return;

  const isSuccess = status === 'SUCCESS';
  const color = isSuccess ? 0x2ecc71 : 0xe74c3c;
  const title = isSuccess
    ? `📋 [TRANSFER LOG] /transfer ${subcommand.toUpperCase()} - Berhasil`
    : `⚠️ [TRANSFER FAILED] /transfer ${subcommand.toUpperCase()} - Gagal`;

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    {
      name: '👤 Eksekutor / Aktor',
      value: `<@${actorId}> (\`${actorId}\`)\n**Jabatan:** ${actorRoleText}`,
      inline: true,
    },
    {
      name: '🛡️ Tim Terkait',
      value: `**${teamName || teamSlug}** (\`${teamSlug}\`)`,
      inline: true,
    },
  ];

  if (targetUserId) {
    const isSnowflake = isValidSnowflake(targetUserId);
    const userMention = isSnowflake ? `<@${targetUserId}>` : `@${targetUserId}`;
    const targetDetails = [
      `**Akun:** ${userMention} (\`${targetUserId}\`)`,
      targetIgn ? `**IGN:** \`${targetIgn}\`` : null,
      targetDl ? `**ID DL:** \`${targetDl}\`` : null,
    ]
      .filter(Boolean)
      .join('\n');

    fields.push({
      name: '🎯 Target Pemain',
      value: targetDetails,
      inline: false,
    });
  }

  if (roleChanges) {
    if (roleChanges.added && roleChanges.added.length > 0) {
      fields.push({
        name: '🟢 Role Discord Ditambahkan',
        value: roleChanges.added.map((r) => `• ${r}`).join('\n'),
        inline: false,
      });
    }
    if (roleChanges.removed && roleChanges.removed.length > 0) {
      fields.push({
        name: '🔴 Role Discord Dicabut / Direset',
        value: roleChanges.removed.map((r) => `• ${r}`).join('\n'),
        inline: false,
      });
    }
  }

  if (quotaUsed !== undefined) {
    fields.push({
      name: '📊 Sisa Kuota Tim',
      value: `Terpakai: **${quotaUsed}/2**`,
      inline: true,
    });
  }

  if (!isSuccess && errorMessage) {
    fields.push({
      name: '❌ Alasan Error / Kegagalan',
      value: `\`\`\`${errorMessage}\`\`\``,
      inline: false,
    });
  }

  const payload = {
    embeds: [
      {
        title,
        color,
        fields,
        footer: { text: `Eksekusi: ${getWibTimestamp()} • Team Wars Indonesia` },
      },
    ],
  };

  await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOG}/messages`, 'POST', payload).catch((err) =>
    console.error('[ADMIN AUDIT LOG ERROR]:', err)
  );
}
