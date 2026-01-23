import React, { useEffect, useRef } from 'react';
import { ATMLandmark, Plane3D } from '../core/types';

interface Props {
    landmarks: ATMLandmark[];
    symmetryPlane: Plane3D | null;
    width: number;
    landmarks: ATMLandmark[];
    symmetryPlane: Plane3D | null;
    width: number;
    height: number;
    trajectory?: { dev: number, open: number }[]; // History in MM
}

/**
 * Renders the scientific vector overlay:
 * 1. Mid-Sagittal Plane (Green Line)
 * 2. Mandibular Vector (White Line)
 * 3. Deviation Indicator (Red Strut)
 */
export const VectorOverlay: React.FC<Props> = ({ landmarks, symmetryPlane, width, height, trajectory }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Utility: Draw Point
        const drawPoint = (p: { x: number, y: number }, color: string, size: number = 2) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            // Mirror X
            ctx.arc((1 - p.x) * width, p.y * height, size, 0, 2 * Math.PI);
            ctx.fill();
        };

        // Utility: Draw Line
        const drawLine = (p1: { x: number, y: number }, p2: { x: number, y: number }, color: string, widthPx: number = 2) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = widthPx;
            ctx.beginPath();
            ctx.moveTo((1 - p1.x) * width, p1.y * height);
            ctx.lineTo((1 - p2.x) * width, p2.y * height);
            ctx.stroke();
        };

        // 0. DEBUG: Draw ALL landmarks faintly to confirm data flow
        landmarks.forEach(l => {
            drawPoint(l, 'rgba(255, 255, 255, 0.2)', 1);
        });

        // 1. Draw Symmetry Plane (Midline)
        if (symmetryPlane) {
            const top = symmetryPlane.point; // MidEye usually
            // We need a direction. The plane normal is Left/Right.
            // We want to draw the Vertical intersection of the plane.
            // Which is defined by the vertical vector we used to build it?
            // Let's assume vertical down.

            // To be precise: We project a point far down "along the plane".
            // For visualization, Glabella -> Philtrum is the reference line.

            const glabella = landmarks.find(l => l.id === 10);
            const philtrum = landmarks.find(l => l.id === 0);

            if (glabella && philtrum) {
                // Extended line
                // Vector G->P
                const dx = philtrum.x - glabella.x;
                const dy = philtrum.y - glabella.y;

                const factor = 100; // Extend far
                const endPoint = {
                    x: glabella.x + dx * factor,
                    y: glabella.y + dy * factor
                };
                const startPoint = {
                    x: glabella.x - dx * 10,
                    y: glabella.y - dy * 10
                };

                drawLine(startPoint, endPoint, '#00FF66', 2); // Green Midline
            }
        }

        // 2. Draw Jaw Vector (Opening)
        const upperLip = landmarks.find(l => l.id === 13);
        const lowerLip = landmarks.find(l => l.id === 14);

        if (upperLip && lowerLip) {
            drawPoint(upperLip, '#FFFFFF', 3);
            drawPoint(lowerLip, '#FFFFFF', 3);
            drawLine(upperLip, lowerLip, 'rgba(255, 255, 255, 0.5)', 4);
        }

        // 3. AR TRAJECTORY (Re-Projected)
        if (trajectory && trajectory.length > 2 && symmetryPlane && upperLip) {
            // We need the "Basis Vectors" of the current face state
            // Origin: Upper Lip (13) - Used as a fixed skull anchor relative to jaw
            // Y-Axis: Symmetry Plane Vertical (Down)
            // X-Axis: Symmetry Plane Normal (Right)

            // Step A: Calculate Pixels Per MM (Scale)
            // Use IPD (Dist between 33 and 263) / 64mm
            const lEye = landmarks.find(l => l.id === 33);
            const rEye = landmarks.find(l => l.id === 263);
            let pxPerMM = 1.0;

            if (lEye && rEye) {
                const ipdPx = Math.sqrt(
                    Math.pow(rEye.x - lEye.x, 2) +
                    Math.pow(rEye.y - lEye.y, 2) // Ignore Z for 2D projection scale
                );
                // IPD is roughly 0.4 width normalized? 
                // Wait, landmarks are normalized [0,1].
                // So ipdPx is fractional.
                // width is Canvas Width in Pixels.
                const realPx = ipdPx * width;
                pxPerMM = realPx / 64.0; // 64mm avg IPD
            }

            // Step B: Define Basis Vectors (Normalized 2D Direction)
            // Vertical (Down)
            const glabella = landmarks.find(l => l.id === 10);
            const philtrum = landmarks.find(l => l.id === 0);

            if (glabella && philtrum) {
                // Vector G->P is "Down"
                const vY = { x: philtrum.x - glabella.x, y: philtrum.y - glabella.y };
                const lenY = Math.sqrt(vY.x * vY.x + vY.y * vY.y);
                const basisY = { x: vY.x / lenY, y: vY.y / lenY }; // Unit Unit Y

                // Vector X is Perpendicular to Y ( Left/Right )
                // Rotate 90 deg: (x, y) -> (-y, x)
                const basisX = { x: -basisY.y, y: basisY.x };

                // Step C: Reconstruct & Draw
                ctx.beginPath();
                ctx.strokeStyle = '#00FF66';
                ctx.lineWidth = 3;

                trajectory.forEach((pt, i) => {
                    // Reconstruct Point relative to Upper Lip (Anchor)
                    // Note: 'open' is down (Y), 'dev' is right (X)

                    // Offset in Normalized Coords
                    const offsetX = (pt.dev * pxPerMM) / width;  // MM -> Px -> Norm
                    const offsetY = (pt.open * pxPerMM) / height;

                    // Since aspect ratio usually isn't 1:1, we should be careful.
                    // Actually, landmarks are 0..1.
                    // width/height are pixels.

                    const mmToNormX = pxPerMM / width;
                    const mmToNormY = pxPerMM / height;

                    const finalX = upperLip.x + (basisX.x * pt.dev * mmToNormX) + (basisY.x * pt.open * mmToNormX); // Use X scale for both to preserve aspect? 
                    // No. X acts on X, Y acts on Y?
                    // Wait, vectors are 2D. 
                    // P_final = Origin + (BasisX_vec * scalar_dev) + (BasisY_vec * scalar_open)

                    const vecX_x = basisX.x * (pt.dev * mmToNormX); // X component of X-basis
                    const vecX_y = basisX.y * (pt.dev * mmToNormY); // Y component of X-basis? 
                    // Aspect correction: basis vectors are normalized in 0..1 space? No.
                    // Basis vectors calculated from 0..1 landmarks are in "Normalized Aspect Space".
                    // If video is 16:9, NormalX=0.1 is much wider than NormalY=0.1.

                    // Better approach: Work purely in PIXELS for drawing.
                    // Origin Px
                    const originPx = { x: upperLip.x * width, y: upperLip.y * height };

                    // Basis Px (G->P)
                    const gPx = { x: glabella.x * width, y: glabella.y * height };
                    const pPx = { x: philtrum.x * width, y: philtrum.y * height };

                    const vY_px = { x: pPx.x - gPx.x, y: pPx.y - gPx.y };
                    const lenY_px = Math.sqrt(vY_px.x * vY_px.x + vY_px.y * vY_px.y);
                    const bY_px = { x: vY_px.x / lenY_px, y: vY_px.y / lenY_px }; // Unit Pixel Vector Down

                    const bX_px = { x: -bY_px.y, y: bY_px.x }; // Unit Pixel Vector Right

                    // Point Px
                    const ptPx = {
                        x: originPx.x + (bX_px.x * pt.dev * pxPerMM) + (bY_px.x * pt.open * pxPerMM),
                        y: originPx.y + (bX_px.y * pt.dev * pxPerMM) + (bY_px.y * pt.open * pxPerMM)
                    };

                    // Draw (Mirror X check: canvas is usually not mirrored if context is)
                    // Wait, drawPoint function mirrors X: (1-p.x).
                    // We calculated ptPx in "Raw Image Space" (where x=0 is left).
                    // Context needs Mirroring?
                    // Let's manually mirror for the lineTo

                    const drawX = (width - ptPx.x); // Mirror
                    const drawY = ptPx.y;

                    if (i === 0) ctx.moveTo(drawX, drawY);
                    else ctx.lineTo(drawX, drawY);
                });

                ctx.stroke();
            }
        }

    }, [landmarks, symmetryPlane, width, height, trajectory]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
    );
};
