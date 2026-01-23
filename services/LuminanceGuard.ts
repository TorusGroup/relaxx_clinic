
export enum QualityLevel {
    GOOD = 'GOOD',
    WARNING = 'WARNING',
    CRITICAL = 'CRITICAL'
}

export interface LuminanceResult {
    level: QualityLevel;
    value: number; // 0-255
    message: string | null;
}

/**
 * V21.0: LUMINANCE GUARD
 * Analyzes video frames to ensure lighting conditions meet clinical standards.
 * Prevents "Garbage In" for the computer vision models.
 */
export class LuminanceGuard {
    // Clinical Thresholds (Empirically tuned for webcam sensors)
    private static readonly CRITICAL_LOW = 40;  // Dark room
    private static readonly WARNING_LOW = 80;   // Dim room
    private static readonly WARNING_HIGH = 230; // Blown out exposure

    // Efficiency: We don't sample every pixel. We sample a grid.
    private static readonly SAMPLE_STEP = 10;

    /**
     * Checks the luminance of the current video frame.
     * @param video The HTMLVideoElement source.
     * @param canvas Optional canvas for reading pixels (if not provided, creates temp).
     */
    static check(video: HTMLVideoElement, ctx: CanvasRenderingContext2D): LuminanceResult {
        if (!video || !ctx) return { level: QualityLevel.CRITICAL, value: 0, message: "Camera not ready" };

        const { videoWidth, videoHeight } = video;

        // Draw small thumbnail to analyze brightness (50x50 is enough for average)
        // This is much faster than reading 1920x1080 pixels
        const sampleSize = 50;
        ctx.drawImage(video, 0, 0, sampleSize, sampleSize);

        const frameData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = frameData.data;

        let totalLuminance = 0;
        let pixels = 0;

        // Standard Luminance Formula: 0.299R + 0.587G + 0.114B
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            totalLuminance += lum;
            pixels++;
        }

        const avgLuminance = totalLuminance / pixels;

        // Determine Level
        if (avgLuminance < this.CRITICAL_LOW) {
            return {
                level: QualityLevel.CRITICAL,
                value: avgLuminance,
                message: "ILUMINAÇÃO CRÍTICA: Aumente a luz"
            };
        } else if (avgLuminance < this.WARNING_LOW) {
            return {
                level: QualityLevel.WARNING,
                value: avgLuminance,
                message: "Ambiente Escuro"
            };
        } else if (avgLuminance > this.WARNING_HIGH) {
            return {
                level: QualityLevel.WARNING,
                value: avgLuminance,
                message: "Excesso de Luz"
            };
        }

        return {
            level: QualityLevel.GOOD,
            value: avgLuminance,
            message: null
        };
    }
}
