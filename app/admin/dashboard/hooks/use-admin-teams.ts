import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export interface Player {
  nama: string;
  discord: string;
  ign: string;
  idDuelLinks: string;
  role: string;
  hasRoleDiscord: boolean;
  discordId?: string | null;
}

export interface Team {
  id: string;
  no: number;
  namaTim: string;
  email: string;
  waktuRegis: string;
  warna: string;
  logo: string;
  buktiTransfer: string;
  tokenEdit: string;
  players: Player[];
  rosterStatus: string;
}

export function useAdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedRoster, setSelectedRoster] = useState<Team | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/teams');
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!res.ok) {
        throw new Error('Gagal memuat data tim');
      }
      const data = await res.json();
      setTeams(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchSearch =
        team.namaTim.toLowerCase().includes(search.toLowerCase()) ||
        team.email.toLowerCase().includes(search.toLowerCase());

      const [verified, total] = team.rosterStatus.split('/');
      if (filter === 'complete') {
        return matchSearch && verified === total;
      }
      if (filter === 'incomplete') {
        return matchSearch && verified !== total;
      }
      return matchSearch;
    });
  }, [teams, search, filter]);

  return {
    teams: filteredTeams,
    totalCount: teams.length,
    search,
    setSearch,
    filter,
    setFilter,
    selectedRoster,
    setSelectedRoster,
    previewImg,
    setPreviewImg,
    isLoading,
    error,
    refresh: fetchTeams,
    logout,
  };
}
