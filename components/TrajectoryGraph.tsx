
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

const TrajectoryGraph: React.FC<Props> = ({ path, width = 80, height = 400 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        // Grid Style - Very subtle
        ctx.strokeStyle = 'rgba(0, 255, 102, 0.03)';
        ctx.lineWidth = 0.5;

        const step = 40;
        ctx.beginPath();
        for (let x = 0; x <= width; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
        for (let y = 0; y <= height; y += step) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
        ctx.stroke();

        // Center Axis
        ctx.strokeStyle = 'rgba(0, 255, 102, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height);
        ctx.stroke();

        if (path.length === 0) return;

        // V13 ZOOM: Doubled for ultimate clinical detail
        const SCALE_X = 8000;
        const SCALE_Y = 8000;

        const startP = path[0];
        const originX = width / 2;
        const originY = 20;

        ctx.beginPath();
        ctx.strokeStyle = '#00FF66';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0, 255, 102, 0.4)';

        ctx.moveTo(originX, originY);

        for (let i = 1; i < path.length; i++) {
            const p = path[i];
            const dx = (p.x - startP.x) * SCALE_X;
            const dy = Math.abs(p.y - startP.y) * SCALE_Y;
            ctx.lineTo(originX + dx, originY + dy);
        }
        ctx.stroke();

        // Draw Head
        const last = path[path.length - 1];
        const first = path[0];
        const dx = (last.x - first.x) * SCALE_X;
        const dy = Math.abs(last.y - first.y) * SCALE_Y;

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(originX + dx, originY + dy, 3, 0, Math.PI * 2);
        ctx.fill();

    }, [path, width, height]);

    return (
        <div className="w-[60px] md:w-[70px] bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[20px] p-2 py-4 shadow-[0_40px_80px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-right duration-1000">
            <div className="flex flex-col items-center gap-1 mb-3">
                <h3 className="text-[7px] font-black text-[#00FF66] uppercase tracking-[0.1em] italic text-center leading-none">TRAJ</h3>
                <div className="h-[1px] w-4 bg-[#00FF66]/20" />
            </div>

            <div className="relative h-[200px] md:h-[280px] w-full bg-black/20 rounded-lg border border-white/5 overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    className="w-full h-full object-contain"
                />
            </div>

            <div className="flex justify-between items-center text-[8px] text-[#00FF66] mt-3 font-black tracking-widest px-1 opacity-40">
                <span>L</span>
                <span>R</span>
            </div>
        </div>
    );
};

export default TrajectoryGraph;
