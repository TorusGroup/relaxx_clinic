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
    projectOpeningAcrossAxis(
        upper: Landmark,
        lower: Landmark,
        perpAngle: number,
        currentIPD: number
    ) {
        // 1. Face Y-Axis Unit Vector
        const axisVec = {
            x: Math.cos(perpAngle),
            y: Math.sin(perpAngle)
        };

        // 2. Vector from Upper Lip to Lower Lip
        const lipVec = {
            x: lower.x - upper.x,
            y: lower.y - upper.y
        };

        // 3. Scalar Projection (Dot Product)
        const amplitudeScalar = (lipVec.x * axisVec.x) + (lipVec.y * axisVec.y);

        // 4. Projected Point for Visualization
        const projectedPoint = {
            x: upper.x + (axisVec.x * amplitudeScalar),
            y: upper.y + (axisVec.y * amplitudeScalar),
            z: lower.z
        };

        // 5. Millimeters using clinical reference (65mm IPD)
        const amplitudeMM = (amplitudeScalar / currentIPD) * 65;

        return {
            projectedPoint,
            amplitudeMM,
            amplitudeScalar
        };
    }
}
