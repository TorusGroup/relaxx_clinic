import { DiagnosticMetrics, TelemetryData } from '../types';

// CONSTANTS (Based on Clinical Spec)
const CLICK_VELOCITY_THRESHOLD = 0.5; // mm/ms (High speed jump = Click)
const SMOOTHNESS_WEIGHT = 0.2;
const SYMMETRY_WEIGHT = 0.3;
const RANGE_WEIGHT = 0.4;
const POSTURE_WEIGHT = 0.1;

export interface BiomechanicsResult {
    velocity: number; // mm/frame or mm/ms
    acceleration: number;
    isClick: boolean;
}

/**
 * Calculates instantaneous velocity and detects abrupt movements (clicks/pops).
 * @param currentPos Current vertical/lateral position (mm)
 * @param prevPos Previous position (mm)
 * @param timeDelta Time elapsed (ms)
 */
export const analyzeMotion = (
    currentPos: { x: number, y: number },
    prevPos: { x: number, y: number },
    timeDelta: number = 33 // Default to ~30fps
): BiomechanicsResult => {
    if (timeDelta <= 0) return { velocity: 0, acceleration: 0, isClick: false };

    // Euclidean distance moved
    const dist = Math.sqrt(
        Math.pow(currentPos.x - prevPos.x, 2) +
        Math.pow(currentPos.y - prevPos.y, 2)
    );

    const velocity = dist / timeDelta; // mm/ms

    // Simple heuristic: If velocity exceeds humanly smooth limit, it's a mechanical "pop"
    // Normal jaw opening speed is ~100-300mm/s (0.1-0.3 mm/ms). 
    // A click is an instantaneous release of energy.
    const isClick = velocity > CLICK_VELOCITY_THRESHOLD;

    return {
        velocity,
        acceleration: 0, // Need 3 points for accel, keeping simple for now
        isClick
    };
};

/**
 * Calculates the "ATM Health Score" (0-100) based on weighted multi-factor analysis.
 * Should be run at the end of the session.
 */
export const calculateATMScore = (metrics: DiagnosticMetrics): number => {
    // 1. Range Score (Ideal: 40-55mm)
    let rangeScore = 0;
    if (metrics.openingAmplitude >= 40 && metrics.openingAmplitude <= 55) rangeScore = 100;
    else if (metrics.openingAmplitude < 40) rangeScore = (metrics.openingAmplitude / 40) * 80; // Limited
    else rangeScore = 100 - ((metrics.openingAmplitude - 55) * 2); // Hyper

    // 2. Symmetry Score (Ideal: Deviation < 3mm)
    let symmetryScore = 0;
    const absDev = Math.abs(metrics.lateralDeviation);
    if (absDev <= 2) symmetryScore = 100;
    else symmetryScore = Math.max(0, 100 - (absDev * 10)); // Lose 10pts per mm off

    // 3. Smoothness (Placeholder until we have full jerk integration)
    const smoothnessScore = 85; // Assume relatively smooth unless flagged

    // 4. Posture (Vertical Alignment)
    const postureScore = Math.max(0, 100 - (Math.abs(metrics.verticalAlignment) * 5));

    // Weighted Average
    const total = (
        (rangeScore * RANGE_WEIGHT) +
        (symmetryScore * SYMMETRY_WEIGHT) +
        (smoothnessScore * SMOOTHNESS_WEIGHT) +
        (postureScore * POSTURE_WEIGHT)
    );

    return Math.round(total);
};
