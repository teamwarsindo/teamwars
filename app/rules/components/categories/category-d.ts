import { RuleCategory } from "../rules-types";

export const categoryD: RuleCategory = {
  id: "D",
  title: "Legalitas Kartu, Skill, & Banlist",
  rules: [
    {
      title: "Ketentuan Legalitas",
      points: [
        "a. Kartu & BOX: Semua kartu dari main box, mini box, selection box, structure decks, event cards, character drops, dan level-up rewards berstatus LEGAL sejak hari rilis resmi di dalam game.",
        "b. Skill: Semua skill legal sejak dirilis.",
        "c. Forbidden/Limited List (Banlist): Aturan banlist TWI akan langsung diterapkan setelah daftar resmi diumumkan, meskipun Banlist tersebut belum aktif/diimplementasikan di dalam game.",
        "d. Bug/Glitches: Legalitas kartu atau skill yang terbukti mengalami bug akan ditangguhkan dan dibahas per kasus oleh pihak penyelenggara."
      ]
    }
  ]
};
