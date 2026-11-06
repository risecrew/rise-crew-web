// The fields a team can pick. A fixed list in the code, not a table: changing it is a rare decision
// for the club, and the database only checks the shape of the value.
export const TEAM_FIELDS = [
  'ai-software',
  'edutech',
  'healthcare',
  'foodtech',
  'lifestyle',
  'commerce-marketing',
  'mobility',
  'other',
] as const;

export type TeamField = (typeof TEAM_FIELDS)[number];

export function isTeamField(value: unknown): value is TeamField {
  return (TEAM_FIELDS as readonly unknown[]).includes(value);
}
