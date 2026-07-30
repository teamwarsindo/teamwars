import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getWIBTime } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export async function handleBlacklistCommand(body: any) {
  try {
    const member = body.member;
    const userId = member?.user?.id || body.user?.id;
    const userRoles: string[] = member?.roles || [];

    // 🔒 1. PERMISSION CHECK: Cek apakah user punya Role Admin / Referee / ID Spesifik
    const isAdmin = userRoles.some(roleId => 
      roleId === DISCORD_CONFIG.ROLE_ADMIN
    );

    if (!isAdmin) {
      return NextResponse.json({
        type: 4,
        data: {
          content: '❌ Kamu tidak memiliki izin (Permission Admin) untuk mengelola blacklist!',
          flags: 64, // Ephemeral (Hanya terlihat oleh pengirim)
        },
      });
    }

    const options = body.data?.options || [];
    const actionOption = options.find((opt: any) => opt.name === 'action');
    const idOption = options.find((opt: any) => opt.name === 'id');

    const action = actionOption?.value; // 'add' | 'remove' | 'list'
    const rawInput = idOption?.value || '';

    // ===================================================
    // 📋 ACTION 1: LIST (Tampilkan Semua Blacklist)
    // ===================================================
    if (action === 'list') {
      const blacklistSet = (await kv.smembers('global:blacklisted_ids')) || [];
      
      if (blacklistSet.length === 0) {
        return NextResponse.json({
          type: 4,
          data: {
            embeds: [
              {
                title: '🟢 Daftar Blacklist Kosong',
                description: 'Saat ini belum ada ID Duel Links yang di-blacklist.',
                color: 3066993, // Green
                footer: { text: `Diperbarui pada ${getWIBTime()}` },
              },
            ],
            flags: 64,
          },
        });
      }

      const formattedList = blacklistSet.map((id, index) => `${index + 1}. \`${id}\``).join('\n');

      return NextResponse.json({
        type: 4,
        data: {
          embeds: [
            {
              title: '⛔ Daftar ID Duel Links Ter-Blacklist',
              description: `Total ada **${blacklistSet.length} ID** yang dilarang bertanding:\n\n${formattedList}`,
              color: 10038562, // Dark Red
              footer: { text: `Team Wars Indonesia • ${getWIBTime()}` },
            },
          ],
          flags: 64,
        },
      });
    }

    // Untuk ADD & REMOVE, wajib validasi format 9 angka
    const cleanNumbers = rawInput.replace(/\D/g, '');
    if (cleanNumbers.length !== 9) {
      return NextResponse.json({
        type: 4,
        data: {
          content: `❌ Format ID Duel Links salah! Harus berupa 9 angka. (Contoh: \`168-256-618\` atau \`168256618\`)`,
          flags: 64,
        },
      });
    }

    const formattedId = `${cleanNumbers.slice(0, 3)}-${cleanNumbers.slice(3, 6)}-${cleanNumbers.slice(6, 9)}`;

    // ===================================================
    // ➕ ACTION 2: ADD (Tambah ke Blacklist)
    // ===================================================
    if (action === 'add') {
      const isAlreadyAdded = await kv.sismember('global:blacklisted_ids', formattedId);
      
      if (isAlreadyAdded) {
        return NextResponse.json({
          type: 4,
          data: {
            content: `⚠️ ID Duel Links \`${formattedId}\` **sudah ada** di dalam daftar blacklist!`,
            flags: 64,
          },
        });
      }

      // Simpan ke Redis Set
      await kv.sadd('global:blacklisted_ids', formattedId);

      return NextResponse.json({
        type: 4,
        data: {
          embeds: [
            {
              title: '✅ ID Berhasil Ditambahkan ke Blacklist',
              description: `ID Duel Links \`${formattedId}\` telah resmi di-blacklist.\nPemain dengan ID ini **tidak akan bisa mendaftar atau melakukan edit team**.`,
              color: 15158332, // Red
              footer: { text: `Eksekutor: <@${userId}> • ${getWIBTime()}` },
            },
          ],
        },
      });
    }

    // ===================================================
    // ➖ ACTION 3: REMOVE (Hapus dari Blacklist)
    // ===================================================
    if (action === 'remove') {
      const isExist = await kv.sismember('global:blacklisted_ids', formattedId);

      if (!isExist) {
        return NextResponse.json({
          type: 4,
          data: {
            content: `⚠️ ID Duel Links \`${formattedId}\` **tidak ditemukan** di daftar blacklist.`,
            flags: 64,
          },
        });
      }

      // Hapus dari Redis Set
      await kv.srem('global:blacklisted_ids', formattedId);

      return NextResponse.json({
        type: 4,
        data: {
          embeds: [
            {
              title: '🟢 ID Berhasil Dihapus dari Blacklist',
              description: `ID Duel Links \`${formattedId}\` telah dihapus dari blacklist dan dapat mendaftar kembali.`,
              color: 3066993, // Green
              footer: { text: `Eksekutor: <@${userId}> • ${getWIBTime()}` },
            },
          ],
        },
      });
    }

    return NextResponse.json({ type: 4, data: { content: 'Aksi tidak dikenal.' } });

  } catch (error) {
    console.error('Error handling /blacklist command:', error);
    return NextResponse.json({
      type: 4,
      data: {
        content: '💥 Terjadi kesalahan server saat memproses command blacklist.',
        flags: 64,
      },
    });
  }
                  }
