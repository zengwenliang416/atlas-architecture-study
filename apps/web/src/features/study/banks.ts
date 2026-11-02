import { BANK_ID as ARCHITECTURE_ID, DATA as ARCHITECTURE } from '@atlas/bank-architecture';
import { BANK_ID as HCIP_ID, BANK_NAME, DATA as HCIP } from '@atlas/bank-hcip';
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
    id: HCIP_ID,
    name: BANK_NAME,
    questions: HCIP,
    lead: '先答再揭晓，费曼笔记，按间隔回来',
  },
];

export function studyBank(id: string): StudyBank {
  return STUDY_BANKS.find((bank) => bank.id === id) ?? STUDY_BANKS[0];
}
