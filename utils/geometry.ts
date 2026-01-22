
export interface Point {
    x: number;
    y: number;
    z?: number;
}

/**
 * Chaikin's Algorithm for Corner Cutting (Smoothing)
 * Iteratively replaces corners with two new points, creating a smooth curve.
 * @param points Input polygon/polyline
 * @param iterations Number of smoothing passes (2-3 is usually sufficient)
 * @param closed Whether the path is a closed loop
 */
export function chaikinSmooth(points: Point[], iterations: number = 2, closed: boolean = false): Point[] {
    if (points.length < 3) return points;

    let currentPoints = [...points];

    for (let i = 0; i < iterations; i++) {
        const newPoints: Point[] = [];
        const len = closed ? currentPoints.length : currentPoints.length - 1;

        if (!closed) newPoints.push(currentPoints[0]); // Keep start

        for (let j = 0; j < len; j++) {
            const p1 = currentPoints[j];
            const p2 = currentPoints[(j + 1) % currentPoints.length];

            // Cut at 25% and 75%
            newPoints.push({
                x: 0.75 * p1.x + 0.25 * p2.x,
                y: 0.75 * p1.y + 0.25 * p2.y
            });
            newPoints.push({
                x: 0.25 * p1.x + 0.75 * p2.x,
                y: 0.25 * p1.y + 0.75 * p2.y
            });
        }

        if (!closed) newPoints.push(currentPoints[currentPoints.length - 1]); // Keep end
        currentPoints = newPoints;
    }

    return currentPoints;
}

/**
 * Calculates the angle (in radians) between two points relative to horizontal.
 * Used for Head Roll detection (Eyes or Tragus).
 */
export const calculateRollAngle = (p1: Point, p2: Point): number => {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
};

/**
 * Rotates a point around a center by a given angle (radians).
 * Used to correct Head Tilt before metric calculation.
 */
export const rotatePoint = (point: Point, angle: number, center: Point = { x: 0, y: 0 }): Point => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = point.x - center.x;
    const dy = point.y - center.y;

    return {
        x: center.x + (dx * cos - dy * sin),
        y: center.y + (dx * sin + dy * cos),
        z: point.z // Pass through Z unchanged
    };
};

/**
 * Calculates Euclidean distance between two points.
 */
export const distance = (p1: Point, p2: Point): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

/**
 * Converts degrees to radians.
 */
export const toRadians = (deg: number): number => deg * (Math.PI / 180);

/**
 * Converts radians to degrees.
 */
export const toDegrees = (rad: number): number => rad * (180 / Math.PI);
/**
 * Calculates the median of an array of numbers.
 * Used for recursive buffering of metrics.
 */
export const median = (values: number[]): number => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
