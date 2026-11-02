import { BANK_ID as ARCHITECTURE_ID, DATA as ARCHITECTURE } from '@atlas/bank-architecture';
import { BANK_ID as LLM_ID, BANK_NAME, DATA as LLM } from '@atlas/bank-llm';
import type { Question } from '@atlas/domain';

export type StudyBank = {
  id: string;
  name: string;
  questions: Question[];
  lead: string;
};

export const STUDY_BANKS: StudyBank[] = [
  {
    id: ARCHITECTURE_ID,
    name: '系统架构设计师',
    questions: ARCHITECTURE,
    lead: '先答再揭晓，四区讲解、费曼笔记，按间隔回来',
  },
  {
    id: LLM_ID,
    name: BANK_NAME,
    questions: LLM,
    lead: '先答再揭晓，费曼笔记，按间隔回来',
  },
];

export function studyBank(id: string): StudyBank {
  return STUDY_BANKS.find((bank) => bank.id === id) ?? STUDY_BANKS[0];
}
