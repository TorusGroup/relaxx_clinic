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
    private readonly REF_IPD_MM = 64.0;

    // V23.0 Stability: Rolling Buffer for the IPD Ruler
    private mmPerPixelBuffer: number[] = [];
    private readonly BUFFER_SIZE = 60; // 2 seconds at 30fps

    /**
     * Calculates clinical jaw metrics.
     */
    analyze(
        landmarks: ATMLandmark[],
        symmetryPlane: Plane3D,
        width: number = 640,
        height: number = 480
    ): JawMetrics {
        // --- 1. ASPECT-AWARE PIXEL PROJECTION ---
        const pixelLandmarks = landmarks.map(p => ({
            ...p,
            x: p.x * width,
            y: p.y * height,
            z: p.z * width
        }));

        const lEye = pixelLandmarks.find(l => l.id === 33);
        const rEye = pixelLandmarks.find(l => l.id === 263);
        const nose = pixelLandmarks.find(l => l.id === 1);

        let rollRad = 0;
        let correctedLandmarks = pixelLandmarks;

        if (lEye && rEye && nose) {
            rollRad = Math.atan2(rEye.y - lEye.y, rEye.x - lEye.x);
            correctedLandmarks = pixelLandmarks.map(p => ({
                ...VectorMath3D.rotatePoint(p, -rollRad, nose),
                id: p.id
            })) as ATMLandmark[];
        }

        const lIris = correctedLandmarks.find(l => l.id === 468);
        const rIris = correctedLandmarks.find(l => l.id === 473);
        const lEyeFallback = correctedLandmarks.find(l => l.id === 33)!;
        const rEyeFallback = correctedLandmarks.find(l => l.id === 263)!;

        const cUpperLip = correctedLandmarks.find(l => l.id === 13)!;
        const cLowerLip = correctedLandmarks.find(l => l.id === 14)!;

        // --- 2. DAMPENED SCALE CALCULATION (Swiss Watch V23.1 - Iris Scale) ---
        // We use Iris dist (468/473) as the reference for 64mm.
        // If irises missing, fallback to corners (33/263) with compensation factor.
        let ipdPixels = 0;
        if (lIris && rIris) {
            const dx = rIris.x - lIris.x;
            const dy = rIris.y - lIris.y;
            ipdPixels = Math.sqrt(dx * dx + dy * dy);
        } else {
            const dx = rEyeFallback.x - lEyeFallback.x;
            const dy = rEyeFallback.y - lEyeFallback.y;
            ipdPixels = Math.sqrt(dx * dx + dy * dy) / 1.45;
        }

        const currentMMPerPixel = ipdPixels > 0 ? this.REF_IPD_MM / ipdPixels : 1.0;

        // Rolling Median Filter for the Ruler
        this.mmPerPixelBuffer.push(currentMMPerPixel);
        if (this.mmPerPixelBuffer.length > this.BUFFER_SIZE) this.mmPerPixelBuffer.shift();

        const sorted = [...this.mmPerPixelBuffer].sort((a, b) => a - b);
        const mmPerPixel = sorted[Math.floor(sorted.length / 2)];

        // --- 3. AXIAL PROJECTION (Opening) ---
        let rawOpening = 0;
        if (cUpperLip && cLowerLip) {
            const dy = (cLowerLip.y - cUpperLip.y);
            rawOpening = dy * mmPerPixel;
        }

        // --- 4. LATERAL DEVIATION ---
        let rawDeviation = 0;
        if (cLowerLip && symmetryPlane) {
            const planePointPx = {
                x: symmetryPlane.point.x * width, y: symmetryPlane.point.y * height, z: symmetryPlane.point.z * width
            };
            const vecToLip = VectorMath3D.vectorFromPoints(planePointPx, cLowerLip);
            rawDeviation = VectorMath3D.dotProduct(vecToLip, symmetryPlane.normal) * mmPerPixel;
        }

        // --- 5. HYSTERESIS STATE (Swiss Stabilization V2.5) ---
        // Open Threshold: 5mm | Close Threshold: 2.5mm
        const openingMM = rawOpening < 2.5 ? 0 : rawOpening;
        const deviationMM = rawOpening < 2.5 ? 0 : rawDeviation;
        const isOpen = rawOpening > 5.0;

        return {
            openingMM,
            deviationMM,
            velocity: 0,
            isOpen
        };
    }
}
