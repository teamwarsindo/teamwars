"use client";

import { useParams } from "next/navigation";

export default function EditTeamPage() {
  const params = useParams();
  const token = params?.token;

  return (
    <div style={{ padding: '50px', color: 'white', textAlign: 'center' }}>
      <h1>Debug Mode</h1>
      <p>Token yang terbaca: {token ? token : "Tidak ada token!"}</p>
    </div>
  );
}
