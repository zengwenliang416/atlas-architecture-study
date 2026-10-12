export type Choice = {
  id: string;
  name: string;
  meaning: string;
  reason: string;
  correct: boolean;
};

export type Blank = {
  label: string;
  answer: string;
  letter: string;
  options: Choice[];
};

export type EssaySection = [string, string];

export type Question = {
  id: string;
  title: string;
  topic: string;
  kind: string;
  stem: string;
  blanks: Blank[];
  concept: string;
  steps: EssaySection[];
  core: string[];
  example: string;
  pitfalls: string[];
  motto: string;
  source: string;
  summary: string[];
  essay_cases?: Record<string, EssaySection[]>;
};
