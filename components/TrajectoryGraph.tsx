
import React, { useRef, useEffect } from 'react';

interface Point {
    x: number;
    y: number;
}

interface Props {
    path: Point[];
    width?: number;
    height?: number;
}

const TrajectoryGraph: React.FC<Props> = ({ path, width = 200, height = 300 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Grid Style
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        // Draw Grid
        const step = 20;
        ctx.beginPath();
        for (let x = 0; x <= width; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
        for (let y = 0; y <= height; y += step) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
        ctx.stroke();

        // Center Axis
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height); // Vertical Axis
        ctx.stroke();

        if (path.length === 0) return;

        // Plot Path
        // Challenge: Scaling. The input points are normalized (0..1) relative to VIDEO frame.
        // We want to zoom in on the mouth area.
        // Assume Path[0] is "Center" (Rest Position).
        // We Map Path[0] -> (width/2, 50).
        // And scale deviations by X factor.

        // For now, let's assume the passed path is already "Relative" or we calculate relative here.
        const startP = path[0];
        const SCALE_X = 1000; // Zoom factor for X (Deviation is usually small)
        const SCALE_Y = 800;  // Zoom factor for Y

        ctx.beginPath();
        ctx.strokeStyle = '#00FF66';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00FF66';

        const originX = width / 2;
        const originY = 40; // Top padding

        // Draw Meteor
        // We only draw if we have points
        // We re-iterate the path relative to the FIRST point in the buffer?
        // Or absolute? 
        // Best UX: Relative to the very first point of the sequence (Opening).
        // But this component receives a sliding window (trail).
        // Let's align the `path[0]` to the previous frame? No.
        // Let's just create a visualization that moves.
        // Actually, "Medical Graph" usually has fixed axes.
        // Let's assume the input `path` contains normalized coordinates. 
        // We align the "Rest Position" to the Crosshair.

        // Simplification: We just iterate and plot relative to start.
        if (path.length > 1) {
            // Point 0 is our reference for this specific trail segment? 
            // No, that makes it jittery.
            // We need a stable reference. 
            // For V9.0 Initial Step: Let's just draw the shape as is, centering the bounding box?
            // Let's center the first point at Origin.

            ctx.moveTo(originX, originY); // Start

            for (let i = 1; i < path.length; i++) {
                const p = path[i];
                const prev = path[0]; // Reference

                // Delta from Start
                const dx = (p.x - prev.x) * SCALE_X;
                const dy = (p.y - prev.y) * SCALE_Y;

                ctx.lineTo(originX + dx, originY + dy);
            }
            ctx.stroke();
        }

        // Draw Head/Current Pos
        if (path.length > 0) {
            const last = path[path.length - 1];
            const first = path[0];
            const dx = (last.x - first.x) * SCALE_X;
            const dy = (last.y - first.y) * SCALE_Y;

            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(originX + dx, originY + dy, 4, 0, Math.PI * 2);
            ctx.fill();
        }

    }, [path, width, height]);

    return (
        <div className="bg-[#002D20]/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-[10px] font-bold text-[#00FF66] uppercase tracking-widest">Trajetória Real-time</h3>
                <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500/20"></span>
                    <span className="w-2 h-2 rounded-full bg-[#00FF66]/20"></span>
                </div>
            </div>
            <canvas ref={canvasRef} width={width} height={height} className="rounded-lg bg-black/20" />
            <div className="flex justify-between text-[8px] text-gray-500 mt-2 font-mono">
                <span>L (Desvio)</span>
                <span>R</span>
            </div>
        </div>
    );
};

export default TrajectoryGraph;
