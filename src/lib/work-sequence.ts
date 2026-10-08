/**
 * The works either side of one in the collection, in file order, wrapping at both ends
 * so neither step is ever a dead end. The artwork view carries no header, so these are
 * how a visitor keeps browsing instead of going back to the grid.
 *
 * A single work, or a slug the collection does not hold, has no neighbours: there is
 * nothing to step to, so the view renders no controls rather than a broken one.
 */
export function workNeighbours<T extends { slug: string }>(works: readonly T[], slug: string): { previous?: T; next?: T } {
  if (works.length < 2) return {}
  const index = works.findIndex((work) => work.slug === slug)
  if (index < 0) return {}
  return {
    previous: works[(index - 1 + works.length) % works.length],
    next: works[(index + 1) % works.length],
  }
}
