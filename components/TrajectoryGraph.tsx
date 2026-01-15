
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

        // V9.9 FIXED SCALING
        const SCALE_X = 3000; // Tripled Zoom to make line reach bottom of canvas
        const SCALE_Y = 3000; // Keep 1:1 Aspect Ratio

        // ANCHOR: The first point of the movement is the "Zero" (Top Center)
        const startP = path[0];
        const originX = width / 2;
        const originY = 20; // Start near top

        ctx.beginPath();
        ctx.strokeStyle = '#00FF66';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00FF66';

        ctx.moveTo(originX, originY); // Start at Anchor

        for (let i = 1; i < path.length; i++) {
            const p = path[i];

            // Calculate Delta relative to Start of Rep
            // relY is "Down" (Positive).
            // We want it to go DOWN on canvas.
            // Note: If input Y is inverted (negative for open), we might need to flip.
            // But CameraView says relY = Chin                // Delta from Start
            // V9.9 UX FORCE: Always draw "Opening" as DOWN (Positive Y)
            // Using Math.abs ensures that distance from Start is visually intuitive
            const dx = (p.x - startP.x) * SCALE_X;
            const dy = Math.abs(p.y - startP.y) * SCALE_Y;

            ctx.lineTo(originX + dx, originY + dy);
        }
        ctx.stroke();

        // Draw Head/Current Pos (White Dot)
        const last = path[path.length - 1];
        const first = path[0];
        const dx = (last.x - first.x) * SCALE_X;
        const dy = Math.abs(last.y - first.y) * SCALE_Y;

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(originX + dx, originY + dy, 4, 0, Math.PI * 2);
        ctx.fill();

    }, [path, width, height]);

    return (
        <div className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-[10px] font-bold text-[#00FF66] uppercase tracking-widest">Trajetória</h3>
                <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500/20"></span>
                    <span className="w-2 h-2 rounded-full bg-[#00FF66]/20"></span>
                </div>
            </div>
            {/* Canvas Container with fixed aspect ratio */}
            <canvas ref={canvasRef} width={width} height={height} className="rounded-lg bg-black/40 border border-white/5" />
            <div className="flex justify-between text-[10px] text-gray-400 mt-2 font-mono font-bold">
                <span>L</span>
                <span className="text-[8px] font-normal opacity-50">DESVIO</span>
                <span>R</span>
            </div>
        </div>
    );
};

export default TrajectoryGraph;
