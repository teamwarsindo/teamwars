"use client"

import { cn } from "@/lib/utils"

interface ApiRouteListProps {
  routes: string[]
  isLoading: boolean
  selectedRoute: string | null
  onSelect: (route: string) => void
}

export function ApiRouteList({ routes, isLoading, selectedRoute, onSelect }: ApiRouteListProps) {
  return (
    <div className="lg:col-span-1 flex flex-col gap-2 rounded-xl border border-border/50 bg-background/30 p-3 sm:p-4 max-h-[35vh] lg:max-h-[60vh] overflow-y-auto custom-scrollbar">
      <h4 className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Available Routes</h4>
      {isLoading ? (
        <div className="text-xs text-primary animate-pulse">Scanning...</div>
      ) : routes.length > 0 ? (
        routes.map((route, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(route)}
            className={cn(
              "text-left flex items-center justify-between p-2.5 sm:p-3 rounded-lg border transition-all text-[11px] sm:text-sm shrink-0",
              selectedRoute === route 
                ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_-3px_rgba(220,38,38,0.3)]" 
                : "bg-background/50 border-border/30 hover:border-primary/50 text-foreground"
            )}
          >
            <span className="font-mono truncate mr-2">{route}</span>
            <span className="text-[9px] sm:text-[10px] bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded shrink-0">GET</span>
          </button>
        ))
      ) : (
        <div className="text-xs text-muted-foreground text-center py-4">Tidak ada API ditemukan.</div>
      )}
    </div>
  )
}
