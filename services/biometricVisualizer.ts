import { Landmark } from '../types';
import { COLORS } from '../constants';
import { chaikinSmooth, calculateRollAngle } from '../utils/geometry';

export class BiometricVisualizer {
    private ctx: CanvasRenderingContext2D;
    private width: number;
    private height: number;

    constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
    }

    /**
     * Clears the canvas.
     */
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    /**
     * Draws a point on the canvas (Mirrored X for selfie view).
     */
    drawPoint(p: Landmark, size = 1.5, color = COLORS.RELAXX_GREEN) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        // Mirror X: (1 - p.x)
        this.ctx.arc((1 - p.x) * this.width, p.y * this.height, size, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    /**
     * Draws a line between two points (Mirrored X for selfie view).
     */
    drawLine(p1: Landmark, p2: Landmark, color = COLORS.RELAXX_GREEN, alpha = 0.4, lineWidth = 2) {
        this.ctx.globalAlpha = alpha;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo((1 - p1.x) * this.width, p1.y * this.height);
        this.ctx.lineTo((1 - p2.x) * this.width, p2.y * this.height);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0; // Reset
    }

    /**
     * Draws the procedural hyper-smooth jawline.
     */
    drawJawbase(jawPoints: { x: number, y: number }[]) {
        // Hyper-Smooth for a liquid clinical look
        const smoothJaw = chaikinSmooth(jawPoints, 3, false);

        if (smoothJaw.length > 2) {
            this.ctx.beginPath();
            this.ctx.moveTo(smoothJaw[0].x, smoothJaw[0].y);
            for (let i = 1; i < smoothJaw.length; i++) {
                this.ctx.lineTo(smoothJaw[i].x, smoothJaw[i].y);
            }
            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = '#00FF66';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = 'rgba(0, 255, 102, 0.4)';
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.stroke();

            // Reset shadows
            this.ctx.shadowBlur = 0;
            this.ctx.shadowColor = 'transparent';
        }
    }

    /**
     * Visualizes the Clinical Reference Axis (Green Midline).
     */
    drawReferenceAxis(lEye: Landmark, rEye: Landmark) {
        // --- ASPECT-AWARE TILT CALCULATION ---
        // Project landmarks into Pixel Space for accurate angle math
        const lPx = { x: lEye.x * this.width, y: lEye.y * this.height };
        const rPx = { x: rEye.x * this.width, y: rEye.y * this.height };

        // Calculate roll in Pixel Space (Corrects for Mobile 9:16 stretch)
        const eyeAnglePx = Math.atan2(rPx.y - lPx.y, rPx.x - lPx.x);

        const midlineLen = 0.25; // Constant length down (units)
        const midEye: Landmark = {
            x: (lEye.x + rEye.x) / 2,
            y: (lEye.y + rEye.y) / 2,
            z: (lEye.z + rEye.z) / 2
        };

        // Project midline perpendicular to corrected eye angle
        const perpAngle = eyeAnglePx + Math.PI / 2;

        // Final position in Normalized space for drawLine
        // We use Aspect-Matching multipliers to ensure the line is truly perpendicular in visual pixels
        const midlineEnd: Landmark = {
            x: midEye.x + (Math.cos(perpAngle) * midlineLen) * (this.height / this.width),
            y: midEye.y + Math.sin(perpAngle) * midlineLen,
            z: midEye.z
        };

        this.drawLine(midEye, midlineEnd, COLORS.RELAXX_GREEN, 0.4);
        return perpAngle;
    }

    /**
     * Draws the V19 Axial Projection visualization (White Line + Red Strut).
     */
    drawAxialProjection(upperLip: Landmark, lowerLip: Landmark, projectedPoint: Landmark) {
        // DRAW AXIAL AMPLITUDE LINE
        this.drawLine(upperLip, projectedPoint, '#FFFFFF', 1.0);
        this.drawPoint(upperLip, 2, '#FFFFFF');
        this.drawPoint(projectedPoint, 2, '#FFFFFF');

        // DRAW DEVIATION STRUT (Connecting axial projection to actual center)
        // V20.6: Subtle Deviation Line to reduce visual clutter
        this.drawLine(projectedPoint, lowerLip, '#FF3333', 0.4, 1.5);
        this.drawPoint(lowerLip, 2, '#FF3333');
    }

    /**
     * Draws the Metric HUD text directly on the canvas.
     */
    drawMetrics(upperLip: Landmark, amplitude: number, deviation: number) {
        const textX = ((1 - upperLip.x) * this.width) + 20;
        const textY = (upperLip.y * this.height);

        this.ctx.font = "600 12px 'JetBrains Mono'";
        this.ctx.fillStyle = "rgba(0, 255, 102, 0.9)";
        this.ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        this.ctx.shadowBlur = 4;

        this.ctx.fillText(`AMP: ${amplitude.toFixed(1)}u`, textX, textY);

        if (Math.abs(deviation) > 1) {
            this.ctx.fillStyle = Math.abs(deviation) > 5 ? "#FF3333" : "rgba(255, 255, 255, 0.8)";
            this.ctx.fillText(`DEV: ${deviation.toFixed(1)}u`, textX, textY + 16);
        }

        // Reset shadows
        this.ctx.shadowBlur = 0;
    }

    /**
     * Draws debug information for diagnosis.
     */
    /**
     * Draws debug information for diagnosis.
     */
    drawDebugInfo(
        width: number,
        height: number,
        pixelIPD: number,
        amplitudePx: number,
        rollDeg: number,
        rawFps: number
    ) {
        // CENTERED OVERLAY to guarantee visibility on Mobile
        const x = width / 2 - 60;
        let y = height / 2 - 50;
        const lineHeight = 14;

        this.ctx.font = "bold 14px monospace";
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        this.ctx.strokeStyle = "#FF3333";
        this.ctx.lineWidth = 2;

        // Draw Box
        this.ctx.fillRect(x - 10, y - 20, 160, 140);
        this.ctx.globalAlpha = 1.0;
        this.ctx.fillStyle = "#00FF66"; // Bright Green Text

        this.ctx.fillText(`CANVAS: ${width.toFixed(0)}x${height.toFixed(0)}`, x, y); y += 20;
        this.ctx.fillText(`IPD (px): ${pixelIPD.toFixed(1)}`, x, y); y += 20;
        this.ctx.fillText(`AMP (px): ${amplitudePx.toFixed(1)}`, x, y); y += 20;

        // Calculated Ratio (Amp/IPD) * 65
        const metric = (amplitudePx / (pixelIPD || 1)) * 65;
        this.ctx.fillText(`RES (mm): ${metric.toFixed(1)}`, x, y); y += 20;

        this.ctx.fillText(`ROLL: ${rollDeg.toFixed(1)}°`, x, y); y += 20;
        this.ctx.fillText(`FPS: ${rawFps.toFixed(0)}`, x, y);

        // SAFE ZONE BORDER
        this.ctx.strokeRect(10, 10, width - 20, height - 20);
    }

    /**
     * Draws status indicators for Analysis Mode and Lighting.
     */
    drawStatusIndicators(mode: 'STANDARD' | 'PRECISION', quality: string = 'GOOD') {
        const x = 20;
        const y = this.height - 40;

        // MODE INDICATOR
        this.ctx.font = "800 10px 'Inter', sans-serif";
        this.ctx.fillStyle = mode === 'PRECISION' ? "#00FF66" : "rgba(255, 255, 255, 0.5)";
        this.ctx.fillText(`MODE: ${mode}`, x, y);

        // QUALITY INDICATOR
        if (mode === 'PRECISION') {
            this.ctx.fillStyle = quality === 'GOOD' ? "#00FF66" : quality === 'WARNING' ? "#FFAA00" : "#FF3333";
            this.ctx.fillText(`LIGHT: ${quality}`, x, y + 15);
        }
    }
}
