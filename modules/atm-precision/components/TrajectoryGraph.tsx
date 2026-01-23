import React, { useEffect, useRef } from 'react';

interface Props {
    trajectory: { dev: number, open: number }[];
    width?: number;
    height?: number;
}

/**
 * A dedicated 2D graph for jaw kinematics.
 * X-axis: Lateral Deviation (mm)
 * Y-axis: Opening Amplitude (mm)
 */
export const TrajectoryGraph: React.FC<Props> = ({
    trajectory,
    width = 300,
    height = 400
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Configuration
        const padding = 40;
        const graphWidth = width - padding * 2;
        const graphHeight = height - padding * 2;

        // Scales (Max typical: 60mm opening, 15mm deviation)
        const maxOpening = 60;
        const maxDev = 20;

        // Clear
        ctx.fillStyle = '#0F172A'; // Slate 900
        ctx.fillRect(0, 0, width, height);

        // Draw Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        // Horizontal lines (Opening steps)
        for (let i = 0; i <= 6; i++) {
            const y = padding + (i / 6) * graphHeight;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();

            // Label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText(`${i * 10}mm`, width - padding + 5, y + 4);
        }

        // Vertical midline
        const centerX = padding + graphWidth / 2;
        ctx.beginPath();
        ctx.moveTo(centerX, padding);
        ctx.lineTo(centerX, height - padding);
        ctx.stroke();

        ctx.setLineDash([]); // Reset dash

        // Draw Axes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.strokeRect(padding, padding, graphWidth, graphHeight);

        // Draw Data Path
        if (trajectory.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = '#00FF66';
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            trajectory.forEach((pt, i) => {
                // Map Data -> Px
                // pt.dev: -20 to 20
                // pt.open: 0 to 60

                const x = centerX + (pt.dev / maxDev) * (graphWidth / 2);
                const y = padding + (pt.open / maxOpening) * graphHeight;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Glow effect
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00FF66';
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Current point head
            const last = trajectory[trajectory.length - 1];
            const headX = centerX + (last.dev / maxDev) * (graphWidth / 2);
            const headY = padding + (last.open / maxOpening) * graphHeight;

            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(headX, headY, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Axis Labels
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Lateral Deviation', centerX, height - 10);

        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Opening Amplitude', 0, 0);
        ctx.restore();

    }, [trajectory, width, height]);

    return (
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-2xl">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                Kinematic Trace
            </h3>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="rounded shadow-inner bg-slate-950"
            />
        </div>
    );
};
