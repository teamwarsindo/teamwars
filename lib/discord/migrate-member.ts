import { DISCORD_CONFIG } from './config';
import { discordAPI } from './utils';

interface MigrateResult {
  success: boolean;
  message: string;
  transferredRoles: string[];
  nicknameUpdated: boolean;
  oldAccountKicked: boolean;
  error?: any;
}

export async function migrateDiscordAccount(
  oldUserId: string,
  newUserId: string
): Promise<MigrateResult> {
  const guildId = DISCORD_CONFIG.GUILD_ID;

  if (!guildId) {
    return {
      success: false,
      message: 'DISCORD_GUILD_ID tidak ditemukan di konfigurasi.',
      transferredRoles: [],
      nicknameUpdated: false,
      oldAccountKicked: false,
    };
  }

  try {
    // 1. Ambil data member akun lama
    const oldMember = await discordAPI(`/guilds/${guildId}/members/${oldUserId}`, 'GET');
    if (!oldMember) {
      return {
        success: false,
        message: `Member lama (${oldUserId}) tidak ditemukan di server.`,
        transferredRoles: [],
        nicknameUpdated: false,
        oldAccountKicked: false,
      };
    }

    // 2. Ambil data member akun baru (pastikan sudah join server)
    const newMember = await discordAPI(`/guilds/${guildId}/members/${newUserId}`, 'GET');
    if (!newMember) {
      return {
        success: false,
        message: `Member baru (${newUserId}) belum join ke dalam server Discord! Silakan join terlebih dahulu sebelum migrasi.`,
        transferredRoles: [],
        nicknameUpdated: false,
        oldAccountKicked: false,
      };
    }

    // 3. Ambil daftar role guild untuk memfilter role managed/bot/@everyone
    const guildRoles: any[] = await discordAPI(`/guilds/${guildId}/roles`, 'GET');
    const roleMap = new Map(guildRoles.map((r: any) => [r.id, r]));

    const oldRoles: string[] = Array.isArray(oldMember.roles) ? oldMember.roles : [];
    // Role yang bisa dipindah: Bukan @everyone dan bukan managed/bot integration
    const rolesToTransfer = oldRoles.filter((roleId) => {
      if (roleId === guildId) return false;
      const roleObj = roleMap.get(roleId);
      if (!roleObj) return false;
      if (roleObj.managed) return false; // Abaikan role bot/boost integration
      return true;
    });

    const transferredRoles: string[] = [];

    // 4. Salin semua role ke akun baru
    for (const roleId of rolesToTransfer) {
      // Lewati jika akun baru sudah punya role ini
      if (newMember.roles?.includes(roleId)) {
        transferredRoles.push(roleId);
        continue;
      }

      await discordAPI(`/guilds/${guildId}/members/${newUserId}/roles/${roleId}`, 'PUT');
      transferredRoles.push(roleId);
    }

    // 5. Salin Nickname / Server Display Name
    let nicknameUpdated = false;
    const oldNick = oldMember.nick || oldMember.user?.global_name || oldMember.user?.username;

    if (oldNick) {
      await discordAPI(`/guilds/${guildId}/members/${newUserId}`, 'PATCH', {
        nick: oldNick,
      });
      nicknameUpdated = true;
    }

    // 6. VALIDASI KETAT SEBELUM KICK
    // Pastikan seluruh role target terpasang dan nama sudah disinkronkan
    const isAllRolesTransferred = transferredRoles.length === rolesToTransfer.length;

    if (!isAllRolesTransferred) {
      return {
        success: false,
        message: 'Gagal menyalin seluruh role. Proses kick akun lama dibatalkan demi keamanan!',
        transferredRoles,
        nicknameUpdated,
        oldAccountKicked: false,
      };
    }

    // 7. KICK AKUN LAMA (Hanya dieksekusi jika semua step di atas berhasil 100%)
    await discordAPI(
      `/guilds/${guildId}/members/${oldUserId}`,
      'DELETE',
      undefined
    );

    return {
      success: true,
      message: `Migrasi berhasil! Role (${transferredRoles.length}) & nama "${oldNick}" berhasil dipindah. Akun lama telah di-kick dari server.`,
      transferredRoles,
      nicknameUpdated,
      oldAccountKicked: true,
    };
  } catch (error: any) {
    console.error('Error saat migrasi akun:', error);
    return {
      success: false,
      message: `Terjadi kendala saat migrasi: ${error?.message || String(error)}`,
      transferredRoles: [],
      nicknameUpdated: false,
      oldAccountKicked: false,
      error,
    };
  }
        }
