"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared"

import { BackToTop } from "./components/back-to-top"
import { ruleCategories } from "./components/rules-data"
import { RulesSearchBar } from "./components/rules-search-bar"
import { RulesList } from "./components/rules-list"

function RulebookContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const queryCategory = searchParams.get("category")?.toUpperCase() || "ALL"
  
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState(queryCategory)

  // Sinkronkan jika URL berubah
  useEffect(() => {
    setActiveCategory(queryCategory)
  }, [queryCategory])

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat)
    const params = new URLSearchParams(searchParams.toString())
    if (cat === "ALL") {
      params.delete("category")
    } else {
      params.set("category", cat.toLowerCase())
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const filteredRules = useMemo(() => {
    return ruleCategories
      .filter((cat) => (activeCategory === "ALL" ? true : cat.id === activeCategory))
      .map((category) => {
        if (!searchQuery.trim()) return category
        const query = searchQuery.toLowerCase()
        
        if (category.title.toLowerCase().includes(query)) return category

        const matchingRules = category.rules.filter((rule) => {
          if (rule.title.toLowerCase().includes(query)) return true
          return rule.points.some((point) => {
            if (typeof point === "string") return point.toLowerCase().includes(query)
            return (
              point.text.toLowerCase().includes(query) ||
              point.subPoints.some((sp) => sp.toLowerCase().includes(query))
            )
          })
        })

        return { ...category, rules: matchingRules }
      })
      .filter((category) => category.rules.length > 0)
  }, [searchQuery, activeCategory])

  const handleClearFilters = () => {
    setSearchQuery("")
    handleCategoryChange("ALL")
  }

  const isFilterActive = searchQuery !== "" || activeCategory !== "ALL"

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-clip bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      <TopBar title="Official Rulebook" />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6">
        <HeroHeader />

        <section className="flex w-full max-w-4xl flex-col items-center">
          <RulesSearchBar 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeCategory={activeCategory}
            setActiveCategory={handleCategoryChange}
            onClearFilters={handleClearFilters}
            isFilterActive={isFilterActive}
          />

          <RulesList filteredRules={filteredRules} />
        </section>

        <Footer />
        <BackToTop />
      </div>
    </main>
  )
}

export default function RulebookClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RulebookContent />
    </Suspense>
  )
}