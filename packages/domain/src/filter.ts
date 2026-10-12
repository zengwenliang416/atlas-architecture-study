import type { Level } from './errors.js';
import type { Question } from './question.js';

export type StudyFilter = 'all' | Level | 'due';

export function isDue(nextReviewOn: string, today: string): boolean {
  return nextReviewOn <= today;
}

export function questionSearchText(question: Question): string {
  const parts = [
    question.title,
    question.topic,
    question.stem,
    question.concept,
    question.motto,
    question.example,
  ];
  for (const blank of question.blanks) {
    parts.push(blank.answer);
    for (const option of blank.options) {
      parts.push(option.name, option.reason, option.meaning);
    }
  }
  return parts.join(' ').toLowerCase();
}

export function matchesQuestion(
  question: Question,
  record: { level: Level; nextReviewOn: string },
  criteria: { filter: StudyFilter; keyword: string; today: string },
): boolean {
  if (criteria.filter === 'due' && !isDue(record.nextReviewOn, criteria.today)) return false;
  if (
    (criteria.filter === 'new' || criteria.filter === 'vague' || criteria.filter === 'mastered') &&
    record.level !== criteria.filter
  ) {
    return false;
  }
  if (!criteria.keyword) return true;
  return questionSearchText(question).includes(criteria.keyword.toLowerCase());
}
