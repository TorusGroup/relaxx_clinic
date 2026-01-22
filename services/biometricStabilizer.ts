import { OneEuroFilter } from '../utils/oneEuroFilter';
import { Landmark } from '../types';
import { median } from '../utils/geometry';

/**
 * V19 "Swiss Watch" Biometric Stabilizer
 * Encapsulates filtering, recursive buffering, and axial projection.
 */
export class BiometricStabilizer {
    private filters: Map<number, { x: OneEuroFilter, y: OneEuroFilter, z: OneEuroFilter }> = new Map();
    private metricBuffer: number[] = [];
    private lastDisplayedMetric: number = 0;
    private stabilityCounter: number = 0;

    // V19 TUNING: High-Response Mode
    private readonly BUFFER_SIZE = 5;       // Latency halved (10 -> 5)
    private readonly STABILITY_LIMIT = 8;   // Snappier HUD (15 -> 8)
    private readonly BETA_LIP = 0.15;       // Fast snapping (0.05 -> 0.15)
    private readonly MIN_CUTOFF_LIP = 0.1;  // Precision at rest

    /**
     * Returns a tuned filter for a specific landmark index.
     */
    getFilter(idx: number, isLipOrBone: boolean) {
        if (!this.filters.has(idx)) {
            const minCutoff = isLipOrBone ? this.MIN_CUTOFF_LIP : 1.0;
            const beta = isLipOrBone ? this.BETA_LIP : 0.001;

            this.filters.set(idx, {
                x: new OneEuroFilter(30, minCutoff, beta, 1),
                y: new OneEuroFilter(30, minCutoff, beta, 1),
                z: new OneEuroFilter(30, minCutoff, beta, 1)
            });
        }
        return this.filters.get(idx)!;
    }

    /**
     * Applies recursive median filtering to a raw amplitude value.
     */
    stabilizeAmplitude(rawAmp: number): number {
        if (this.metricBuffer.length >= this.BUFFER_SIZE) {
            this.metricBuffer.shift();
        }
        this.metricBuffer.push(rawAmp);

        const medianAmp = median(this.metricBuffer);
        const delta = Math.abs(medianAmp - this.lastDisplayedMetric);

        // Hysteresis: Update if change is significant (>0.4u) OR stability timeout
        if (delta > 0.4 || this.stabilityCounter++ > this.STABILITY_LIMIT) {
            this.lastDisplayedMetric = medianAmp;
            this.stabilityCounter = 0;
        }

        return this.lastDisplayedMetric;
    }

    /**
     * Calculates the axial projection (opening) onto the face vertical axis.
     */
    /**
     * Calculates the axial projection (opening) onto the face vertical axis using PIXEL SPACE.
     * Fixing Aspect Ratio distortion (Mobile Portrait vs Desktop Landscape).
     */
    projectOpeningAcrossAxis(
        upper: Landmark,
        lower: Landmark,
        perpAngle: number,
        pixelIPD: number, // Now requires IPD in pixels
        width: number,
        height: number
    ) {
        // 1. Convert Landmarks to Pixel Space
        const upperPx = { x: upper.x * width, y: upper.y * height };
        const lowerPx = { x: lower.x * width, y: lower.y * height };

        // 2. Face Y-Axis Unit Vector (Angle is preserved in 2D plane)
        const axisVec = {
            x: Math.cos(perpAngle),
            y: Math.sin(perpAngle)
        };

        // 3. Vector from Upper Lip to Lower Lip (in Pixels)
        const lipVecPx = {
            x: lowerPx.x - upperPx.x,
            y: lowerPx.y - upperPx.y
        };

        // 4. Scalar Projection (Dot Product in Pixels)
        // This represents the "Pixel Opening" along the axis
        const amplitudePx = (lipVecPx.x * axisVec.x) + (lipVecPx.y * axisVec.y);

        // 5. Calculate Projected Point (Back to Normalized for Visualization)
        // We project in pixels, then normalize back to 0..1 for the Visualizer to draw
        const projectedPx = {
            x: upperPx.x + (axisVec.x * amplitudePx),
            y: upperPx.y + (axisVec.y * amplitudePx)
        };

        const projectedPoint = {
            x: projectedPx.x / width,
            y: projectedPx.y / height,
            z: lower.z
        };

        // 6. Millimeters using clinical reference (65mm IPD)
        // Ratio is now (Pixel Opening / Pixel IPD) * 65mm
        // This is Aspect Ratio Invariant!
        const amplitudeMM = (amplitudePx / pixelIPD) * 65;

        return {
            projectedPoint,
            amplitudeMM,
            amplitudePx
        };
    }
}
