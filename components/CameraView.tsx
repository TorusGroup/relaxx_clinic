import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { LANDMARK_INDICES, COLORS } from '../constants';
import { calculateMetrics } from '../services/analysisEngine';
import { DiagnosticMetrics, Landmark } from '../types';
import { OneEuroFilter } from '../utils/oneEuroFilter';
import { chaikinSmooth } from '../utils/geometry';

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

  // ONE EURO FILTERS: Map of landmarkIndex -> {x: Filter, y: Filter, z: Filter}
  const filtersRef = useRef<Map<number, { x: OneEuroFilter, y: OneEuroFilter, z: OneEuroFilter }>>(new Map());

  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDetectedFace, setHasDetectedFace] = useState(false); // V6.0 Cinematic Entry

  // V8.0 PHYSICS: Mandible Lock & Trajectory
  const chinOffsetRef = useRef<{ x: number, y: number } | null>(null);
  // trajectoryRef REMOVED (V9.9) - State in App.tsx

  // Initialize filters for key landmarks (Face Oval, Lips, Chin)
  // V6.0 FIX: Initialize with CURRENT value to prevent "flying" glitch from (0,0)
  const getFilters = (idx: number, initValue: { x: number, y: number, z: number }) => {
    if (!filtersRef.current.has(idx)) {
      // Config: Freq 30Hz, MinCutoff 1.0 (slow), Beta 0.0 (latency), DCutoff 1.0
      // For Chin, we want HIGH stability.
      filtersRef.current.set(idx, {
        x: new OneEuroFilter(30, 0.5, 0.001, 1),
        y: new OneEuroFilter(30, 0.5, 0.001, 1),
        z: new OneEuroFilter(30, 0.5, 0.001, 1)
      });
      // Force internal state to current value immediately
      filtersRef.current.get(idx)!.x.filter(initValue.x, -1); // prime the filter
      filtersRef.current.get(idx)!.y.filter(initValue.y, -1);
      filtersRef.current.get(idx)!.z.filter(initValue.z, -1);
    }
    return filtersRef.current.get(idx)!;
  };

  const onResults = useCallback((results: any) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      try {
        // Cinematically Reveal UI on first detection
        if (!hasDetectedFace) setHasDetectedFace(true);

        const rawLandmarks = results.multiFaceLandmarks[0];
        const timestamp = Date.now() / 1000;

        // 1. ADVANCED SMOOTHING (One Euro Filter)
        // DEDUPLICATE INDICES to prevent multiple filter steps per frame (Causes NaN)
        const indicesToSmooth = Array.from(new Set([
          ...Object.values(LANDMARK_INDICES).filter(v => typeof v === 'number') as number[],
          ...LANDMARK_INDICES.MANDIBLE_PATH,
          ...[377, 400, 378, 148, 175, 150]
        ]));

        const smoothedLandmarks = [...rawLandmarks];

        indicesToSmooth.forEach((idx) => {
          // V6.0: Pass raw value for initialization
          const f = getFilters(idx, rawLandmarks[idx]);
          smoothedLandmarks[idx] = {
            x: f.x.filter(rawLandmarks[idx].x, timestamp),
            y: f.y.filter(rawLandmarks[idx].y, timestamp),
            z: f.z.filter(rawLandmarks[idx].z, timestamp)
          };
        });

        // --- V9.1 MANDIBLE PHYSICS LOCK (Scale Invariant) ---
        // Concept: The chin bone (152) is rigidly connected to the lower lip bone insertion.
        // We assume the distance LowerLipBottom (17) -> Chin (152) is proportionally CONSTANT to Face Size (IPD).

        const lowerLipBottom = smoothedLandmarks[17];
        const rawChin = smoothedLandmarks[152]; // We use 152 (Menton) as anchor

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

        // APPLY PHYSICS LOCK
        // VirtualChin = LowerLip + (FixedRatio * CurrentIPD)
        const lockedChin = {
          x: lowerLipBottom.x + (chinOffsetRef.current.x * currentIPD),
          y: lowerLipBottom.y + (chinOffsetRef.current.y * currentIPD),
          z: rawChin.z
        };

        // OVERRIDE the smoothed landmark 152 with our Locked Physics version
        smoothedLandmarks[152] = lockedChin;
        // --- V9.7 TRAJECTORY ENGINE (Z-Axis Invariant) ---
        // Use Relative Motion (Chin - Nose) NORMALIZED by Face Scale (IPD)
        const REFERENCE_IPD = 0.06; // Normalized reference size (approx)
        const zCorrection = REFERENCE_IPD / currentIPD;

        // Gate: Only record if mouth is actually open > 2.0u (Avoid Static Noise)
        // Note: displayMetrics calculated later, but we need raw check
        const rawOp = Math.sqrt(Math.pow(smoothedLandmarks[LANDMARK_INDICES.LOWER_LIP].y - smoothedLandmarks[LANDMARK_INDICES.UPPER_LIP].y, 2));
        const isOpen = rawOp > 0.015;

        if (isOpen && onTrajectoryUpdate) {
          // Calculate Relative Motion corrected for Z-Depth
          const relX = (nose.x - lockedChin.x) * zCorrection;
          const relY = (lockedChin.y - nose.y) * zCorrection; // Positive = Down

          // V9.9 SANITIZATION: Protect against NaN/Inf explosions
          if (Number.isFinite(relX) && Number.isFinite(relY)) {
            onTrajectoryUpdate({ x: relX, y: relY });
          }
        }

        // --- V9.4 VISUALIZATION: ELLIPTICAL CHIN ---
        const { width, height } = canvasRef.current;

        // "Reduced Set" of Key Anchors for U-Shape (stripping out bumpy intermediate points)
        // Left Jaw -> Mid Left -> Chin -> Mid Right -> Right Jaw
        const U_SHAPE_INDICES = [172, 136, 150, 152, 379, 365, 397];

        const jawPoints = U_SHAPE_INDICES.map(idx => {
          const p = smoothedLandmarks[idx];
          return { x: (1 - p.x) * width, y: p.y * height };
        });

        // Hyper-Smooth the Reduced Set (4 iterations = Liquid)
        const smoothJaw = chaikinSmooth(jawPoints, 4, false);

        if (smoothJaw.length > 2) {
          canvasCtx.beginPath();
          canvasCtx.moveTo(smoothJaw[0].x, smoothJaw[0].y);
          for (let i = 1; i < smoothJaw.length; i++) {
            canvasCtx.lineTo(smoothJaw[i].x, smoothJaw[i].y);
          }
        }

        canvasCtx.lineWidth = 3;
        canvasCtx.strokeStyle = '#00FF66';
        canvasCtx.shadowBlur = 20; // Neon Glow
        canvasCtx.shadowColor = 'rgba(0, 255, 102, 0.6)';
        canvasCtx.lineCap = 'round';
        canvasCtx.lineJoin = 'round';
        canvasCtx.stroke();

        // DO NOT draw individual dots anymore (Removed the 'arc' loop)


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

        onMetricsUpdate(metrics, metricLandmarks);

        // 4. DRAWING (Using Natural Smoothed Landmarks)
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = COLORS.RELAXX_GREEN;

        const drawPoint = (p: Landmark, size = 1.5, color = COLORS.RELAXX_GREEN) => {
          canvasCtx.fillStyle = color;
          canvasCtx.beginPath();
          // Mirror X
          canvasCtx.arc((1 - p.x) * canvasRef.current!.width, p.y * canvasRef.current!.height, size, 0, 2 * Math.PI);
          canvasCtx.fill();
        };

        const drawLine = (p1: Landmark, p2: Landmark, color = COLORS.RELAXX_GREEN, alpha = 0.4) => {
          canvasCtx.globalAlpha = alpha;
          canvasCtx.strokeStyle = color;
          canvasCtx.beginPath();
          canvasCtx.moveTo((1 - p1.x) * canvasRef.current!.width, p1.y * canvasRef.current!.height);
          canvasCtx.lineTo((1 - p2.x) * canvasRef.current!.width, p2.y * canvasRef.current!.height);
          canvasCtx.stroke();
        };

        const midEyeLandmark = {
          x: (smoothedLandmarks[33].x + smoothedLandmarks[263].x) / 2,
          y: (smoothedLandmarks[33].y + smoothedLandmarks[263].y) / 2,
          z: (smoothedLandmarks[33].z + smoothedLandmarks[263].z) / 2
        };

        const chin = smoothedLandmarks[LANDMARK_INDICES.CHIN]; // Now Virtual Chin

        // ALIGN VISUALS WITH MATH: Draw line from Eye Midpoint (Math Anchor) to Chin
        drawLine(midEyeLandmark, chin, COLORS.RELAXX_GREEN, 0.4);

        const upper = smoothedLandmarks[LANDMARK_INDICES.UPPER_LIP];
        const lower = smoothedLandmarks[LANDMARK_INDICES.LOWER_LIP];
        drawLine(upper, lower, '#FFFFFF', 0.8);
        drawPoint(upper, 2, '#FFFFFF');
        drawPoint(lower, 2, '#FFFFFF');

        // VISUAL MATH
        const textX = ((1 - upper.x) * canvasRef.current!.width) + 20;
        const textY = (upper.y * canvasRef.current!.height);

        canvasCtx.font = "600 12px 'JetBrains Mono'";
        canvasCtx.fillStyle = "rgba(0, 255, 102, 0.9)";
        canvasCtx.shadowColor = "rgba(0, 0, 0, 0.8)";
        canvasCtx.shadowBlur = 4;

        // Updated Unit: 'u' to match HUD
        canvasCtx.fillText(`AMP: ${displayMetrics.openingAmplitude.toFixed(1)}u`, textX, textY);

        if (Math.abs(displayMetrics.lateralDeviation) > 1) {
          canvasCtx.fillStyle = Math.abs(displayMetrics.lateralDeviation) > 5 ? "#FF3333" : "rgba(255, 255, 255, 0.8)";
          canvasCtx.fillText(`DEV: ${displayMetrics.lateralDeviation.toFixed(1)}u`, textX, textY + 16);
        }

      } catch (loopError) {
        console.error("FATAL: CameraView Loop Crashed", loopError);
      }
    }
    canvasCtx.restore();
  }, [onMetricsUpdate, tare]);

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

        {/* Mirror Guide Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-12">
          <div className="w-full h-full max-w-[280px] md:max-w-[400px] border border-white/10 rounded-[80px] md:rounded-[120px] relative shadow-[0_0_100px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-white/5" />
            <div className="absolute top-[40%] left-0 w-full h-[1px] bg-white/5" />

            <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-[#00FF66]/40 rounded-tl-[60px]" />
            <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-[#00FF66]/40 rounded-tr-[60px]" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-[#00FF66]/40 rounded-bl-[60px]" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-[#00FF66]/40 rounded-br-[60px]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraView;
