
export interface Point {
    x: number;
    y: number;
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
