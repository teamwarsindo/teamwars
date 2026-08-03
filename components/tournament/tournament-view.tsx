const handleForceResetSchedules = async () => {
    const res = await Swal.fire({
      title: "SYNC DATA ROULETTE & GENERATE JADWAL?",
      text: "Sistem akan mengambil daftar tim Group A & B terbaru dari Roulette dan menyusun ulang jadwal pertandingan secara otomatis.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Sync Sekarang",
      confirmButtonColor: "#0284c7",
    });

    if (!res.isConfirmed) return;
    setIsLoading(true);

    try {
      await fetch("/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SYNC_ROULETTE" }),
      });
      
      setSelectedDateFilter("");
      setSelectedGroupFilter("ALL");
      await fetchTournamentData();
      
      Swal.fire("Berhasil!", "Jadwal dan Standing berhasil disinkronisasi dengan data Roulette terbaru.", "success");
    } catch (err) {
      Swal.fire("Gagal!", "Terjadi kesalahan saat menyinkronkan data.", "error");
    } finally {
      setIsLoading(false);
    }
  };
