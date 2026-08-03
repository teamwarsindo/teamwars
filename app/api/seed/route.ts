import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Data Pemetaan Role ID -> Message ID yang Presisi untuk 16 Tim
const MAPPING_DATA = [
  { roleId: '1524016640961020105', msgId: '1531814783811195062', fallbackName: 'asashin' },
  { roleId: '1524245016552144978', msgId: '1531853805174394901', fallbackName: 'ux' }, // Role ID Asli UX
  { roleId: '1526622236218360029', msgId: '1531899103494279241', fallbackName: 'supernova' },
  { roleId: '1526957876352913420', msgId: '1531889081485758465', fallbackName: 'playground' },
  { roleId: '1527305125297782864', msgId: '1531894069939146824', fallbackName: 'licht united' },
  { roleId: '1527599406126469151', msgId: '1531848771569451330', fallbackName: 'octagram' },
  { roleId: '1527695890436067468', msgId: '1531884002833858644', fallbackName: 'dracarys' },
  { roleId: '1527875177797517477', msgId: '1531863871369777313', fallbackName: 'xernobyl' },
  { roleId: '1528758776872697856', msgId: '1531858888721170454', fallbackName: 'kings united' },
  { roleId: '1530913037500944588', msgId: '1531873977985667273', fallbackName: 'sakurajima' },
  { roleId: '1531030239055187978', msgId: '1531843779613429861', fallbackName: 'blackrose' },
  { roleId: '1531121262972240053', msgId: '1531904181986922539', fallbackName: 'final chapter' },
  { roleId: '1531262929675096175', msgId: '1531878967609659544', fallbackName: 'fabulous' },
  { roleId: '1531568842545827961', msgId: '1531868902521442315', fallbackName: 'trust' },
  { roleId: '1532167149924388894', msgId: '1532176673104072899', fallbackName: 'darkfall' },
  { roleId: '1532353903155216536', msgId: '1532393245815078913', fallbackName: 'nova quasar' },
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

      const namaTim = (teamData.namaTim || key).toLowerCase();

      // Cocokkan berdasarkan Role ID atau Nama Tim (Fallback)
      const match = MAPPING_DATA.find((m) => 
        (savedRoleId && m.roleId === savedRoleId) || 
        namaTim.includes(m.fallbackName)
      );

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
