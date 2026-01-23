import { OneEuroFilter } from '../utils/oneEuroFilter';
import { Landmark } from '../types';
import { median } from '../utils/geometry';

/**
 * V21.0 "Swiss Watch" Biometric Stabilizer - Clinical Precision Edition
 * Encapsulates filtering, recursive buffering, axial projection, and now Adaptive Stability.
 */
export class BiometricStabilizer {
    private filters: Map<number, { x: OneEuroFilter, y: OneEuroFilter, z: OneEuroFilter }> = new Map();
    private metricBuffer: number[] = [];
    private lastDisplayedMetric: number = 0;
    private stabilityCounter: number = 0;

    // V21.0: IPD Smoothing Buffer
    private ipdBuffer: number[] = [];
    private readonly IPD_BUFFER_SIZE = 60; // ~2 seconds @ 30fps

    // V19 TUNING: High-Response Mode (Standard)
    private readonly BUFFER_SIZE = 5;
    private readonly STABILITY_LIMIT = 8;
    private readonly BETA_LIP = 0.15;
    private readonly MIN_CUTOFF_LIP = 0.1;

    // V21.0 TUNING: Clinical Precision Mode (Adaptive)
    private readonly BETA_STABLE = 0.005; // Extreme smoothing when still
    private readonly VELOCITY_THRESHOLD = 0.002; // Threshold to detect "Stillness"

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
     * V21.0: Updates the IPD buffer and returns the smoothed Median IPD.
     * Prevents "Scale Breathing" (Z-axis jitter).
     */
    updateIPD(rawIPD: number): number {
        if (rawIPD <= 0) return 0.06; // Failsafe

        if (this.ipdBuffer.length >= this.IPD_BUFFER_SIZE) {
            this.ipdBuffer.shift();
        }
        this.ipdBuffer.push(rawIPD);

        return median(this.ipdBuffer);
    }

    /**
     * V21.0: Adaptive Amplitude Stabilization
     * Switches between "Responsive" and "Pinned" based on lip velocity.
     */
    stabilizeAmplitudeAdaptive(rawAmp: number, useAdaptive: boolean): number {
        // Manage Buffer
        if (this.metricBuffer.length >= this.BUFFER_SIZE) {
            this.metricBuffer.shift();
        }
        this.metricBuffer.push(rawAmp);

        const medianAmp = median(this.metricBuffer);

        if (!useAdaptive) {
            // STANDARD MODE: Hysteresis Logic
            const delta = Math.abs(medianAmp - this.lastDisplayedMetric);
            if (delta > 0.4 || this.stabilityCounter++ > this.STABILITY_LIMIT) {
                this.lastDisplayedMetric = medianAmp;
                this.stabilityCounter = 0;
            }
            return this.lastDisplayedMetric;
        }

        // PRECISION MODE: Adaptive Logic
        // Check velocity of Lip filters (Indices 13, 14) if they exist
        let isMoving = true;

        // We look at the derivative (dx) of the filters
        const fUpper = this.filters.get(13);
        const fLower = this.filters.get(14);

        if (fUpper && fLower) {
            const vUpper = Math.sqrt(Math.pow(fUpper.y.dx.lastValue(), 2)); // Vertical velocity
            const vLower = Math.sqrt(Math.pow(fLower.y.dx.lastValue(), 2));

            // Combined velocity (avg)
            const velocity = (vUpper + vLower) / 2;

            // If velocity is below threshold, user is holding breath -> STABILIZE
            if (velocity < this.VELOCITY_THRESHOLD) {
                isMoving = false;
            }
        }

        // If NOT moving, we "Pin" the value stronger (Low Beta effect simulated by ignoring small updates)
        const threshold = isMoving ? 0.2 : 1.0; // Needs 1.0mm change to update if still

        const delta = Math.abs(medianAmp - this.lastDisplayedMetric);

        // Update if change is significant OR if we force an update eventually
        if (delta > threshold || (isMoving && this.stabilityCounter++ > 5)) {
            this.lastDisplayedMetric = medianAmp;
            this.stabilityCounter = 0;
        }

        return this.lastDisplayedMetric;
    }

    /**
     * Legacy Wrapper for Standard Mode
     */
    stabilizeAmplitude(rawAmp: number): number {
        return this.stabilizeAmplitudeAdaptive(rawAmp, false);
    }

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

        // 5. V20.5: PORTRAIT COMPENSATOR (Visual & Metric)
        // We apply the compensation to the Pixel Vector length so the White Line
        // visually matches the corrected Metric number.
        let compensatedAmplitudePx = amplitudePx;

        if (height > width) {
            const aspectRatio = height / width;
            const compensation = Math.min(aspectRatio, 1.8);
            compensatedAmplitudePx *= compensation;
        }

        // 6. Calculate Projected Point (Using COMPENSATED length)
        const projectedPx = {
            x: upperPx.x + (axisVec.x * compensatedAmplitudePx),
            y: upperPx.y + (axisVec.y * compensatedAmplitudePx)
        };

        const projectedPoint = {
            x: projectedPx.x / width,
            y: projectedPx.y / height,
            z: lower.z
        };

        // 7. Millimeters using clinical reference (65mm IPD)
        // Uses the compensated pixel length for true metric
        const amplitudeMM = (compensatedAmplitudePx / pixelIPD) * 65;

        return {
            projectedPoint,
            amplitudeMM,
            amplitudePx
        };
    }
}
