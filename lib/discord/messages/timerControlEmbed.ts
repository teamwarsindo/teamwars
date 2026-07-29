// Helper Format Detik ke MM:SS (Contoh: 900 -> "15:00")
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export interface TimerState {
  remainingSeconds: number;
  isRunning: boolean;
  hasStarted: boolean;
  lastStartedAt: number | null;
}

export interface MatchTimerData {
  teamA: { nama: string; state: TimerState };
  teamB: { nama: string; state: TimerState };
}

export function createTimerControlEmbed(data: MatchTimerData, nowInSeconds: number) {
  const { teamA, teamB } = data;

  // Target End Timestamp untuk native countdown Discord (<t:TIMESTAMP:R>)
  const targetEndTimeA = teamA.state.isRunning
    ? nowInSeconds + teamA.state.remainingSeconds
    : null;
  const targetEndTimeB = teamB.state.isRunning
    ? nowInSeconds + teamB.state.remainingSeconds
    : null;

  // Format Status Teks Tim A
  let statusTextA = '⚪ **Belum Mulai**';
  if (teamA.state.isRunning) {
    statusTextA = `▶️ **Sedang Berjalan** (Habis <t:${targetEndTimeA}:R>)`;
  } else if (teamA.state.hasStarted) {
    statusTextA = `⏸️ **Paused** (\`${formatTime(teamA.state.remainingSeconds)}\`)`;
  }

  // Format Status Teks Tim B
  let statusTextB = '⚪ **Belum Mulai**';
  if (teamB.state.isRunning) {
    statusTextB = `▶️ **Sedang Berjalan** (Habis <t:${targetEndTimeB}:R>)`;
  } else if (teamB.state.hasStarted) {
    statusTextB = `⏸️ **Paused** (\`${formatTime(teamB.state.remainingSeconds)}\`)`;
  }

  // Visual Tombol Dinamis (Style: 3 = Green, 4 = Red, 1 = Blurple)
  const btnA = {
    label: teamA.state.isRunning ? 'Pause Tim A' : teamA.state.hasStarted ? 'Resume Tim A' : 'Start Tim A',
    style: teamA.state.isRunning ? 4 : teamA.state.hasStarted ? 1 : 3,
    emoji: { name: teamA.state.isRunning ? '⏸️' : '▶️' },
  };

  const btnB = {
    label: teamB.state.isRunning ? 'Pause Tim B' : teamB.state.hasStarted ? 'Resume Tim B' : 'Start Tim B',
    style: teamB.state.isRunning ? 4 : teamB.state.hasStarted ? 1 : 3,
    emoji: { name: teamB.state.isRunning ? '⏸️' : '▶️' },
  };

  return {
    embeds: [
      {
        title: '⏱️ MATCH TIME CONTROL — TWI SEASON 7',
        description: 'Waktu kontrol 15 menit per tim. Berjalan saat ganti deck, pause saat di dalam duel.',
        color: 3447003,
        fields: [
          {
            name: `🔵 TIM A: ${teamA.nama}`,
            value: `• **Sisa Waktu:** \`${formatTime(teamA.state.remainingSeconds)}\`\n• **Status:** ${statusTextA}`,
            inline: true,
          },
          {
            name: `🔴 TIM B: ${teamB.nama}`,
            value: `• **Sisa Waktu:** \`${formatTime(teamB.state.remainingSeconds)}\`\n• **Status:** ${statusTextB}`,
            inline: true,
          },
        ],
        footer: { text: 'Klik tombol di bawah untuk mengontrol timer • Wasit Only' },
        timestamp: new Date().toISOString(),
      },
    ],
    components: [
      {
        type: 1, // Action Row
        components: [
          {
            type: 2, // Button Component
            custom_id: 'toggle_timer_teamA',
            style: btnA.style,
            label: btnA.label,
            emoji: btnA.emoji,
          },
          {
            type: 2,
            custom_id: 'toggle_timer_teamB',
            style: btnB.style,
            label: btnB.label,
            emoji: btnB.emoji,
          },
        ],
      },
    ],
  };
}
