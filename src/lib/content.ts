import { z } from 'zod';
import { benefits } from '@/content/data/benefits';
import { faqs } from '@/content/data/faq';
import { mentors } from '@/content/data/mentors';
import { officers } from '@/content/data/officers';
import { partners } from '@/content/data/partners';
import { press } from '@/content/data/press';
import { programs } from '@/content/data/programs';
import { recruitment } from '@/content/data/recruitment';
import { stamps } from '@/content/data/stamps';
import { stats } from '@/content/data/stats';
import { steps } from '@/content/data/steps';
import {
  benefitSchema,
  faqSchema,
  growthStepSchema,
  mentorSchema,
  officerSchema,
  partnerSchema,
  pressSchema,
  programSchema,
  recruitmentSchema,
  stampSchema,
  statSchema,
  type Localized,
  type Recruitment,
  type Stamp,
} from '@/content/schema';
import type { Locale } from '@/i18n/locales';

// Parsing at module load makes `next build` fail on invalid data (spec section 6).
const data = {
  stats: z.array(statSchema).parse(stats),
  stamps: z.array(stampSchema).parse(stamps),
  steps: z.array(growthStepSchema).parse(steps),
  programs: z.array(programSchema).parse(programs),
  mentors: z.array(mentorSchema).parse(mentors),
  partners: z.array(partnerSchema).parse(partners),
  officers: z.array(officerSchema).parse(officers),
  press: z.array(pressSchema).parse(press),
  faqs: z.array(faqSchema).parse(faqs),
  benefits: z.array(benefitSchema).parse(benefits),
  recruitment: recruitmentSchema.parse(recruitment),
};

export function pick(text: Localized, locale: Locale): string {
  return text[locale];
}

export type StampState = 'done' | 'upcoming' | 'unconfirmed';

function periodEnd(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  if (day) return new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
  if (month) return new Date(Date.UTC(year, month, 0, 23, 59, 59));
  return new Date(Date.UTC(year, 11, 31, 23, 59, 59));
}

export function stampState(stamp: Stamp, today: Date): StampState {
  if (stamp.status === 'done') return 'done';
  if (!stamp.date) return 'upcoming';
  return periodEnd(stamp.date) < today ? 'unconfirmed' : 'upcoming';
}

export type ApplyCta = { kind: 'apply'; href: string } | { kind: 'notice'; message: Localized };

export function applyCta(r: Recruitment): ApplyCta {
  return r.status === 'open'
    ? { kind: 'apply', href: r.applyUrl }
    : { kind: 'notice', message: r.nextNotice };
}

function compareStamps(a: Stamp, b: Stamp): number {
  if (a.date && b.date) return a.date.localeCompare(b.date);
  if (a.date) return -1;
  if (b.date) return 1;
  return 0;
}

export async function getStats() {
  return data.stats;
}
export async function getStamps() {
  return [...data.stamps].sort(compareStamps);
}
export async function getGrowthSteps() {
  return [...data.steps].sort((a, b) => a.order - b.order);
}
export async function getPrograms() {
  return data.programs;
}
export async function getMentors() {
  return [...data.mentors].sort((a, b) => Number(b.featured) - Number(a.featured));
}
export async function getPartners() {
  return data.partners;
}
export async function getOfficers() {
  return data.officers;
}
export async function getPress() {
  return [...data.press].sort((a, b) => b.date.localeCompare(a.date));
}
export async function getFaqs() {
  return data.faqs;
}
export async function getBenefits() {
  return data.benefits;
}
export async function getRecruitment() {
  return data.recruitment;
}
