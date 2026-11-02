import { createHash } from 'node:crypto';
import { BANK_ID as ARCHITECTURE_ID, DATA as ARCHITECTURE } from '@atlas/bank-architecture';
import { BANK_ID as HCIP_ID, DATA as HCIP } from '@atlas/bank-hcip';
import type { Question } from '@atlas/domain';

export type BankCatalogEntry = {
  id: string;
  questions: Question[];
  body: string;
  etag: string;
};

function entry(id: string, questions: Question[]): BankCatalogEntry {
  const body = JSON.stringify({ bankId: id, questions });
  const etag = `"${createHash('sha256').update(body).digest('hex')}"`;
  return { id, questions, body, etag };
}

export const BANKS: Record<string, BankCatalogEntry> = {
  [ARCHITECTURE_ID]: entry(ARCHITECTURE_ID, ARCHITECTURE),
  [HCIP_ID]: entry(HCIP_ID, HCIP),
};

export function bankQuestions(bankId: string): Question[] | undefined {
  return BANKS[bankId]?.questions;
}

export function bankQuestionIds(bankId: string): Set<string> | undefined {
  const questions = bankQuestions(bankId);
  return questions ? new Set(questions.map((question) => question.id)) : undefined;
}
