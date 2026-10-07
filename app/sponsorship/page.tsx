import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { SponsorshipOverview } from "./_components/sponsorship-overview";
import { SponsorshipBudgetPrizes } from "./_components/sponsorship-budget-prizes";
import { SponsorshipTiers } from "./_components/sponsorship-tiers";

export const metadata = {
  title: "Proposal Sponsorship — Team Wars Indonesia Season 8",
  description:
    "Proposal kemitraan resmi turnamen Yu-Gi-Oh! Master Duel 5 vs 5 Team Wars Indonesia Season 8.",
};

export default function SponsorshipPage() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-clip bg-background text-foreground">
      {/* AMBIENT GLOW LATAR BELAKANG */}
      <div
        className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        aria-hidden="true"
      />

      {/* TOP BAR */}
      <TopBar title="Official Proposal" />

      {/* CONTAINER UTAMA */}
      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-3 sm:px-6 pb-12">
        <HeroHeader showDetails={true} />

        <div className="w-full max-w-4xl space-y-6">
          <SponsorshipOverview />
          <SponsorshipBudgetPrizes />
          <SponsorshipTiers />
        </div>

        <Footer />
      </div>
    </main>
  );
}
