// A query value that is one string. Repeated parameters (`?edit=1&edit=2`) arrive as a list and
// count as absent: nobody has a reason to send two.
export function single(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
