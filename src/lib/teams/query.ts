import { isTeamField, type TeamField } from './fields';

export type TeamsQuery = { field: TeamField | null; cohort: number | null; page: number };

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// A plain positive number small enough for an integer column, or null.
function positive(value: string | undefined): number | null {
  return value !== undefined && /^[1-9]\d{0,8}$/.test(value) ? Number(value) : null;
}

// Anything odd in the address is ignored, so a mistyped link still shows the list.
export function parseTeamsQuery(params: Params): TeamsQuery {
  const field = first(params.field);
  return {
    field: isTeamField(field) ? field : null,
    cohort: positive(first(params.cohort)),
    page: positive(first(params.page)) ?? 1,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}
