import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FacialLandmarkAdapter } from '../detectors/FacialLandmarkAdapter';
import { SymmetryAnalyzer } from '../analysis/SymmetryAnalyzer';
import { JawMovementAnalyzer, JawMetrics } from '../analysis/JawMovementAnalyzer';
import { VectorOverlay } from './VectorOverlay';
import { ATMLandmark, Plane3D } from '../core/types';

interface Props {
    stream: MediaStream | null;
    onMetrics?: (metrics: JawMetrics) => void;
    onTrajectoryUpdate?: (trajectory: { dev: number, open: number }[]) => void;
    debugMode?: boolean;
    width?: number; // Add width prop
    height?: number; // Add height prop
}

/**
 * 📷 High Precision Camera
 * The core of the new ATM Analysis Module.
 * Features:
 * - 60FPS Render Loop
 * - Decoupled Logic (Adapter -> Analyzer -> View)
 * - Strict Types
 */
export const HighPrecisionCamera: React.FC<Props> = ({ stream, onMetrics, onTrajectoryUpdate, debugMode, width: containerWidth, height: containerHeight }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const requestRef = useRef<number>(null);
    const [debugError, setDebugError] = useState<string | null>(null);

    // Adapters & Logic
    const adapterRef = useRef(new FacialLandmarkAdapter());
    const symmetryAnalyzerRef = useRef(new SymmetryAnalyzer());
    const jawAnalyzerRef = useRef(new JawMovementAnalyzer());

    // State for Visualization
    const [landmarks, setLandmarks] = useState<ATMLandmark[]>([]);
    const [symmetryPlane, setSymmetryPlane] = useState<Plane3D | null>(null);
    const [metrics, setMetrics] = useState<JawMetrics | null>(null);
    const [trajectory, setTrajectory] = useState<{ dev: number, open: number }[]>([]); // AR History

    const [dims, setDims] = useState({ width: 0, height: 0 });
    const lastOpenTimeRef = useRef<number>(0);

    const onResults = useCallback((results: any) => {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;

        const raw = results.multiFaceLandmarks[0];
        const timestamp = Date.now() / 1000;

        // 1. ADAPT (Raw -> Medical Object with Filtering)
        const atmLandmarks = adapterRef.current.process(raw, timestamp);
        setLandmarks(atmLandmarks);

        // 2. ANALYZE (Symmetry within Pixel Space)
        const plane = symmetryAnalyzerRef.current.calculateMidSagittalPlane(atmLandmarks, dims.width, dims.height);
        setSymmetryPlane(plane);

        // 3. MEASURE (Jaw kinematics)
        if (plane) {
            const jaws = jawAnalyzerRef.current.analyze(atmLandmarks, plane, dims.width, dims.height);
            setMetrics(jaws);

            // 4. TRAJECTORY BUFFER & AUTO-RESET (Dampened)
            setTrajectory(prev => {
                const now = Date.now();
                if (jaws.isOpen) {
                    lastOpenTimeRef.current = now;
                    // Add new point
                    const newPoint = { dev: jaws.deviationMM, open: jaws.openingMM };
                    const next = [...prev, newPoint];
                    if (next.length > 300) next.shift(); // 10s history
                    if (onTrajectoryUpdate) onTrajectoryUpdate(next);
                    return next;
                } else {
                    // Closed mouth: Only reset if stable for 500ms
                    if (prev.length > 0 && (now - lastOpenTimeRef.current > 500)) {
                        if (onTrajectoryUpdate) onTrajectoryUpdate([]);
                        return [];
                    }
                    return prev;
                }
            });

            if (onMetrics) onMetrics(jaws);
        }

    }, [onMetrics]);

    useEffect(() => {
        let active = true;
        const FaceMeshLib = (window as any).FaceMesh;

        if (!FaceMeshLib) {
            setDebugError("MediaPipe FaceMesh not loaded");
            return;
        }

        const faceMesh = new FaceMeshLib({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7,
        });

        faceMesh.onResults(onResults);

        if (videoRef.current && stream && active) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
                if (active && videoRef.current) {
                    videoRef.current.play().catch(e => console.error(e));
                    setDims({
                        width: videoRef.current.videoWidth,
                        height: videoRef.current.videoHeight
                    });

                    const loop = async () => {
                        if (!active) return;
                        if (videoRef.current && videoRef.current.readyState >= 2) {
                            await faceMesh.send({ image: videoRef.current });
                        }
                        requestRef.current = requestAnimationFrame(loop);
                    };
                    loop();
                }
            };
        }

        return () => {
            active = false;
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            faceMesh.close();
        };
    }, [stream, onResults]);

    return (
        <div className="relative w-full h-full bg-black overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
            {/* 1. Underlying Video Layer */}
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-contain scale-x-[-1] opacity-60"
                playsInline
                muted
            />

            {/* 2. Scientific Visualization Layer */}
            {dims.width > 0 && (
                <VectorOverlay
                    landmarks={landmarks}
                    symmetryPlane={symmetryPlane}
                    width={dims.width}
                    height={dims.height}
                    trajectory={trajectory}
                />
            )}

            {/* 3. Clinical HUD (Overlay) */}
            <div className="absolute top-4 left-4 p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 font-mono text-xs text-[#00FF66]">
                <h3 className="uppercase opacity-50 mb-2 tracking-widest">ATM SENSOR</h3>
                {metrics ? (
                    <div className="space-y-1">
                        <div className="flex justify-between w-40">
                            <span>OPENING:</span>
                            <span className="font-bold">{metrics.openingMM.toFixed(1)}mm</span>
                        </div>
                        <div className="flex justify-between w-40">
                            <span>DEVIATION:</span>
                            <span className={Math.abs(metrics.deviationMM) > 2 ? "text-red-400 font-bold" : "font-bold"}>
                                {metrics.deviationMM.toFixed(1)}mm
                            </span>
                        </div>
                        <div className="flex justify-between w-40 opacity-70">
                            <span>VELOCITY:</span>
                            <span>{metrics.velocity.toFixed(0)}mm/s</span>
                        </div>
                    </div>
                ) : (
                    <span className="animate-pulse">ACQUIRING SIGNAL...</span>
                )}
            </div>

            {debugError && (
                <div className="absolute bottom-4 left-4 text-red-500 bg-black/80 p-2 rounded">
                    {debugError}
                </div>
            )}
        </div>
    );
};
