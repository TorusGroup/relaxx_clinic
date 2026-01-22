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
        const eyeAngle = calculateRollAngle(lEye, rEye);
        const midlineLen = 0.25; // Constant length down
        const midEye: Landmark = {
            x: (lEye.x + rEye.x) / 2,
            y: (lEye.y + rEye.y) / 2,
            z: (lEye.z + rEye.z) / 2
        };

        // Project midline perpendicular to eye angle (eyeAngle + 90deg)
        const perpAngle = eyeAngle + Math.PI / 2;
        const midlineEnd: Landmark = {
            x: midEye.x + Math.cos(perpAngle) * midlineLen,
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
        this.drawLine(projectedPoint, lowerLip, '#FF3333', 0.8);
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
}
