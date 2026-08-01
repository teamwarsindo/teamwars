/**
 * 1. STEP SATU: Form Submit -> Tampilkan Dialog Konfirmasi
 */
export async function processBidSubmission(interaction: any, env: any) {
  if (!isBidOpen()) {
    await syncBidMessages(env, true);
    return makeEphemeralResponse("❌ **Bidding sudah ditutup!** (Batas waktu: 8 Agustus 2026, 20:00 WIB)");
  }

  const customId = interaction.data.custom_id; 
  const groupTarget = customId.replace("modal_bid_", ""); 
  
  const components = interaction.data.components;
  let nameA = "";
  let nameB = "";
  let amountRaw = "";

  for (const row of components) {
    for (const comp of row.components) {
      if (comp.custom_id === "input_division_name") nameA = comp.value.trim();
      if (comp.custom_id === "input_division_name_a") nameA = comp.value.trim();
      if (comp.custom_id === "input_division_name_b") nameB = comp.value.trim();
      if (comp.custom_id === "input_bid_amount") amountRaw = comp.value;
    }
  }

  const amountInput = parseInt(amountRaw.replace(/[^0-9]/g, ''), 10);

  // Validasi Minimal Nominal Bid
  if (isNaN(amountInput) || amountInput < 100000) {
    return makeEphemeralResponse("❌ **Bid ditolak!** Minimal nominal bid adalah **Rp100.000**.");
  }

  // Validasi Kelipatan Rp10.000
  if ((amountInput - 100000) % 10000 !== 0) {
    return makeEphemeralResponse("❌ **Bid ditolak!** Nominal bid harus dalam kelipatan **Rp10.000**.");
  }

  const rawData = env?.KV_STORE ? await env.KV_STORE.get(KV_BID_KEY) : null;
  let data: BidStore = typeof rawData === 'string' ? JSON.parse(rawData) : (rawData || { groupA: null, groupB: null, logs: [] });

  const currentA = data.groupA?.amount || 0;
  const currentB = data.groupB?.amount || 0;

  // LOGIKA HARGA AWAL Rp100.000 (Base Price)
  // Karena Harga Awal dari panitia adalah 100.000, maka bid pertama peserta minimal harus Rp110.000
  if (groupTarget === "A") {
    const currentBidA = currentA === 0 ? 100000 : currentA;
    const minRequiredA = currentBidA + 10000;

    if (amountInput < minRequiredA) {
      return makeEphemeralResponse(`❌ **Bid ditolak!** Harga saat ini **${formatRupiah(currentBidA)}**. Bid kamu minimal harus **${formatRupiah(minRequiredA)}**.`);
    }
  } else if (groupTarget === "B") {
    const currentBidB = currentB === 0 ? 100000 : currentB;
    const minRequiredB = currentBidB + 10000;

    if (amountInput < minRequiredB) {
      return makeEphemeralResponse(`❌ **Bid ditolak!** Harga saat ini **${formatRupiah(currentBidB)}**. Bid kamu minimal harus **${formatRupiah(minRequiredB)}**.`);
    }
  } else if (groupTarget === "BOTH") {
    const currentBidA = currentA === 0 ? 100000 : currentA;
    const currentBidB = currentB === 0 ? 100000 : currentB;
    const minReqA = currentBidA + 10000;
    const minReqB = currentBidB + 10000;

    if (amountInput < minReqA || amountInput < minReqB) {
      return makeEphemeralResponse(`❌ **Bid ditolak!** Nominal **${formatRupiah(amountInput)}** harus lebih tinggi dari Group A (Min: ${formatRupiah(minReqA)}) DAN Group B (Min: ${formatRupiah(minReqB)}).`);
    }
  }

  // SIMPAN SEMENTARA MENGGUNAKAN KEY PER USER ID (Akan otomatis ke-replace jika ada data baru)
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const pendingKey = `pending_bid_${userId}`;
  
  const pendingData = {
    groupTarget,
    nameA,
    nameB,
    amountInput,
    userId,
    username: interaction.member?.user?.username || interaction.user?.username
  };

  if (env?.KV_STORE) {
    // Tanpa TTL expiration! Langsung overwrite jika key ini sudah ada
    await env.KV_STORE.put(pendingKey, JSON.stringify(pendingData));
  }

  const confirmText = groupTarget === "BOTH"
    ? `⚠️ **KONFIRMASI BIDDING**\n\n` +
      `• **Group A:** "${nameA}"\n` +
      `• **Group B:** "${nameB}"\n` +
      `• **Nominal Bid:** **${formatRupiah(amountInput)}**\n\n` +
      `Apakah kamu yakin ingin mengajukan bid ini?`
    : `⚠️ **KONFIRMASI BIDDING**\n\n` +
      `• **Group:** Group ${groupTarget}\n` +
      `• **Nama Divisi:** "${nameA}"\n` +
      `• **Nominal Bid:** **${formatRupiah(amountInput)}**\n\n` +
      `Apakah kamu yakin ingin mengajukan bid ini?`;

  return makeEphemeralResponse(confirmText, getConfirmButtons(userId));
}

/**
 * 2. STEP DUA: User Klik [ Ya, Saya Yakin ] atau [ Batal ]
 */
export async function handleConfirmBid(interaction: any, env: any) {
  const customId = interaction.data.custom_id;
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const pendingKey = `pending_bid_${userId}`;

  // Jika Klik Batal
  if (customId.startsWith("confirm_bid_no_")) {
    if (env?.KV_STORE) await env.KV_STORE.delete(pendingKey);
    return NextResponse.json({
      type: 7,
      data: { content: "❌ Bidding dibatalkan.", components: [] }
    });
  }

  // Jika Klik Ya, Saya Yakin
  const rawPending = env?.KV_STORE ? await env.KV_STORE.get(pendingKey) : null;

  if (!rawPending) {
    return NextResponse.json({
      type: 7,
      data: { content: "❌ Data konfirmasi tidak ditemukan. Silakan lakukan bid ulang.", components: [] }
    });
  }

  const pending = typeof rawPending === 'string' ? JSON.parse(rawPending) : rawPending;

  // Load Data Bidding Utama
  const rawData = env?.KV_STORE ? await env.KV_STORE.get(KV_BID_KEY) : null;
  let data: BidStore = typeof rawData === 'string' ? JSON.parse(rawData) : (rawData || { groupA: null, groupB: null, logs: [] });

  const timestamp = getWibTimestamp();

  if (pending.groupTarget === "A" || pending.groupTarget === "BOTH") {
    data.groupA = {
      amount: pending.amountInput,
      name: pending.nameA,
      userId: pending.userId,
      username: pending.username,
      timestamp
    };
    data.logs.unshift({
      group: "A",
      amount: pending.amountInput,
      name: pending.nameA,
      username: pending.username,
      timestamp
    });
  }

  if (pending.groupTarget === "B" || pending.groupTarget === "BOTH") {
    data.groupB = {
      amount: pending.amountInput,
      name: pending.groupTarget === "BOTH" ? pending.nameB : pending.nameA,
      userId: pending.userId,
      username: pending.username,
      timestamp
    };
    data.logs.unshift({
      group: "B",
      amount: pending.amountInput,
      name: pending.groupTarget === "BOTH" ? pending.nameB : pending.nameA,
      username: pending.username,
      timestamp
    });
  }

  // Simpan permanen ke KV & Hapus data pending
  if (env?.KV_STORE) {
    await env.KV_STORE.put(KV_BID_KEY, JSON.stringify(data));
    await env.KV_STORE.delete(pendingKey);
  }

  // Trigger PATCH update ke pesan Discord
  await syncBidMessages(env);

  return NextResponse.json({
    type: 7,
    data: {
      content: `✅ **Berhasil!** Bid kamu sebesar **${formatRupiah(pending.amountInput)}** telah resmi tercatat! Pesan di channel telah diperbarui.`,
      components: []
    }
  });
}
