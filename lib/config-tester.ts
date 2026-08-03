export interface TeamTimerConfig {
  nama: string;
  channelId: string;
  roleId: string;
  remainingSeconds: number; // Default 15 menit (900 detik)
  isRunning: boolean;
  hasStarted: boolean;
  lastStartedAt: number | null;
}

export interface MatchTesterConfig {
  matchId: string;
  matchTimeWIB: string;
  matchChannelId: string;
  roomId: string;
  wasit: {
    mention: string;
  };
  teamA: TeamTimerConfig;
  teamB: TeamTimerConfig;
}

// Data Tester / Dummy Match Sesuai Kebutuhan Kamu
export const TESTER_MATCH_DATA: MatchTesterConfig = {
  matchId: 'twi-s7-match-01',
  matchTimeWIB: '20.00 WIB',
  matchChannelId: '610153245955850240',
  roomId: '45895',
  wasit: {
    mention: '<@377669305283641345>', // Ganti dengan User ID Discord Wasit asli jika perlu
  },
  teamA: {
    nama: 'Yanumon',
    channelId: '1531878006589751426',
    roleId: '1531878088932331661',
    remainingSeconds: 900, // 15 Menit
    isRunning: false,
    hasStarted: false,
    lastStartedAt: null,
  },
  teamB: {
    nama: 'Iqbalovers',
    channelId: '1531871083001544754',
    roleId: '1531878181127061625',
    remainingSeconds: 900, // 15 Menit
    isRunning: false,
    hasStarted: false,
    lastStartedAt: null,
  },
};
