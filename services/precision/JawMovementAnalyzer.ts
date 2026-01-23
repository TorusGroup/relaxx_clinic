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
        // --- 1. ASPECT-AWARE PIXEL PROJECTION (Swiss Watch V2.0) ---
        // Normalized coordinates (0-1) are distorted on non-square viewports (Mobile).
        // We project into "Square Pixel Space" to ensure 1 unit X = 1 unit Y physically.
        const pixelLandmarks = landmarks.map(p => ({
            ...p,
            x: p.x * width,
            y: p.y * height,
            z: p.z * width // Z is typically relative to width in MediaPipe
        }));

        const lEye = pixelLandmarks.find(l => l.id === 33);
        const rEye = pixelLandmarks.find(l => l.id === 263);
        const nose = pixelLandmarks.find(l => l.id === 1);

        let rollRad = 0;
        let correctedLandmarks = pixelLandmarks;

        if (lEye && rEye && nose) {
            // Calculate tilt in PIXEL space (Accurate Roll)
            rollRad = Math.atan2(rEye.y - lEye.y, rEye.x - lEye.x);

            // Neutralize tilt
            correctedLandmarks = pixelLandmarks.map(p => ({
                ...VectorMath3D.rotatePoint(p, -rollRad, nose),
                id: p.id
            })) as ATMLandmark[];
        }

        // Re-find landmarks in corrected space
        const cLEye = correctedLandmarks.find(l => l.id === 33)!;
        const cREye = correctedLandmarks.find(l => l.id === 263)!;
        const cUpperLip = correctedLandmarks.find(l => l.id === 13)!;
        const cLowerLip = correctedLandmarks.find(l => l.id === 14)!;

        // --- 2. SCALE CALCULATION (Stable 2D IPD) ---
        // IPD is horizontal, so it's the anchor of our "Ruler".
        const dxIPD = cREye.x - cLEye.x;
        const dyIPD = cREye.y - cLEye.y;
        const ipdPixels = Math.sqrt(dxIPD * dxIPD + dyIPD * dyIPD);

        // Scale Factor: how many MM per PIXEL?
        const mmPerPixel = ipdPixels > 0 ? this.REF_IPD_MM / ipdPixels : 1.0;

        // --- 3. AXIAL PROJECTION (Opening in Pixel Space) ---
        let rawOpening = 0;
        if (cUpperLip && cLowerLip) {
            // Movement strictly along the Face's Vertical Axis
            // Since we neutralized tilt, the vertical axis is now strictly Y+.
            const dy = (cLowerLip.y - cUpperLip.y);
            rawOpening = dy * mmPerPixel;
        }

        // --- 4. LATERAL DEVIATION (Pixel Space) ---
        let rawDeviation = 0;
        if (cLowerLip && symmetryPlane) {
            // Convert plane point to pixel space for fair comparison
            const planePointPx = {
                x: symmetryPlane.point.x * width,
                y: symmetryPlane.point.y * height,
                z: symmetryPlane.point.z * width
            };

            const vecToLip = VectorMath3D.vectorFromPoints(planePointPx, cLowerLip);
            // normal is unit vector, so dot product gives projected pixel distance
            rawDeviation = VectorMath3D.dotProduct(vecToLip, symmetryPlane.normal) * mmPerPixel;
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
