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

  // Hitung Timestamp kapan timer akan habis
  const targetEndTimeA = teamA.state.isRunning
    ? nowInSeconds + teamA.state.remainingSeconds
    : null;
  const targetEndTimeB = teamB.state.isRunning
    ? nowInSeconds + teamB.state.remainingSeconds
    : null;

  // --- RENDER TIM A ---
  let displayA = `⚪ **\`${formatTime(teamA.state.remainingSeconds)}\`** *(Belum Mulai)*`;
  if (teamA.state.isRunning) {
    // Gunakan <t:TIMESTAMP:R> agar berjalan live menghitung mundur
    displayA = `🔴 **BERJALAN** ➔ Sisa Waktu: <t:${targetEndTimeA}:R>`;
  } else if (teamA.state.hasStarted) {
    displayA = `⏸️ **PAUSED** ➔ Sisa Waktu: **\`${formatTime(teamA.state.remainingSeconds)}\`**`;
  }

  // --- RENDER TIM B ---
  let displayB = `⚪ **\`${formatTime(teamB.state.remainingSeconds)}\`** *(Belum Mulai)*`;
  if (teamB.state.isRunning) {
    displayB = `🔴 **BERJALAN** ➔ Sisa Waktu: <t:${targetEndTimeB}:R>`;
  } else if (teamB.state.hasStarted) {
    displayB = `⏸️ **PAUSED** ➔ Sisa Waktu: **\`${formatTime(teamB.state.remainingSeconds)}\`**`;
  }

  // Visual Tombol
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
        title: '⏱️ MATCH TIME CONTROL — TWI S7',
        color: 3447003,
        fields: [
          {
            name: `🔵 TIM A: ${teamA.nama}`,
            value: displayA,
            inline: false,
          },
          {
            name: `🔴 TIM B: ${teamB.nama}`,
            value: displayB,
            inline: false,
          },
        ],
        footer: { text: 'Kontrol Timer Wasit' },
      },
    ],
    components: [
      {
        type: 1, // Action Row
        components: [
          {
            type: 2,
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
