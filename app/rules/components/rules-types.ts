export type RulePoint = string | { text: string; subPoints: string[] };

export interface RuleSection {
  title: string;
  points: RulePoint[];
}

export interface RuleCategory {
  id: string;
  title: string;
  rules: RuleSection[];
}
