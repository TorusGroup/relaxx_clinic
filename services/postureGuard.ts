import { Landmark } from '../types';
import { calculateRollAngle, toDegrees, distance } from '../utils/geometry';
import { LANDMARK_INDICES } from '../constants';

export interface PostureResult {
    warning: string | null;
    rollDeg: number;
}

export class PostureGuard {
    // Constants for thresholds
    private static readonly MAX_TILT = 8; // degrees
    private static readonly MAX_YAW = 0.30; // 30% asymmetry
    private static readonly MIN_COVERAGE = 0.15; // Too far
    private static readonly MAX_COVERAGE = 0.65; // Too close

    /**
     * Checks for critical posture violations: Tilt (Roll), Rotation (Yaw), and Distance (Z).
     * Returns a warning string if any threshold is violated, or null if compliant.
     */
    static check(landmarks: Landmark[], canvasWidth: number): PostureResult {
        // 1. HEAD ROLL (TILT)
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const rollRad = calculateRollAngle(leftEye, rightEye);
        const rollDeg = toDegrees(rollRad);

        // 2. HEAD YAW (ROTATION)
        const noseTip = landmarks[1];
        const leftCheek = landmarks[234];
        const rightCheek = landmarks[454];

        // We use cheek distance assymetry as a proxy for yaw
        const dLeft = distance(noseTip, leftCheek);
        const dRight = distance(noseTip, rightCheek);
        const yawRatio = Math.abs(dLeft - dRight) / Math.max(dLeft, dRight);

        // 3. DEPTH (DISTANCE / COVERAGE)
        // Approximate face width in pixels
        const faceWidthPx = distance(leftCheek, rightCheek) * canvasWidth;
        const coverageRatio = faceWidthPx / canvasWidth;

        let warning: string | null = null;

        // Prioritize warnings: Tilt > Yaw > Distance
        if (Math.abs(rollDeg) > this.MAX_TILT) {
            warning = "CABEÇA INCLINADA ⚠️";
        } else if (yawRatio > this.MAX_YAW) {
            warning = "OLHE PARA FRENTE ⚠️";
        } else if (coverageRatio < this.MIN_COVERAGE) {
            warning = "APROXIME-SE 📷";
        } else if (coverageRatio > this.MAX_COVERAGE) {
            warning = "AFASTE-SE 📷";
        }

        return { warning, rollDeg };
    }
}
