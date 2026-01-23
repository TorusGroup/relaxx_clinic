import { ATMLandmark, Plane3D } from './precision-types';
import { VectorMath3D } from './VectorMath3D';

/**
 * Result of a single frame jaw analysis.
 */
export interface JawMetrics {
    openingMM: number;       // Adjusted Vertical Opening
    deviationMM: number;     // Lateral Deviation from Midline
    velocity: number;        // Speed of movement (mm/s)
    isOpen: boolean;
}

/**
 * Bio-mechanical analyzer for Mandibular Kinematics.
 * Uses the Symmetry Plane as the ground truth for "Deviation".
 */
export class JawMovementAnalyzer {

    // Calibration: Average IPD is 64mm.
    // If we have a calibrated pixel-to-mm ratio, we use it.
    // Otherwise, we estimate based on fixed IPD.
    private readonly REF_IPD_MM = 64.0;

    /**
     * Calculates clinical jaw metrics.
     * @param landmarks Filtered ATM landmarks.
     * @param symmetryPlane The Mid-Sagittal Plane (Reference).
     * @param width Canvas width (for aspect ratio/pixel logic if needed).
     * @param height Canvas height (for aspect ratio/pixel logic if needed).
     */
    analyze(
        landmarks: ATMLandmark[],
        symmetryPlane: Plane3D,
        width: number = 640,
        height: number = 480
    ): JawMetrics {
        // --- 1. TILT NEUTRALIZATION (Swiss Watch Logic) ---
        const lEye = landmarks.find(l => l.id === 33);
        const rEye = landmarks.find(l => l.id === 263);
        const nose = landmarks.find(l => l.id === 1); // Nose tip for pivot

        let rollRad = 0;
        let correctedLandmarks = landmarks;

        if (lEye && rEye && nose) {
            rollRad = Math.atan2(rEye.y - lEye.y, rEye.x - lEye.x);
            // Neutralize tilt by rotating everything back
            // Preserving the 'id' property of ATMLandmark
            correctedLandmarks = landmarks.map(p => ({
                ...VectorMath3D.rotatePoint(p, -rollRad, nose),
                id: p.id
            })) as ATMLandmark[];
        }

        // Re-find landmarks in corrected space
        const cLEye = correctedLandmarks.find(l => l.id === 33)!;
        const cREye = correctedLandmarks.find(l => l.id === 263)!;
        const cUpperLip = correctedLandmarks.find(l => l.id === 13)!;
        const cLowerLip = correctedLandmarks.find(l => l.id === 14)!;

        // --- 2. SCALE CALCULATION (Smoothing usually handled by Adapter) ---
        const ipdUnit = VectorMath3D.distance(cLEye, cREye);
        let scaleFactor = ipdUnit > 0 ? this.REF_IPD_MM / ipdUnit : 1.0;

        // --- 3. PORTRAIT COMPENSATION (Swiss Watch Logic V20.5) ---
        // On mobile portrait, vertical pixels are "compressed" compared to horizontal IPD.
        let verticalBonus = 1.0;
        if (height > width) {
            const aspect = height / width;
            verticalBonus = Math.min(aspect, 1.8); // Legacy compensation factor
        }

        // --- 4. AXIAL PROJECTION (Opening) ---
        // Instead of raw 3D distance, we project the jaw movement onto the face's vertical axis.
        // In Neutral Space (correctedLandmarks), the vertical axis is strictly Y.
        let rawOpening = 0;
        if (cUpperLip && cLowerLip) {
            // Projected Y distance * vertical scale bonus
            const dy = (cLowerLip.y - cUpperLip.y);
            rawOpening = dy * scaleFactor * verticalBonus;
        }

        // --- 5. LATERAL DEVIATION ---
        // Since we neutralized tilt, we can use the Symmetry Plane reliably.
        let rawDeviation = 0;
        if (cLowerLip && symmetryPlane) {
            const vecToLip = VectorMath3D.vectorFromPoints(symmetryPlane.point, cLowerLip);
            rawDeviation = VectorMath3D.dotProduct(vecToLip, symmetryPlane.normal) * scaleFactor;
        }

        // 6. Velocity (Placeholder)
        const velocity = 0;

        // Apply "Closed Mouth" Threshold (< 5mm => 0)
        const openingMM = rawOpening < 5.0 ? 0 : rawOpening;
        const deviationMM = rawOpening < 5.0 ? 0 : rawDeviation;

        return {
            openingMM,
            deviationMM,
            velocity,
            isOpen: openingMM > 5.0
        };
    }
}
