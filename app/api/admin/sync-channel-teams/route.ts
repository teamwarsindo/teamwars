import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    // 1. Ambil semua slug tim dari set global
    const teamSlugs = await kv.smembers<string[]>('global:teams');

    if (!teamSlugs || teamSlugs.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada tim yang ditemukan di global:teams' },
        { status: 404 }
      );
    }

    const channelMap: Record<string, string> = {};
    const skippedTeams: string[] = [];
    const mappedTeams: { slug: string; channelId: string }[] = [];

    // 2. Ambil discordChannelId dari setiap data tim
    for (const slug of teamSlugs) {
      const teamData = await kv.hgetall<{ discordChannelId?: string; namaTim?: string }>(`teams:${slug}`);

      if (teamData?.discordChannelId) {
        channelMap[teamData.discordChannelId] = slug;
        mappedTeams.push({ slug, channelId: teamData.discordChannelId });
      } else {
        skippedTeams.push(slug);
      }
    }

    // 3. Simpan seluruh pemetaan ke hash global:channel_teams
    if (Object.keys(channelMap).length > 0) {
      await kv.hset('global:channel_teams', channelMap);
    }

    return NextResponse.json({
      success: true,
      message: 'Migrasi global:channel_teams berhasil disinkronkan',
      totalTeams: teamSlugs.length,
      totalMapped: mappedTeams.length,
      mappedTeams,
      skippedTeams,
    });
  } catch (error: any) {
    console.error('Gagal sinkronisasi global:channel_teams:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Gagal melakukan migrasi',
        error: error.message || 'Internal Server Error',
      },
      { status: 500 }
    );
  }
      }
