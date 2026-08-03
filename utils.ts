"use client"

import { RulePoint } from "./rule-point"

interface RulesListProps {
  filteredRules: any[]
}

export function RulesList({ filteredRules }: RulesListProps) {
  if (filteredRules.length === 0) {
    return (
      <div className="glass glow-border flex flex-col items-center justify-center rounded-2xl border p-12 text-center text-muted-foreground">
        <span className="mb-2 text-3xl">👻</span>
        <p>Peraturan yang lu cari nggak ketemu.</p>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {filteredRules.map((category) => (
        <div key={category.id} className="glass glow-border rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
          <div className="mb-6 border-b border-border pb-4">
            <h2 className="text-xl font-bold tracking-tight text-primary">
              BAB {category.id} - {category.title}
            </h2>
          </div>

          <div className="space-y-8">
            {category.rules.map((rule: any, idx: number) => (
              <div key={idx} className="space-y-4">
                <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <span className="h-5 w-1.5 rounded-full bg-primary/80" aria-hidden="true" />
                  {rule.title}
                </h3>
                
                <div className="space-y-4 pt-1">
                  {rule.points.map((point: any, pIdx: number) => (
                    <div key={pIdx}>
                      {typeof point === "string" ? (
                        <RulePoint rawText={point} />
                      ) : (
                        <div className="space-y-3">
                          <RulePoint rawText={point.text} />
                          <div className="ml-3.5 space-y-3 border-l-2 border-border/50 pl-5">
                            {point.subPoints.map((sp: string, spIdx: number) => (
                              <div key={spIdx}>
                                <RulePoint rawText={sp} isSub={true} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
