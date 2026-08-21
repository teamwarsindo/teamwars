"use client";

import { useState } from "react";
import { TournamentView } from "./_components/tournament-view";
import { DivisionFilterType } from "./_components/tournament-filter";

export default function TournamentClientContent({ isAdmin }: { isAdmin: boolean }) {
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<DivisionFilterType>("ALL");
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
