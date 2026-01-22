import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { LANDMARK_INDICES, COLORS } from '../constants';
import Notification from './Notification'; // V10.0 UI
import { calculateMetrics } from '../services/analysisEngine';
import { DiagnosticMetrics, Landmark } from '../types';
import { BiometricStabilizer } from '../services/biometricStabilizer';
import { BiometricVisualizer } from '../services/biometricVisualizer';
import { PostureGuard } from '../services/postureGuard';
import { chaikinSmooth, calculateRollAngle, toDegrees, rotatePoint, distance } from '../utils/geometry';

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

  // V19.0 REFACTOR: Encapsulated Stabilizer (Filters, Buffer, Snapping)
  const stabilizerRef = useRef(new BiometricStabilizer());

  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDetectedFace, setHasDetectedFace] = useState(false); // V6.0 Cinematic Entry

  // V8.0 PHYSICS: Mandible Lock & Trajectory
  const chinOffsetRef = useRef<{ x: number, y: number } | null>(null);
  const mandibleOffsetsRef = useRef<{ x: number, y: number }[] | null>(null); // V14.0 RIGID BONE
  const mandibleRollRef = useRef<number | null>(null); // V16.0 ROTATIONAL RIGIDITY

  // V9.0 GUARDRAILS UI
  const [activeWarning, setActiveWarning] = useState<{ msg: string; type: 'warning' | 'error' } | null>(null);
  const lastWarningTime = useRef<number>(0);



  const onResults = useCallback((results: any) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    const { width, height } = canvasRef.current;

    // V20.0: Instantiate Visualizer
    const visualizer = new BiometricVisualizer(canvasCtx, width, height);
    visualizer.clear();

    canvasCtx.save();
    // canvasCtx.clearRect(0, 0, width, height); // Handled by visualizer

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
          if (activeWarning) setActiveWarning(null);
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
        // Concept: The chin bone (152) is rigidly connected to the lower lip bone insertion.
        // We assume the distance LowerLipBottom (17) -> Chin (152) is proportionally CONSTANT to Face Size (IPD).

        const lowerLipBottom = smoothedLandmarks[17];
        const chin = smoothedLandmarks[LANDMARK_INDICES.CHIN];
        const rawChin = chin;

        const nose = smoothedLandmarks[LANDMARK_INDICES.NOSE];
        const lEye = smoothedLandmarks[LANDMARK_INDICES.LEFT_EYE];
        const rEye = smoothedLandmarks[LANDMARK_INDICES.RIGHT_EYE];

        // V9.9 FAILSAFE: Ensure valid IPD to prevent Division-by-Zero
        let currentIPD = Math.sqrt(Math.pow(rEye.x - lEye.x, 2) + Math.pow(rEye.y - lEye.y, 2));
        if (!currentIPD || currentIPD < 0.01) currentIPD = 0.06;

        if (!chinOffsetRef.current) {
          // CAPTURE BONE GEOMETRY (First Frame) - RELATIVE TO IPD
          // This makes the offset "Zoom-Proof"
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
            // De-rotate point relative to anchor to store "0-roll" offsets
            const rotated = rotatePoint(p, -currentRoll, lowerLipBottom);
            return {
              x: (rotated.x - lowerLipBottom.x) / currentIPD,
              y: (rotated.y - lowerLipBottom.y) / currentIPD
            };
          });
        }

        // APPLY PHYSICS LOCK (For metrics only)
        // VirtualChin = LowerLip + (FixedRatio * CurrentIPD)
        const lockedChin = {
          x: lowerLipBottom.x + (chinOffsetRef.current.x * currentIPD),
          y: lowerLipBottom.y + (chinOffsetRef.current.y * currentIPD),
          z: rawChin.z
        };

        // V13.0 DECOUPLING: We do NOT override smoothedLandmarks[152] here.
        // We keep smoothedLandmarks as NATURAL for rendering.

        // --- V9.7 TRAJECTORY ENGINE (Z-Axis Invariant) ---
        // --- V20.6 TRAJECTORY ENGINE (Pixel Space) ---
        // We now calculate trajectory in pure pixels to ensure consistent filling of the graph
        // regardless of screen aspect ratio or normalized IPD differences.

        // Gate: Only record if mouth is actually open > 2.0mm (approx 5px)
        const rawOpPx = Math.abs((smoothedLandmarks[14].y - smoothedLandmarks[13].y) * height);
        const isOpen = rawOpPx > 5.0;

        if (isOpen && onTrajectoryUpdate) {
          // Pixel Positions
          const nosePx = { x: nose.x * width, y: nose.y * height };
          const chinPx = { x: lockedChin.x * width, y: lockedChin.y * height };

          // Relative Motion (Chin - Nose) in Pixels
          // We use a small dampener (scale 0.5) to keep it inside the graph bounds
          // but since it's pixels, it will scale naturally with the screen.
          const relX = (nosePx.x - chinPx.x);
          const relY = (chinPx.y - nosePx.y); // Positive = Down (Screen Y is inverted relative to graph usually)

          // Note: TrajectoryGraph expects raw deltas. 
          // We'll handle scaling in the Graph component.
          if (Number.isFinite(relX) && Number.isFinite(relY)) {
            onTrajectoryUpdate({ x: relX, y: relY });
          }
        }

        // --- V9.4 VISUALIZATION: MANDIBLE & JAW ---
        // V14.0 PROCEDURAL RIGID MANDIBLE
        const M_PATH = LANDMARK_INDICES.MANDIBLE_PATH;
        let jawPoints: { x: number, y: number }[] = [];

        if (mandibleOffsetsRef.current) {
          jawPoints = mandibleOffsetsRef.current.map(offset => {
            const scaledX = offset.x * currentIPD;
            const scaledY = offset.y * currentIPD;
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

        // V20.0: Delegated to Visualizer
        visualizer.drawJawbase(jawPoints);

        // 2. VIRTUAL CHIN (Metric Stability ONLY)
        // We use a clone for metrics to not affect the visual drawing (which needs natural shape)
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

        // Inject Virtual Chin into METRIC array only
        metricLandmarks[152] = virtualChin;

        // 3. CALCULATE METRICS (Using Robust Virtual Chin)
        const metrics = calculateMetrics(metricLandmarks);

        // APPLY TARE VISUALLY (So canvas matches HUD)
        const displayMetrics = { ...metrics };
        if (tare) {
          displayMetrics.lateralDeviation -= tare.lateral;
          displayMetrics.openingAmplitude = Math.max(0, displayMetrics.openingAmplitude - tare.opening);
        }

        // ZERO-START MASK (Match App.tsx) - Increased to 5.0u for solid zero
        if (displayMetrics.openingAmplitude < 5.0) {
          displayMetrics.openingAmplitude = 0;
          displayMetrics.lateralDeviation = 0;
        }

        // onMetricsUpdate moved to end of loop (V20.4)

        // V20.0: DRAWING DELEGATION
        // 1. Reference Axis (Green Midline)
        const perpAngle = visualizer.drawReferenceAxis(lEye, rEye);

        // V20.1: PIXEL SPACE MATH (Aspect Ratio Correction)
        // We calculate IPD in pixels to match the pixel-space projection in stabilizer
        const pixelIPD = Math.sqrt(
          Math.pow((rEye.x - lEye.x) * width, 2) +
          Math.pow((rEye.y - lEye.y) * height, 2)
        );

        // V19.2: Encapsulated Axial Projection & Stabilizer
        const upperLipInner = smoothedLandmarks[13]; // Inner Upper
        const lowerLipInner = smoothedLandmarks[14]; // Inner Lower

        const { projectedPoint, amplitudeMM } = stabilizer.projectOpeningAcrossAxis(
          upperLipInner,
          lowerLipInner,
          perpAngle,
          pixelIPD, // Use Pixel IPD
          width,    // Pass Canvas Dimensions
          height
        );

        // 2. Axial Projection (White Line + Deviation)
        visualizer.drawAxialProjection(upperLipInner, lowerLipInner, projectedPoint);

        // V19.1: SNAP-RESPONSE STABILIZER (Damped Display)
        const stableAmp = stabilizer.stabilizeAmplitude(amplitudeMM);
        displayMetrics.openingAmplitude = stableAmp;

        // 3. HUD Metrics
        visualizer.drawMetrics(upperLipInner, stableAmp, displayMetrics.lateralDeviation);

        // V20.4: Sync HUD with Corrected Math
        // We update the app state only after all compensations (Stabilizer & Portrait Fix)
        onMetricsUpdate(displayMetrics, metricLandmarks);

        canvasCtx.restore();
      } catch (loopError) {
        console.error("FATAL: CameraView Loop Crashed", loopError);
      }
    } else {
      setActiveWarning(null);
    }
  }, [onMetricsUpdate, tare, activeWarning]);

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

    // Stream Setup
    if (videoRef.current && stream && active) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current && canvasRef.current) {
          videoRef.current.play().catch(e => console.error("Play error:", e));
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          setIsLoaded(true);

          // Start Loop
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

      </div>

      {/* V9.0 Notification UI */}
      <Notification
        isVisible={!!activeWarning}
        message={activeWarning?.msg || ''}
        type={activeWarning?.type || 'warning'}
      />
    </div>
  );
};

export default CameraView;
