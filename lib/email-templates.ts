export function getApprovedTemplate(data: { 
  namaTim: string; 
  warna: string; 
  ketua: any; 
  totalRoster: number;
  players: any[];
}) {
  const properTeamName = data.namaTim.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
  
  const roleWeights: Record<string, number> = { "Ketua": 1, "Wakil Ketua": 2, "Anggota": 3 };
  const sortedPlayers = [...data.players].sort((a, b) => {
    const weightA = roleWeights[a.role] || 99;
    const weightB = roleWeights[b.role] || 99;
    return weightA - weightB;
  });

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background-color: #121212; color: #ffffff; border-radius: 10px; overflow: hidden; border: 2px solid ${data.warna};">
      
      <div style="background-color: #000000; padding: 30px 20px; text-align: center; border-bottom: 2px solid ${data.warna};">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px;">TEAM WARS INDONESIA</h1>
        <p style="margin: 5px 0 0 0; color: #aaaaaa; font-size: 14px;">SEASON 7 REGISTRATION</p>
      </div>
      
      <div style="padding: 30px 20px;">
        
        <!-- BANNER STATUS APPROVED -->
        <div style="background-color: rgba(76, 175, 80, 0.1); border: 1px solid #4CAF50; color: #4CAF50; padding: 12px; border-radius: 6px; text-align: center; margin-bottom: 25px; font-weight: bold; letter-spacing: 1px; font-size: 14px;">
          ✅ STATUS: LUNAS & VALID (Pembayaran Terkonfirmasi)
        </div>

        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px;">Halo, ${data.ketua.namaLengkap}!</h2>
        <p style="color: #cccccc; line-height: 1.6; font-size: 15px;">
          Selamat! Pembayaran tim <strong>${properTeamName}</strong> telah divalidasi oleh tim Finance kami. Pendaftaran tim Anda sekarang resmi tercatat.
        </p>

        <!-- REKAP ROSTER -->
        <div style="background-color: #1e1e1e; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${data.warna};">
          <h3 style="margin-top: 0; margin-bottom: 20px; color: #ffffff; font-size: 16px; border-bottom: 1px solid #333; padding-bottom: 10px;">Rekap Data Roster (${data.totalRoster} Pemain)</h3>
          
          ${sortedPlayers.map(p => `
            <div style="background-color: #292929; border-radius: 8px; padding: 15px; margin-bottom: 12px; border-left: 3px solid ${p.role !== 'Anggota' ? data.warna : '#555555'};">
              <div style="margin-bottom: 10px;">
                <span style="background-color: ${p.role !== 'Anggota' ? data.warna + '33' : '#444444'}; color: ${p.role !== 'Anggota' ? data.warna : '#cccccc'}; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                  ${p.role}
                </span>
              </div>
              <div style="font-size: 14px; line-height: 1.8;">
                <strong style="color: #ffffff; font-size: 16px;">${p.namaLengkap}</strong><br>
                <span style="color: #aaaaaa;">IGN:</span> <span style="color: #ffffff; font-weight: bold;">${p.ign}</span><br>
                <span style="color: #aaaaaa;">Duel ID:</span> <span style="color: #4facfe; font-family: monospace;">${p.idDuelLinks || p.duelId}</span><br>
                <span style="color: #aaaaaa;">Discord:</span> <span style="color: #cccccc;">@${p.discord}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- INSTRUKSI WAJIB DISCORD & PERUBAHAN DATA -->
        <div style="background-color: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #ffffff; font-size: 15px; border-bottom: 1px solid #333; padding-bottom: 10px;">Langkah Selanjutnya (Wajib Diperhatikan):</h3>
          <p style="color: #cccccc; font-size: 13px; line-height: 1.6;">
            Karena seluruh pelaksanaan turnamen dan komunikasi akan dilakukan secara eksklusif di Discord, <strong>seluruh pemain yang terdaftar diwajibkan</strong> untuk bergabung ke dalam Server Discord resmi TWI Season 7.
          </p>
          <p style="margin-top: 15px; margin-bottom: 15px;">
            🔗 <strong>Tautan Undangan Discord:</strong> <a href="https://teamwars.web.id/invive/" style="color: #4facfe; text-decoration: none;">https://teamwars.web.id/invive/</a>
          </p>
          
          <h4 style="color: #ffffff; font-size: 14px; margin-bottom: 5px;">Instruksi di Server Discord:</h4>
          <ol style="color: #cccccc; font-size: 13px; line-height: 1.6; margin-top: 0; padding-left: 20px;">
            <li>Setelah bergabung, <strong>wajib mengubah nama pengguna (Nickname) Discord sesuai dengan IGN</strong> yang Anda daftarkan di atas.</li>
            <li>Perwakilan tim harap segera menghubungi Admin Discord kami (Username: <strong><code>tsaqif.mtz</code></strong>) untuk melakukan klaim <em>Role</em> khusus tim Anda.</li>
          </ol>

          <h3 style="margin-top: 25px; color: #ffffff; font-size: 15px; border-bottom: 1px solid #333; padding-bottom: 10px;">⚙️ Prosedur Perubahan Data Roster</h3>
          <p style="color: #cccccc; font-size: 13px; line-height: 1.6;">
            Jika Anda perlu menambah, menghapus, mengganti, atau memperbaiki data pemain, silakan <strong>balas (reply) email ini</strong> dengan menyalin dan mengisi formulir di bawah ini:
          </p>
          
          <pre style="background-color: #000000; color: #4facfe; padding: 15px; border-radius: 6px; font-size: 12px; overflow-x: auto; border: 1px solid #333;">FORMAT PERUBAHAN DATA ROSTER
-----------------------------------
Jenis Perubahan : [Tambah / Hapus / Edit / Ganti Pemain]
Nama Tim        : [Nama Tim Anda]
Target Pemain   : [Sebutkan urutan pemain / Nama IGN lama. Kosongkan jika Tambah Pemain]

DATA BARU (Isi pada bagian yang berubah saja):
- Nama Asli     : 
- Discord       : 
- IGN           : 
- ID Duel Links : </pre>
          
          <p style="color: #ff6b6b; font-size: 13px; line-height: 1.6; margin-bottom: 0;">
            ⚠️ <strong>PERINGATAN KERAS:</strong> Begitu turnamen resmi dilaksanakan (Kick-Off), seluruh akses perubahan data mandiri akan ditutup total. Perbaikan setelah kompetisi dimulai hanya bisa dilakukan melalui mekanisme Transfer Request kepada pihak panitia.
          </p>
        </div>

      </div>
      
      <div style="background-color: #0a0a0a; padding: 20px; text-align: center; border-top: 2px solid ${data.warna};">
        <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.8;">
          Sistem Registrasi TWI Season 7<br>
          <strong style="color: #888888;">&copy; 2026 Team Wars Indonesia. All rights reserved.</strong>
        </p>
      </div>
    </div>
  `;
}
