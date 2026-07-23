import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session');

    if (!session || session.value !== 'authenticated') {
      return NextResponse.json(
        { error: 'Akses ditolak. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const adminKey = process.env.BASIC_AUTH_PWD || '';

    const [allTeamSlugs, verifiedUsersMap] = await Promise.all([
      kv.smembers('global:teams'),
      kv.hgetall('global:verified_users'),
    ]);

    const verifiedMap = (verifiedUsersMap as Record<string, string>) || {};

    const allTeamsData = await Promise.all(
      (allTeamSlugs || []).map(async (slug: any) => {
        const data: any = await kv.hgetall(`teams:${slug}`);

        let parsedPlayers = [];
        try {
          parsedPlayers = typeof data?.players === 'string'
            ? JSON.parse(data.players)
            : (data?.players || []);
        } catch (e) {
          parsedPlayers = [];
        }

        const playersWithVerification = parsedPlayers.map((player: any) => {
          const isVerified = Boolean(
            player?.discord && verifiedMap.hasOwnProperty(player.discord)
          );

          return {
            ...player,
            hasRoleDiscord: isVerified,
            discordId: isVerified ? verifiedMap[player.discord] : null,
          };
        });

        return {
          slug,
          ...data,
          players: playersWithVerification,
        };
      })
    );

    const formattedData = allTeamsData
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeA - timeB;
      })
      .map((team: any, index: number) => {
        const totalPlayers = team.players.length;
        const verifiedPlayers = team.players.filter((p: any) => p.hasRoleDiscord).length;

        // Tarik token edit asli dari DB Redis (editToken)
        const editToken = team.editToken || team.token || team.slug || '';
        
        // Buat Link Edit User & Admin Bypass Key
        const editUrl = `/edit-team/${editToken}`;
        const adminEditUrl = `/edit-team/${editToken}?key=${adminKey}`;

        return {
          id: team.slug,
          no: index + 1,
          namaTim: team.namaTim || 'Unknown',
          email: team.email || '-',
          waktuRegis: team.createdAt || new Date().toISOString(),
          warna: team.warna || '#000000',
          logo: team.logoTim || team.logo || '',
          buktiTransfer: team.buktiTransfer || '',
          editToken,
          editUrl,
          adminEditUrl,
          players: team.players,
          rosterStatus: `${verifiedPlayers}/${totalPlayers}`,
        };
      });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error Admin Teams API:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data pendaftaran' },
      { status: 500 }
    );
  }
}
