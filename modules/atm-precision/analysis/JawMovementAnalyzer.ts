import { ATMLandmark, Plane3D } from '../core/types';
import { VectorMath3D } from '../core/VectorMath3D';

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
     * @param timeDelta Time since last frame (seconds).
     */
    analyze(landmarks: ATMLandmark[], symmetryPlane: Plane3D, timeDelta: number = 0.033): JawMetrics {
        // 1. IPD Calculation (Scale Factor)
        const lEye = landmarks.find(l => l.id === 33);
        const rEye = landmarks.find(l => l.id === 263);

        let scaleFactor = 1.0; // mm per unit

        if (lEye && rEye) {
            const ipdUnit = VectorMath3D.distance(lEye, rEye);
            if (ipdUnit > 0) {
                scaleFactor = this.REF_IPD_MM / ipdUnit;
            }
        }

        // 2. Opening Amplitude (Vertical)
        // We use Upper Lip Inner (13) and Lower Lip Inner (14).
        // But we want the PROJECTED distance onto the Symmetry Plane (Vertical component only).
        // If the head is tilted back (Pitch), raw distance is fine?
        // Actually, simple 3D distance is usually best for "Opening", 
        // as long as we subtract the Closed State (Tare).

        const upperLip = landmarks.find(l => l.id === 13);
        const lowerLip = landmarks.find(l => l.id === 14);

        let rawOpening = 0;
        if (upperLip && lowerLip) {
            rawOpening = VectorMath3D.distance(upperLip, lowerLip) * scaleFactor;
        }

        // 3. Lateral Deviation
        let rawDeviation = 0;
        if (lowerLip && symmetryPlane) {
            const vecToLip = VectorMath3D.vectorFromPoints(symmetryPlane.point, lowerLip);
            rawDeviation = VectorMath3D.dotProduct(vecToLip, symmetryPlane.normal) * scaleFactor;
        }

        // 4. Velocity
        const velocity = 0; // Placeholder

        // Apply "Closed Mouth" Threshold (User request: < 5mm => 0)
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
