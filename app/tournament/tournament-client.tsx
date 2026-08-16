"use client";

import { useState } from "react";
import { TournamentView } from "./_components/tournament-view";

export default function TournamentClientContent({ isAdmin }: { isAdmin: boolean }) {
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<"ALL" | "Group A" | "Group B">("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");

  return (
    <TournamentView
      isAdmin={isAdmin}
      selectedGroupFilter={selectedGroupFilter}
      setSelectedGroupFilter={setSelectedGroupFilter}
      selectedDateFilter={selectedDateFilter}
      setSelectedDateFilter={setSelectedDateFilter}
    />
  );
}