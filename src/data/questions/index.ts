import type { Question } from '../../types';
import { mathQuestions } from './math';
import { mlQuestions } from './ml';
import { dlQuestions } from './dl';
import { devopsQuestions } from './devops';

export const QUESTIONS: Question[] = [
  ...mathQuestions,
  ...mlQuestions,
  ...dlQuestions,
  ...devopsQuestions,
];

export const questionById = (id: string): Question | undefined => QUESTIONS.find((q) => q.id === id);

export const questionsOfCategory = (categoryId: string): Question[] =>
  QUESTIONS.filter((q) => q.categoryId === categoryId);

export const questionsOfSection = (sectionId: string): Question[] =>
  QUESTIONS.filter((q) => q.sectionId === sectionId);
