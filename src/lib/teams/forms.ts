import { z } from 'zod';

const MB = 1024 * 1024;

// The same numbers as the constraints in supabase/migrations/20261105100000_team_spaces.sql and the
// bucket settings. The forms check first so a person gets a message; the database has the last word.
export const TEAM_LIMITS = {
  name: 50,
  tagline: 80,
  intro: 2000,
  postTitle: 100,
  postBody: 5000,
  links: 5,
  photos: 4,
  photoBytes: 5 * MB,
  logoBytes: 2 * MB,
  coverBytes: 5 * MB,
  // What a person may pick. It is made smaller in the browser before it goes up.
  inputBytes: 30 * MB,
  pageSize: 10,
} as const;

// The types the buckets take, and the extension each one is stored under.
export const PHOTO_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export const TEAM_LINK_KINDS = ['homepage', 'instagram', 'linkedin', 'other'] as const;
export type TeamLinkKind = (typeof TEAM_LINK_KINDS)[number];

export const TEAM_POST_VISIBILITIES = ['public', 'signed_in'] as const;
export type TeamPostVisibility = (typeof TEAM_POST_VISIBILITIES)[number];

// Browsers send a line break in a textarea as CRLF. Saved as LF, so a limit counts what a person
// sees and the database counts the same number.
function longText(max: number) {
  return z
    .string()
    .transform((value) => value.replace(/\r\n/g, '\n').trim())
    .pipe(z.string().max(max, 'tooLong'));
}

function requiredText(max: number) {
  return z.string().trim().min(1, 'required').max(max, 'tooLong');
}

const linkSchema = z.object({
  kind: z.enum(TEAM_LINK_KINDS, { error: 'invalid' }),
  url: z
    .string()
    .trim()
    .max(500, 'tooLong')
    .regex(/^https?:\/\/\S+$/, 'invalidUrl'),
});
export type TeamLink = z.infer<typeof linkSchema>;

export const teamIntroSchema = z.object({
  tagline: longText(TEAM_LIMITS.tagline),
  intro: longText(TEAM_LIMITS.intro),
  links: z.array(linkSchema).max(TEAM_LIMITS.links, 'tooMany'),
});

export const postSchema = z.object({
  title: requiredText(TEAM_LIMITS.postTitle),
  body: longText(TEAM_LIMITS.postBody),
  visibility: z.enum(TEAM_POST_VISIBILITIES, { error: 'invalid' }),
});

export const teamCreateSchema = z.object({
  name: requiredText(TEAM_LIMITS.name),
  cohort: z
    .string()
    .regex(/^[1-9]\d{0,3}$/, 'invalid')
    .transform(Number),
});

export const teamSettingsSchema = teamCreateSchema.extend({
  is_published: z
    .literal('on')
    .optional()
    .transform((value) => value === 'on'),
});

// A team's address is made once, when the team is created, and never changes, so a shared link keeps
// working. What it says matters little: the letters of an English name, or just "team", then a
// random ending that also keeps two teams with the same name apart.
export function makeTeamSlug(name: string, ending = crypto.randomUUID().slice(0, 6)): string {
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
    .replace(/^-+|-+$/g, '');
  return `${words || 'team'}-${ending}`;
}

export function checkPhoto(
  file: { size: number; type: string },
  maxBytes: number,
): 'ok' | 'tooLarge' | 'badType' {
  if (!Object.hasOwn(PHOTO_TYPES, file.type)) return 'badType';
  return file.size > maxBytes ? 'tooLarge' : 'ok';
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const PHOTO_FILE = new RegExp(`^(${UUID})/(${UUID})/${UUID}\\.(jpg|png|webp)$`);

// Whether a path a browser sent back really is a file of this post.
export function isPhotoPathFor(path: string, teamId: string, postId: string): boolean {
  const match = PHOTO_FILE.exec(path);
  return match !== null && match[1] === teamId && match[2] === postId;
}
