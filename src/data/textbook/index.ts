import type { TextbookSection } from '../../types';
import { intro } from './intro';
import { math } from './math';
import { ml } from './ml';
import { dlCore } from './dl-core';
import { dlArch } from './dl-arch';
import { dlAdv } from './dl-adv';
import { devops } from './devops';

/** 教本の全セクション。CATEGORIES の並び順に対応させている */
export const SECTIONS: TextbookSection[] = [
  ...intro,
  ...math,
  ...ml,
  ...dlCore,
  ...dlArch,
  ...dlAdv,
  ...devops,
];

export const sectionById = (id: string): TextbookSection | undefined => SECTIONS.find((s) => s.id === id);

export const sectionsOfCategory = (categoryId: string): TextbookSection[] =>
  SECTIONS.filter((s) => s.categoryId === categoryId);

export const totalMinutes = SECTIONS.reduce((sum, s) => sum + s.minutes, 0);
