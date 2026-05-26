export interface Point {
  x: number;
  y: number;
}

/**
 * Simple orthogonal routing for Phase 3:
 * source -> horizontal midpoint -> vertical align -> target.
 */
export function buildOrthogonalPath(source: Point, target: Point): Point[] {
  const midX = source.x + (target.x - source.x) / 2;
  return [
    source,
    { x: midX, y: source.y },
    { x: midX, y: target.y },
    target,
  ];
}

export function toSvgPath(points: Point[]): string {
  if (points.length === 0) return '';
  const [start, ...rest] = points;
  let d = `M ${start.x} ${start.y}`;
  for (const point of rest) {
    d += ` L ${point.x} ${point.y}`;
  }
  return d;
}
