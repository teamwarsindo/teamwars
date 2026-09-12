import { discordAPI, hexToDecimal } from '../utils';

export interface OfficialScoreLogParams {
  channelId: string;
  teamAName: string;
  teamBName: string;
  teamAEmoji?: string;
  teamBEmoji?: string;
  scoreA: number;
  scoreB: number;
  winnerHex?: string;
}

// Official Score Log ke #CH_SCORE
export async function sendOfficialScoreLog(params: OfficialScoreLogParams): Promise<string | null> {
  const isTeamAWin = params.scoreA > params.scoreB;
  const winnerName = isTeamAWin ? params.teamAName : params.teamBName;
  const loserName = isTeamAWin ? params.teamBName : params.teamAName;
  const winnerEmoji = isTeamAWin ? params.teamAEmoji : params.teamBEmoji;
  const loserEmoji = isTeamAWin ? params.teamBEmoji : params.teamAEmoji;

  const winScore = Math.max(params.scoreA, params.scoreB);
  const loseScore = Math.min(params.scoreA, params.scoreB);

  const winnerDisplay = `${winnerEmoji ? winnerEmoji + ' ' : ''}**${winnerName}**`;
  const loserDisplay = `${loserEmoji ? loserEmoji + ' ' : ''}**${loserName}**`;

  // Warna tepi dinamis sesuai tim pemenang (fallback hijau #22c55e)
  const embedColor = hexToDecimal(params.winnerHex || '#22c55e');

  const embedData = {
    description: `${winnerDisplay} defeated ${loserDisplay} with a score of **${winScore}-${loseScore}**`,
    color: embedColor,
  };

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', {
    embeds: [embedData],
  }).catch((err) => {
    console.error('[OFFICIAL SCORE LOG ERROR]:', err);
    return null;
  });

  return res?.id || null;
}
