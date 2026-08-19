import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake } from '@/lib/discord/utils';
import { MatchScheduleItem } from '@/app/tournament/_library/types';

export async function handleMatchReportCommand(interaction: any) {
  try {
    const options = interaction.data?.options || [];
    const teamInput = (options.find((o: any) => o.name === 'team')?.value || '').trim().toLowerCase();

    if (!teamInput) {
      return {
        type: 4,
        data: { content: '❌ Mohon pilih tim terlebih dahulu.', flags: 64 },
      };
    }

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];

    // 1. Filter match yang melibatkan tim dan sudah memiliki report
    const availableReports = schedules.filter((m) => {
      const isTeamInvolved =
        m.teamAName?.toLowerCase() === teamInput ||
        m.teamBName?.toLowerCase() === teamInput ||
        m.teamAId?.toLowerCase() === teamInput ||
        m.teamBId?.toLowerCase() === teamInput;

      return isTeamInvolved && !!m.discordMessageId;
    });

    if (availableReports.length === 0) {
      return {
        type: 4,
        data: {
          content: `⚠️ Tidak ditemukan **Match Report** yang sudah dipublikasikan untuk tim **${teamInput}**.`,
          flags: 64,
        },
      };
    }

    // 2. Ambil data tim untuk custom emoji jika tersedia
    const allTeamSlugs = (await kv.smembers('global:teams')) || [];
    const teamMetadataMap = new Map<string, { emojiId?: string; kodeTim?: string }>();

    for (const slug of allTeamSlugs) {
      const t = await kv.hgetall<any>(`teams:${slug}`);
      if (t && t.namaTim) {
        teamMetadataMap.set(t.namaTim.toLowerCase(), {
          emojiId: t.emojiId,
          kodeTim: t.kodeTim || slug.toUpperCase(),
        });
      }
    }

    // 3. Susun opsi Select Menu
    const selectOptions = availableReports.slice(0, 25).map((m) => {
      const weekNumber = m.weekNumber || 1;
      const scoreLabel = m.scoreA !== undefined && m.scoreB !== undefined ? `${m.scoreA} - ${m.scoreB}` : 'Selesai';
      
      // Deteksi emoji tim target atau tim lawan
      const currentTeamMeta = teamMetadataMap.get(teamInput);
      const emojiPayload =
        currentTeamMeta?.emojiId && isValidSnowflake(currentTeamMeta.emojiId)
          ? { id: currentTeamMeta.emojiId, name: currentTeamMeta.kodeTim || 'twi' }
          : undefined;

      return {
        label: `${m.id.toUpperCase()} (${scoreLabel})`,
        value: m.id,
        description: `Week ${weekNumber} • ${m.teamAName} vs ${m.teamBName}`.slice(0, 100),
        ...(emojiPayload ? { emoji: emojiPayload } : {}),
      };
    });

    return {
      type: 4,
      data: {
        flags: 64,
        content: `📋 Ditemukan **${availableReports.length}** match report untuk **${teamInput}**.\nSilakan pilih match di bawah untuk diteruskan:`,
        components: [
          {
            type: 1,
            components: [
              {
                type: 3, // String Select Menu
                custom_id: 'select_forward_match_report',
                placeholder: 'Pilih match report...',
                min_values: 1,
                max_values: selectOptions.length,
                options: selectOptions,
              },
            ],
          },
        ],
      },
    };
  } catch (error: any) {
    console.error('Error Handle Match Report Command:', error);
    return {
      type: 4,
      data: { content: `❌ Gagal memproses data report: ${error.message || 'Error internal'}`, flags: 64 },
    };
  }
}

export async function handleMatchReportSelect(interaction: any) {
  try {
    const selectedMatchIds: string[] = interaction.data?.values || [];
    const targetChannelId = interaction.channel_id;
    const sourceChannelId = DISCORD_CONFIG.CH_REPORT;

    if (!sourceChannelId) {
      return NextResponse.json({
        type: 7,
        data: { content: '❌ Konfigurasi `CH_REPORT` belum ditentukan di server.', components: [] },
      });
    }

    if (!selectedMatchIds.length) {
      return NextResponse.json({
        type: 7,
        data: { content: '❌ Tidak ada match yang dipilih.', components: [] },
      });
    }

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    let successCount = 0;
    const failedMatches: string[] = [];

    for (const matchId of selectedMatchIds) {
      const match = schedules.find((m) => m.id === matchId);
      if (!match || !match.discordMessageId) {
        failedMatches.push(matchId);
        continue;
      }

      const payload = {
        message_reference: {
          type: 1, // Type 1 = FORWARD
          channel_id: sourceChannelId,
          message_id: match.discordMessageId,
          fail_if_not_exists: false,
        },
      };

      const forwardRes = await discordAPI(`/channels/${targetChannelId}/messages`, 'POST', payload);

      if (forwardRes && forwardRes.id) {
        successCount++;
      } else {
        failedMatches.push(matchId);
      }
    }

    let summaryText = `✅ Berhasil meneruskan **${successCount}** match report ke channel ini!`;
    if (failedMatches.length > 0) {
      summaryText += `\n⚠️ Gagal meneruskan match: ${failedMatches.join(', ')}`;
    }

    return NextResponse.json({
      type: 7, // Update Interaction Message
      data: {
        content: summaryText,
        embeds: [],
        components: [],
      },
    });
  } catch (error: any) {
    console.error('Error Handle Match Report Select:', error);
    return NextResponse.json({
      type: 4,
      data: { content: `❌ Gagal memproses forward: ${error.message || 'Error internal'}`, flags: 64 },
    });
  }
}