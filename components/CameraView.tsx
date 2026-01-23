import React, { useRef, useEffect, useState, useCallback } from 'react';
import { LANDMARK_INDICES } from '../constants';
import Notification from './Notification'; // V10.0 UI
import { calculateMetrics } from '../services/analysisEngine';
import { DiagnosticMetrics, Landmark } from '../types';
import { BiometricStabilizer } from '../services/biometricStabilizer';
import { BiometricVisualizer } from '../services/biometricVisualizer';
import { PostureGuard } from '../services/postureGuard';
import { LuminanceGuard, QualityLevel } from '../services/LuminanceGuard'; // V21.0
import { calculateRollAngle, rotatePoint } from '../utils/geometry';
import { FacialLandmarkAdapter } from '../services/precision/FacialLandmarkAdapter';
import { SymmetryAnalyzer } from '../services/precision/SymmetryAnalyzer';
import { JawMovementAnalyzer } from '../services/precision/JawMovementAnalyzer';

interface Props {
  onMetricsUpdate: (metrics: DiagnosticMetrics, landmarks: Landmark[]) => void;
  stream: MediaStream | null;
  tare?: { lateral: number; opening: number };
  onCameraReady: () => void;
  onTrajectoryUpdate?: (vector: { x: number, y: number }) => void; // V9.9 Single Vector
}

const CameraView: React.FC<Props> = ({ onCameraReady, onMetricsUpdate, onTrajectoryUpdate, stream, tare }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceMeshRef = useRef<any>(null);
  const requestRef = useRef<number>(null);

  // V21.0: Analysis Mode State
  const [analysisMode, setAnalysisMode] = useState<'STANDARD' | 'PRECISION'>('PRECISION');
  const [lightingQuality, setLightingQuality] = useState<QualityLevel>(QualityLevel.GOOD);

  // V19.0 REFACTOR: Encapsulated Stabilizer (Filters, Buffer, Snapping)
  const stabilizerRef = useRef(new BiometricStabilizer());
  const adapterRef = useRef(new FacialLandmarkAdapter());
  const symmetryAnalyzerRef = useRef(new SymmetryAnalyzer());
  const jawAnalyzerRef = useRef(new JawMovementAnalyzer());
  const frameCountRef = useRef(0);

  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDetectedFace, setHasDetectedFace] = useState(false); // V6.0 Cinematic Entry

  // V8.0 PHYSICS: Mandible Lock & Trajectory
  const chinOffsetRef = useRef<{ x: number, y: number } | null>(null);
  const mandibleOffsetsRef = useRef<{ x: number, y: number }[] | null>(null); // V14.0 RIGID BONE
  const mandibleRollRef = useRef<number | null>(null); // V16.0 ROTATIONAL RIGIDITY

  // V9.0 GUARDRAILS UI
  const [activeWarning, setActiveWarning] = useState<{ msg: string; type: 'warning' | 'error' } | null>(null);

  const onResults = useCallback((results: any) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    const { width, height } = canvasRef.current;
    frameCountRef.current++;

    // V20.0: Instantiate Visualizer
    const visualizer = new BiometricVisualizer(canvasCtx, width, height);
    visualizer.clear();

    canvasCtx.save();

    // V21.0: LUMINANCE GUARD (Throttled Check - Every 30 frames ~1s)
    if (analysisMode === 'PRECISION' && frameCountRef.current % 30 === 0) {
      const quality = LuminanceGuard.check(videoRef.current, canvasCtx);
      setLightingQuality(quality.level);

      if (quality.level === QualityLevel.CRITICAL) {
        setActiveWarning({ msg: quality.message || "DARK", type: 'error' });
      } else if (activeWarning?.msg?.includes("ILUMINAÇÃO") && quality.level === QualityLevel.GOOD) {
        setActiveWarning(null);
      }
    }

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      try {
        if (!hasDetectedFace) setHasDetectedFace(true);

        const rawLandmarks = results.multiFaceLandmarks[0];
        const timestamp = Date.now() / 1000;

        // --- V20.0 POSTURE GUARD (Refactored) ---
        const { warning, rollDeg } = PostureGuard.check(rawLandmarks, width);
        const rollRad = rollDeg * (Math.PI / 180); // Back to radians for rotation correction later

        if (warning) {
          // Update UI (Throttled to prevent React spam)
          if (!activeWarning || activeWarning.msg !== warning) {
            setActiveWarning({ msg: warning, type: 'warning' });
          }

          // V10.0 ORANGE GUARDRAIL
          canvasCtx.strokeStyle = "rgba(255, 140, 0, 0.6)";
          canvasCtx.lineWidth = 12;
          canvasCtx.strokeRect(0, 0, width, height);

          canvasCtx.restore();
          return;
        } else {
          // Only clear simple warnings, keep Critical Lighting warnings in Precision Mode
          if (activeWarning && !activeWarning.msg.includes("ILUMINAÇÃO")) {
            setActiveWarning(null);
          }
        }

        // --- CORRECTION: ROTATE FACE TO NEUTRALIZE TILT ---
        // If we are here, tilt is < 8deg but maybe > 0. Let's correct it mathematically.
        // We rotate everything by -rollRad around the nose (landmark 1).
        const pivot = rawLandmarks[1];
        const correctedLandmarks = rawLandmarks.map((p: any) => rotatePoint(p, -rollRad, pivot));

        // 0. PRECISION ADAPTER (Landmark Filtering)
        const atmLandmarks = adapterRef.current.process(rawLandmarks, timestamp);

        // 1. PRECISION SYMMETRY (3D Plane - Now aspect-aware)
        const plane = symmetryAnalyzerRef.current.calculateMidSagittalPlane(atmLandmarks, width, height);

        // 1. ADVANCED SMOOTHING (Legacy reference for filters if needed)
        const stabilizer = stabilizerRef.current;
        const smoothedLandmarks = [...rawLandmarks]; // We use raw for legacy rotation correction if needed, but atmLandmarks is better.

        // Actually, we replace smoothedLandmarks[idx] logic below with atmLandmarks mapping
        atmLandmarks.forEach(l => {
          smoothedLandmarks[l.id] = { x: l.x, y: l.y, z: l.z };
        });

        // --- V22.0 PRECISION METRICS CALCULATION ---
        let displayMetrics: DiagnosticMetrics = { verticalAlignment: 0, openingAmplitude: 0, lateralDeviation: 0, isCentered: true };

        if (plane) {
          const precisionJaws = jawAnalyzerRef.current.analyze(atmLandmarks, plane, width, height);
          displayMetrics = {
            verticalAlignment: Math.abs(rollDeg), // High-level posture roll
            openingAmplitude: precisionJaws.openingMM,
            lateralDeviation: precisionJaws.deviationMM,
            isCentered: !warning
          };
        } else {
          // Fallback to legacy if plane fails (rare)
          const metrics = calculateMetrics(atmLandmarks as any);
          displayMetrics = { ...metrics };
        }

        if (tare) {
          displayMetrics.lateralDeviation -= tare.lateral;
          displayMetrics.openingAmplitude = Math.max(0, displayMetrics.openingAmplitude - tare.opening);
        }

        if (displayMetrics.openingAmplitude < 5.0) {
          displayMetrics.openingAmplitude = 0;
          displayMetrics.lateralDeviation = 0;
        }

        // --- V22.0 PRECISION DRAWING ---
        const glabella = atmLandmarks.find(l => l.id === 10);
        const philtrum = atmLandmarks.find(l => l.id === 0);
        const upperLip = atmLandmarks.find(l => l.id === 13);
        const lowerLip = atmLandmarks.find(l => l.id === 14);

        if (glabella && philtrum && upperLip && lowerLip && plane) {
          // 1. Reference Axis (Green Midline - Iris Support)
          const lIris = atmLandmarks.find(l => l.id === 468);
          const rIris = atmLandmarks.find(l => l.id === 473);
          const lEyeFallback = atmLandmarks.find(l => l.id === 33);
          const rEyeFallback = atmLandmarks.find(l => l.id === 263);

          visualizer.drawReferenceAxis(
            (lIris || lEyeFallback)!,
            (rIris || rEyeFallback)!
          );

          // 2. Axial Projection (Swiss Watch Drawing Logic - Pixel Space Refactor)
          const uPx = { x: upperLip.x * width, y: upperLip.y * height };
          const lPx = { x: lowerLip.x * width, y: lowerLip.y * height };
          const gPx = { x: glabella.x * width, y: glabella.y * height };
          const pPx = { x: philtrum.x * width, y: philtrum.y * height };

          // Basis for Vertical Axis (Glabella -> Philtrum) in Pixels
          const vY = { x: pPx.x - gPx.x, y: pPx.y - gPx.y };
          const lenY = Math.sqrt(vY.x * vY.x + vY.y * vY.y);
          const basisY = { x: vY.x / lenY, y: vY.y / lenY };

          // Project lower lip onto face vertical axis starting from upper lip
          const dx = lPx.x - uPx.x;
          const dy = lPx.y - uPx.y;
          const projectionScalar = (dx * basisY.x) + (dy * basisY.y);

          const projectedPoint = {
            id: -99,
            x: (uPx.x + basisY.x * projectionScalar) / width,
            y: (uPx.y + basisY.y * projectionScalar) / height,
            z: lowerLip.z
          } as Landmark;

          visualizer.drawAxialProjection(upperLip, lowerLip, projectedPoint);

          // 3. Adaptive Smoothing for HUD
          const useAdaptive = analysisMode === 'PRECISION';
          const stableAmp = stabilizer.stabilizeAmplitudeAdaptive(displayMetrics.openingAmplitude, useAdaptive);
          displayMetrics.openingAmplitude = stableAmp;

          // 4. Metrics & Status
          visualizer.drawMetrics(upperLip, stableAmp, displayMetrics.lateralDeviation);
          visualizer.drawStatusIndicators(analysisMode, analysisMode === 'PRECISION' ? lightingQuality : 'N/A');
        }

        // TRAJECTORY UPDATE
        if (displayMetrics.openingAmplitude > 5.0 && onTrajectoryUpdate) {
          onTrajectoryUpdate({ x: displayMetrics.lateralDeviation, y: displayMetrics.openingAmplitude });
        }

        // Update App State (Using atmLandmarks to keep everything in sync)
        const outputLandmarks = atmLandmarks.map(l => ({ x: l.x, y: l.y, z: l.z }));
        onMetricsUpdate(displayMetrics, outputLandmarks);

        canvasCtx.restore();
      } catch (loopError) {
        console.error("FATAL: CameraView Loop Crashed", loopError);
      }
    } else {
      setActiveWarning(null);
    }
  }, [onMetricsUpdate, tare, activeWarning, analysisMode, lightingQuality]);

  useEffect(() => {
    let active = true;
    const FaceMeshLib = (window as any).FaceMesh;

    if (!FaceMeshLib) {
      setError("Visão Computacional Indisponível.");
      return;
    }

    const faceMesh = new FaceMeshLib({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    faceMesh.onResults(onResults);
    faceMeshRef.current = faceMesh;

    if (videoRef.current && stream && active) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current && canvasRef.current) {
          videoRef.current.play().catch(e => console.error("Play error:", e));
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          setIsLoaded(true);

          const processVideo = async () => {
            if (videoRef.current && videoRef.current.readyState >= 2 && active) {
              try {
                await faceMesh.send({ image: videoRef.current });
              } catch (e) {
                // silent
              }
            }
            if (active) {
              requestRef.current = requestAnimationFrame(processVideo);
            }
          };
          processVideo();
        }
      };
    } else if (!stream) {
      setError("Aguardando permissão...");
    }

    return () => {
      active = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      faceMesh.close();
    };
  }, [onResults, stream]);

  return (
    <div className="relative w-full h-screen bg-[#001A13] flex items-center justify-center overflow-hidden">
      {!isLoaded && !error && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#001A13]">
          <div className="w-12 h-12 border-2 border-t-[#00FF66] border-[#00FF66]/10 rounded-full animate-spin mb-4" />
          <p className="text-[#00FF66] font-black uppercase tracking-[0.4em] text-[9px] animate-pulse">Iniciando Biometria...</p>
        </div>
      )}

      {error && !isLoaded && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#001A13] p-10 text-center">
          <p className="text-red-400 font-bold mb-4">{error}</p>
        </div>
      )}

      <div className="relative w-full h-full max-w-5xl mx-auto aspect-[9/16] md:aspect-video">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover md:rounded-[40px] scale-x-[-1]"
          style={{ filter: 'brightness(1.1) contrast(1.1)' }}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover md:rounded-[40px] pointer-events-none transition-opacity duration-1000 ${hasDetectedFace ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Toggle Button for Analysis Mode - Top Center */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto">
          <button
            onClick={() => setAnalysisMode(prev => prev === 'STANDARD' ? 'PRECISION' : 'STANDARD')}
            className={`
                    px-4 py-2 rounded-full backdrop-blur-md border transition-all duration-300
                    flex items-center gap-2 font-mono text-[10px] uppercase font-bold tracking-widest
                    ${analysisMode === 'PRECISION'
                ? 'bg-[#00FF66]/20 border-[#00FF66] text-[#00FF66] shadow-[0_0_20px_rgba(0,255,102,0.3)]'
                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}
                `}
          >
            <div className={`w-2 h-2 rounded-full ${analysisMode === 'PRECISION' ? 'bg-[#00FF66] animate-pulse' : 'bg-white/20'}`} />
            {analysisMode === 'PRECISION' ? 'CLINICAL PRECISION' : 'STANDARD MODE'}
          </button>
        </div>

      </div>

      <Notification
        isVisible={!!activeWarning}
        message={activeWarning?.msg || ''}
        type={activeWarning?.type || 'warning'}
      />
    </div>
  );
};

export default CameraView;
