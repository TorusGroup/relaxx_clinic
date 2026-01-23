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
  const [analysisMode, setAnalysisMode] = useState<'STANDARD' | 'PRECISION'>('STANDARD');
  const [lightingQuality, setLightingQuality] = useState<QualityLevel>(QualityLevel.GOOD);

  // V19.0 REFACTOR: Encapsulated Stabilizer (Filters, Buffer, Snapping)
  const stabilizerRef = useRef(new BiometricStabilizer());
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

        // 1. ADVANCED SMOOTHING (Use CORRECTED landmarks)
        const stabilizer = stabilizerRef.current;
        const smoothedLandmarks = [...correctedLandmarks];

        const indicesToSmooth = Array.from(new Set([
          ...Object.values(LANDMARK_INDICES).filter(v => typeof v === 'number') as number[],
          ...LANDMARK_INDICES.MANDIBLE_PATH,
          ...[377, 400, 378, 148, 175, 150]
        ]));

        indicesToSmooth.forEach((idx) => {
          const isLipOrBone = [
            LANDMARK_INDICES.CHIN, 17, 13, 14, 0,
            ...LANDMARK_INDICES.MANDIBLE_PATH
          ].includes(idx);

          const f = stabilizer.getFilter(idx, isLipOrBone);
          smoothedLandmarks[idx] = {
            x: f.x.filter(correctedLandmarks[idx].x, timestamp),
            y: f.y.filter(correctedLandmarks[idx].y, timestamp),
            z: f.z.filter(correctedLandmarks[idx].z, timestamp)
          };
        });

        // --- V9.1 MANDIBLE PHYSICS LOCK (Scale Invariant) ---
        const lowerLipBottom = smoothedLandmarks[17];
        const chin = smoothedLandmarks[LANDMARK_INDICES.CHIN];
        const rawChin = chin;

        const lEye = smoothedLandmarks[LANDMARK_INDICES.LEFT_EYE];
        const rEye = smoothedLandmarks[LANDMARK_INDICES.RIGHT_EYE];
        const nose = smoothedLandmarks[LANDMARK_INDICES.NOSE];

        // V9.9 FAILSAFE: Ensure valid IPD to prevent Division-by-Zero
        let currentIPD = Math.sqrt(Math.pow(rEye.x - lEye.x, 2) + Math.pow(rEye.y - lEye.y, 2));
        if (!currentIPD || currentIPD < 0.01) currentIPD = 0.06;

        if (!chinOffsetRef.current) {
          chinOffsetRef.current = {
            x: (rawChin.x - lowerLipBottom.x) / currentIPD,
            y: (rawChin.y - lowerLipBottom.y) / currentIPD
          };
        }

        // V16.0: ROTATION-AWARE BONE GEOMETRY CAPTURE
        const currentRoll = calculateRollAngle(lEye, rEye);
        if (!mandibleOffsetsRef.current || mandibleRollRef.current === null) {
          const M_PATH = LANDMARK_INDICES.MANDIBLE_PATH;
          mandibleRollRef.current = currentRoll;
          mandibleOffsetsRef.current = M_PATH.map(idx => {
            const p = smoothedLandmarks[idx];
            const rotated = rotatePoint(p, -currentRoll, lowerLipBottom);
            return {
              x: (rotated.x - lowerLipBottom.x) / currentIPD,
              y: (rotated.y - lowerLipBottom.y) / currentIPD
            };
          });
        }

        // APPLY PHYSICS LOCK (For metrics only)
        const lockedChin = {
          x: lowerLipBottom.x + (chinOffsetRef.current.x * currentIPD),
          y: lowerLipBottom.y + (chinOffsetRef.current.y * currentIPD),
          z: rawChin.z
        };

        // --- TRAJECTORY ENGINE ---
        const rawOpPx = Math.abs((smoothedLandmarks[14].y - smoothedLandmarks[13].y) * height);
        const isOpen = rawOpPx > 5.0;

        if (isOpen && onTrajectoryUpdate) {
          const nosePx = { x: nose.x * width, y: nose.y * height };
          const chinPx = { x: lockedChin.x * width, y: lockedChin.y * height };
          const relX = (nosePx.x - chinPx.x);
          const relY = (chinPx.y - nosePx.y);
          if (Number.isFinite(relX) && Number.isFinite(relY)) {
            onTrajectoryUpdate({ x: relX, y: relY });
          }
        }

        // --- V9.4 VISUALIZATION: MANDIBLE & JAW ---
        const M_PATH = LANDMARK_INDICES.MANDIBLE_PATH;
        let jawPoints: { x: number, y: number }[] = [];

        if (mandibleOffsetsRef.current) {
          jawPoints = mandibleOffsetsRef.current.map(offset => {
            const scaledX = offset.x * currentIPD;
            const scaledY = offset.y * currentIPD;
            // Force redraw based on current rotation to keep it attached visually
            const cos = Math.cos(currentRoll);
            const sin = Math.sin(currentRoll);
            const rotX = scaledX * cos - scaledY * sin;
            const rotY = scaledX * sin + scaledY * cos;
            const projX = lowerLipBottom.x + rotX;
            const projY = lowerLipBottom.y + rotY;
            return { x: (1 - projX) * width, y: projY * height };
          });
        } else {
          jawPoints = M_PATH.map(idx => {
            const p = smoothedLandmarks[idx];
            return { x: (1 - p.x) * width, y: p.y * height };
          });
        }

        visualizer.drawJawbase(jawPoints);

        // 2. VIRTUAL CHIN (Metric Stability ONLY)
        const metricLandmarks = [...smoothedLandmarks];
        const chinIndices = [152, 377, 400, 378, 148, 175, 150];
        const virtualChin = { x: 0, y: 0, z: 0 };
        chinIndices.forEach(idx => {
          virtualChin.x += smoothedLandmarks[idx].x;
          virtualChin.y += smoothedLandmarks[idx].y;
          virtualChin.z += smoothedLandmarks[idx].z;
        });
        virtualChin.x /= chinIndices.length;
        virtualChin.y /= chinIndices.length;
        virtualChin.z /= chinIndices.length;
        metricLandmarks[152] = virtualChin;

        // 3. CALCULATE METRICS
        const metrics = calculateMetrics(metricLandmarks);

        const displayMetrics = { ...metrics };
        if (tare) {
          displayMetrics.lateralDeviation -= tare.lateral;
          displayMetrics.openingAmplitude = Math.max(0, displayMetrics.openingAmplitude - tare.opening);
        }
        if (displayMetrics.openingAmplitude < 5.0) {
          displayMetrics.openingAmplitude = 0;
          displayMetrics.lateralDeviation = 0;
        }

        // --- DRAWING DELEGATION ---
        // 1. Reference Axis (Green Midline)
        const perpAngle = visualizer.drawReferenceAxis(lEye, rEye);

        const upperLipInner = smoothedLandmarks[13];
        const lowerLipInner = smoothedLandmarks[14];

        // V21.0: DUAL MODE LOGIC
        // Decide which IPD to use?
        // Standard: Raw frame IPD (Noisy Z)
        // Precision: Smoothed IPD (Stable Z)

        let ipdForProj = currentIPD; // Normalized Unit
        let pixelIPD = Math.sqrt(
          Math.pow((rEye.x - lEye.x) * width, 2) +
          Math.pow((rEye.y - lEye.y) * height, 2)
        );

        if (analysisMode === 'PRECISION') {
          const smoothedIPDUnit = stabilizer.updateIPD(currentIPD);
          ipdForProj = smoothedIPDUnit; // Unit 0.0-1.0

          // Recalculate pixelIPD based on the smoothed Unit IPD?
          // Wait, updateIPD buffers the normalized IPD.
          // But projection needs Pixel IPD. 
          // We assume width/height constant, so PixelIPD = UnitIPD * width approx?
          // Since FaceMesh coords are normalized x,y, dist(x,y) * width is close enough for Aspect 1.0 logic,
          // but for correct Aspect we rely on the pixel calculation below.
          // Let's simple smooth the PIXEL IPD? No, smooth the Normalized one is better.

          // To get Pixel IPD from Smoothed Normalized IPD efficiently:
          // We can just smooth the pixel IPD directly in another buffer? 
          // Or just:
          pixelIPD = smoothedIPDUnit * Math.sqrt(width * width + height * height); // No, this is wrong.
          // Rationale: Normalized distance * Canvas dimensions depends on angle?
          // Let's simplify: Stabilizer.updateIPD can just take the PixelIPD calculated above!

          pixelIPD = stabilizer.updateIPD(pixelIPD); // Use Pixel IPD buffer! This is robust.
        }

        const { projectedPoint, amplitudeMM } = stabilizer.projectOpeningAcrossAxis(
          upperLipInner,
          lowerLipInner,
          perpAngle,
          pixelIPD,
          width,
          height
        );

        // 2. Axial Projection
        visualizer.drawAxialProjection(upperLipInner, lowerLipInner, projectedPoint);

        // V21.0: ADAPTIVE STABILIZATION SWITCH
        // Standard: stabilizeAmplitudeAdaptive(..., false) -> Legacy Hysteresis
        // Precision: stabilizeAmplitudeAdaptive(..., true) -> Adaptive Beta
        const useAdaptive = analysisMode === 'PRECISION';
        const stableAmp = stabilizer.stabilizeAmplitudeAdaptive(amplitudeMM, useAdaptive);

        displayMetrics.openingAmplitude = stableAmp;

        // 3. HUD Metrics
        visualizer.drawMetrics(upperLipInner, stableAmp, displayMetrics.lateralDeviation);
        visualizer.drawStatusIndicators(analysisMode, analysisMode === 'PRECISION' ? lightingQuality : 'N/A');

        // Update App State
        onMetricsUpdate(displayMetrics, metricLandmarks);

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
