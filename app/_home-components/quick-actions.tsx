{/* MODAL HEADER PROFILE */}
{searchResult && searchResult !== "NOT_FOUND" && (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <img
        src={searchResult.team.teamLogo || "/logo.webp"}
        alt=""
        className="h-12 w-12 rounded-xl object-contain border p-1 bg-background shrink-0"
      />
      <div className="space-y-1">
        <h3 className="font-extrabold text-base text-foreground leading-tight">
          {searchResult.team.teamName}
        </h3>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Badge Divisi */}
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
            #{searchResult.team.rank || 1} {searchResult.team.groupName}
          </span>

          {/* Badge Global Rank & Status Playoff */}
          {(() => {
            const isTopDivisi = (searchResult.team.rank || 1) <= 2;
            const globalRank = searchResult.team.globalRank || searchResult.team.rank;
            const isPlayoffWildcard = !isTopDivisi && globalRank <= 8;

            return (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                  isTopDivisi
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                    : isPlayoffWildcard
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                }`}
              >
                #{globalRank} Global {isTopDivisi ? "👑 (Top Divisi)" : isPlayoffWildcard ? "🔥 (Zona Playoff)" : "⚠️ (Belum Lolos)"}
              </span>
            );
          })()}
        </div>
      </div>
    </div>
    
    {/* Sisanya (Statistik, Performa, Roster) tetap sama */}
  </div>
)}
