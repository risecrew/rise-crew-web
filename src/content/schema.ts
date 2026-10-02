import { z } from 'zod';

const text = z.string().trim().min(1);
const id = z.string().regex(/^[a-z0-9-]+$/, 'ids are lowercase kebab-case');
const isoDate = z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'use YYYY, YYYY-MM or YYYY-MM-DD');

export const localizedSchema = z.object({ ko: text, en: text });
const shortText = text.max(24, 'keep stamp labels to 24 characters');
const shortLocalizedSchema = z.object({ ko: shortText, en: shortText });
export type Localized = z.infer<typeof localizedSchema>;

export const stageSchema = z.enum(['campus', 'domestic', 'global']);
export type Stage = z.infer<typeof stageSchema>;

export const statSchema = z.object({
  id,
  value: text,
  label: localizedSchema,
  basis: localizedSchema,
});
export type Stat = z.infer<typeof statSchema>;

const evidenceSchema = z.object({
  kind: z.enum(['press', 'photo', 'link', 'document']),
  label: localizedSchema,
  url: z.url().optional(),
});

export const stampSchema = z
  .object({
    id,
    date: isoDate.optional(),
    city: localizedSchema,
    country: z.string().regex(/^[A-Z]{2}$/, 'ISO 3166-1 alpha-2'),
    title: localizedSchema,
    label: shortLocalizedSchema,
    stage: stageSchema,
    status: z.enum(['done', 'planned']),
    evidence: z.array(evidenceSchema),
  })
  .superRefine((stamp, ctx) => {
    if (stamp.status === 'done' && stamp.evidence.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['evidence'], message: 'a done stamp needs evidence' });
    }
  });
export type Stamp = z.infer<typeof stampSchema>;

export const growthStepSchema = z.object({
  id,
  order: z.number().int().min(1),
  name: localizedSchema,
  summary: localizedSchema,
});
export type GrowthStep = z.infer<typeof growthStepSchema>;

export const programSchema = z.object({
  id,
  stage: stageSchema,
  name: localizedSchema,
  summary: localizedSchema,
  details: z.array(localizedSchema),
});
export type Program = z.infer<typeof programSchema>;

export const mentorSchema = z.object({
  id,
  name: localizedSchema,
  org: localizedSchema,
  role: localizedSchema,
  expertise: z.array(localizedSchema).min(1),
  featured: z.boolean(),
  photo: z.string().startsWith('/images/').optional(),
});
export type Mentor = z.infer<typeof mentorSchema>;

export const partnerSchema = z
  .object({
    id,
    name: localizedSchema,
    kind: z.enum(['supporter', 'company', 'university', 'program']),
    url: z.url().optional(),
    logo: z.string().startsWith('/').optional(),
    logoApproved: z.boolean(),
  })
  .superRefine((partner, ctx) => {
    if (partner.logo && !partner.logoApproved) {
      ctx.addIssue({ code: 'custom', path: ['logo'], message: 'logo needs approval' });
    }
  });
export type Partner = z.infer<typeof partnerSchema>;

export const officerSchema = z
  .object({
    id,
    role: localizedSchema,
    name: localizedSchema.optional(),
    photo: z.string().startsWith('/images/').optional(),
    consent: z.boolean(),
  })
  .superRefine((officer, ctx) => {
    if (!officer.consent && (officer.name || officer.photo)) {
      ctx.addIssue({ code: 'custom', path: ['consent'], message: 'name or photo needs consent' });
    }
  });
export type Officer = z.infer<typeof officerSchema>;

export const pressSchema = z.object({
  id,
  outlet: localizedSchema,
  date: isoDate,
  title: text,
  url: z.url().optional(),
});
export type Press = z.infer<typeof pressSchema>;

export const faqSchema = z.object({ id, question: localizedSchema, answer: localizedSchema });
export type Faq = z.infer<typeof faqSchema>;

export const benefitSchema = z.object({ id, title: localizedSchema, body: localizedSchema });
export type Benefit = z.infer<typeof benefitSchema>;

export const recruitmentSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('open'),
    period: localizedSchema,
    applyUrl: z.url(),
    nextNotice: localizedSchema.optional(),
  }),
  z.object({ status: z.literal('closed'), nextNotice: localizedSchema }),
]);
export type Recruitment = z.infer<typeof recruitmentSchema>;
