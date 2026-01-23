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
    private readonly REF_IPD_MM = 64.0;

    // V24.0 Stability: Responsive Rolling Buffer (Phase 4)
    private mmPerPixelBuffer: number[] = [];
    private readonly BUFFER_SIZE = 15; // 0.5s at 30fps (Fast enough to track patient leaning in)

    // V25.0 Phase 7: Peak-Hold Filter (Captures true maximum, prevents line retraction)
    private peakOpening: number = 0;
    private peakTimestamp: number = 0;
    private readonly PEAK_HOLD_DURATION = 2000; // 2 seconds
    private readonly PEAK_DECAY_RATE = 0.98; // 2% decay per frame after timeout

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
            const dz = rIris.z - lIris.z;
            ipdPixels = Math.sqrt(dx * dx + dy * dy + dz * dz);
        } else {
            const dx = rEyeFallback.x - lEyeFallback.x;
            const dy = rEyeFallback.y - lEyeFallback.y;
            const dz = rEyeFallback.z - lEyeFallback.z;
            ipdPixels = Math.sqrt(dx * dx + dy * dy + dz * dz) / 1.45;
        }

        const currentMMPerPixel = ipdPixels > 0 ? this.REF_IPD_MM / ipdPixels : 1.0;

        // Rolling Median Filter for the Ruler
        this.mmPerPixelBuffer.push(currentMMPerPixel);
        if (this.mmPerPixelBuffer.length > this.BUFFER_SIZE) this.mmPerPixelBuffer.shift();

        const sorted = [...this.mmPerPixelBuffer].sort((a, b) => a - b);
        const mmPerPixel = sorted[Math.floor(sorted.length / 2)];

        // --- 3. 3D EUCLIDEAN OPENING (Phase 4 - No Projection Loss) ---
        let rawOpening = 0;
        if (cUpperLip && cLowerLip) {
            const dx = cLowerLip.x - cUpperLip.x;
            const dy = cLowerLip.y - cUpperLip.y;
            const dz = cLowerLip.z - cUpperLip.z;
            // Euclidean distance in pixel space captures the full magnitude of the jaw arc
            rawOpening = Math.sqrt(dx * dx + dy * dy + dz * dz) * mmPerPixel;
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

        // --- 5. PEAK-HOLD FILTER (Phase 7: Capture True Maximum) ---
        const now = Date.now();

        if (rawOpening > this.peakOpening) {
            // New peak detected - lock it in
            this.peakOpening = rawOpening;
            this.peakTimestamp = now;
        } else if (now - this.peakTimestamp > this.PEAK_HOLD_DURATION) {
            // After 2s without new peak, gradual decay
            this.peakOpening = Math.max(rawOpening, this.peakOpening * this.PEAK_DECAY_RATE);
        }

        // Use peak value if within hold duration
        const displayOpening = (now - this.peakTimestamp < this.PEAK_HOLD_DURATION)
            ? this.peakOpening
            : rawOpening;

        // Reset peak when mouth closes
        if (rawOpening < 5.0) {
            this.peakOpening = 0;
        }

        // --- 6. HYSTERESIS STATE (Swiss Stabilization V2.6) ---
        // Open Threshold: 5mm | Close Threshold: 2.0mm
        const openingMM = displayOpening < 2.0 ? 0 : displayOpening;
        const deviationMM = rawOpening < 2.0 ? 0 : rawDeviation;
        const isOpen = rawOpening > 5.0;

        return {
            openingMM,
            deviationMM,
            velocity: 0,
            isOpen
        };
    }
}
