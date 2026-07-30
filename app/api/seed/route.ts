import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const MAPPING_DATA = [
  { roleId: '1524016640961020105', msgId: '1531853805174394901' },
  { roleId: '1526622236218360029', msgId: '1531899103494279241' },
  { roleId: '1526957876352913420', msgId: '1531889081485758465' },
  { roleId: '1527305125297782864', msgId: '1531894069939146824' },
  { roleId: '1527599406126469151', msgId: '1531848771569451330' },
  { roleId: '1527695890436067468', msgId: '1531884002833858644' },
  { roleId: '1527875177797517477', msgId: '1531863871369777313' },
  { roleId: '1528758776872697856', msgId: '1531858888721170454' },
  { roleId: '1530913037500944588', msgId: '1531873977985667273' },
  { roleId: '1531030239055187978', msgId: '1531843779613429861' },
  { roleId: '1531121262972240053', msgId: '1531904181986922539' },
  { roleId: '1531262929675096175', msgId: '1531878967609659544' },
  { roleId: '1531568842545827961', msgId: '1531868902521442315' },
  { roleId: '1532167149924388894', msgId: '1532176673104072899' },
  { roleId: '1532353903155216536', msgId: '1532393245815078913' },
];

export async function GET() {
  try {
    const teamKeys = await kv.keys('teams:*');
    let updatedCount = 0;
    const details: string[] = [];

    for (const key of teamKeys) {
      const teamData: any = await kv.hgetall(key);
      if (!teamData) continue;

      const savedRoleId = 
        teamData.discordRoleId || 
        teamData.roleId || 
        teamData.roleTeamId || 
        teamData.roleTeam || 
        teamData.idRole || 
        '';

      const match = MAPPING_DATA.find((m) => m.roleId === savedRoleId);

      if (match) {
        await kv.hset(key, { editReminderMsgId: match.msgId });
        updatedCount++;
        details.push(`OK: ${teamData.namaTim || key} -> ${match.msgId}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengupdate ${updatedCount} tim!`,
      details,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
  }
