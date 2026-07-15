import { NextResponse } from 'next/server';
import { discordAPI } from '../utils';
import { DISCORD_CONFIG } from '../config';

export async function handleBtVerified(body: any) {
  const { guild_id: guildId, member: { user: { id: userId }, roles: currentRoles } } = body;

  if (currentRoles.includes(DISCORD_CONFIG.ROLE_VERIFIED)) {
    return NextResponse.json({ type: 4, data: { content: `⚠️ Anda sudah Verified.`, flags: 64 } });
  }

  await discordAPI(`/guilds/${guildId}/members/${userId}/roles/${DISCORD_CONFIG.ROLE_VERIFIED}`, 'PUT');

  return NextResponse.json({ type: 4, data: { content: `✅ **Akses Publik Dibuka!** Selamat bergabung di server.`, flags: 64 } });
}
