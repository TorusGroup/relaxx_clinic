
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Onboarding from './components/Onboarding';
import CameraView from './components/CameraView';
import MetricsPanel from './components/MetricsPanel';
import ReportView from './components/ReportView';
import GuidanceSystem from './components/GuidanceSystem';
import FadeIn from './components/FadeIn'; // V7.0
import CountdownOverlay from './components/CountdownOverlay'; // V9.0 PROTOCOL
import TrajectoryGraph from './components/TrajectoryGraph'; // V9.0 VISUALS
import Notification from './components/Notification'; // V10.0 UI
import { AppState, DiagnosticMetrics, TelemetryData, Landmark, UserData } from './types';
import { generateClinicalReport } from './services/geminiService';
import { analyzeMotion, calculateATMScore } from './services/biomechanics'; // V9.0 Biomechanics
import { ATMAnalysisScreen } from './modules/atm-precision/views/ATMAnalysisScreen'; // V22.0 Module

const BUFFER_SIZE = 5;
const REPS_REQUIRED = 5;
const OPEN_THRESHOLD = 22; // Ajustado para ser mais responsivo

function App() {
  const [appState, setAppState] = useState<AppState>('ONBOARDING');
  const [metrics, setMetrics] = useState<DiagnosticMetrics>({
    verticalAlignment: 0,
    openingAmplitude: 0,
    lateralDeviation: 0,
    isCentered: true
  });

  const [repsCount, setRepsCount] = useState(0);
  const [isMouthOpen, setIsMouthOpen] = useState(false);
  const [userData, setUserData] = useState<UserData>({ name: '', whatsapp: '', email: '' });

  // V10.0 REPORT DATA
  const [reportData, setReportData] = useState<{ text: string; score: number } | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null); // Restored

  // V9.0 STATE
  const [trajectoryPath, setTrajectoryPath] = useState<{ x: number, y: number }[]>([]);

  // Taring (Auto-Calibration) Refs
  const tareRef = useRef({ lateral: 0, opening: 0 });
  const calibrationBuffer = useRef<DiagnosticMetrics[]>([]);

  // History Refs
  const telemetryHistory = useRef<TelemetryData[]>([]);
  const metricsBuffer = useRef<DiagnosticMetrics[]>([]);
  // V9.8 FIX: Double Counting Debouncer
  const lastRepTime = useRef<number>(0);

  const getGuidance = () => {
    switch (appState) {
      case 'PERMISSION_REQUEST': return { m: "Para analisarmos seu movimento, precisamos ver você.", s: "Sincronizando Sensores" };
      case 'CALIBRATION': return { m: "Respire fundo. Mantenha o olhar fixo.", s: "Encontrando seu ponto neutro..." };
      case 'EXERCISE': return {
        m: isMouthOpen ? "Feche a boca suavemente" : "Abra a boca suavemente o máximo que conseguir",
        s: `Protocolo Relaxx (${repsCount}/${REPS_REQUIRED})`
      };
      case 'LEAD_FORM': return { m: "Dados capturados. Prepare-se para o laudo.", s: "Processando seus dados..." };
      default: return { m: "", s: "" };
    }
  };

  // V5.0 SMART LOCK: Storage for previous smoothed value (EMA)
  const prevSmoothedRef = useRef<DiagnosticMetrics | null>(null);

  const smoothMetrics = (newMetrics: DiagnosticMetrics) => {
    // --- V5.0 CONFIGURATION ---
    // DISABLED FOR DIAGNOSIS (V6.2)
    const ENABLE_SMART_LOCK = false;
    const STABILITY_THRESHOLD = 2.0; // Units of change to consider "Movement"
    const STATIC_ALPHA = 0.05;       // Heavy smoothing (Lock) when static
    const DYNAMIC_ALPHA = 0.30;      // Light smoothing (Flow) when moving

    // V6.1 RESILIENCE: Sanitize Input
    if (isNaN(newMetrics.openingAmplitude) || isNaN(newMetrics.lateralDeviation)) {
      return { ...newMetrics, openingAmplitude: 0, lateralDeviation: 0 };
    }

    // INSTANT ZEROING (Fix Lag)
    // If input is clearly closed, FORCE Buffer to Zero immediately.
    // This kills the EMA "Momentum" and prevents the numbers from "floating down" slowly.
    if (newMetrics.openingAmplitude < 5.0) {
      const zeroed = { ...newMetrics, openingAmplitude: 0, lateralDeviation: 0 };
      prevSmoothedRef.current = zeroed;
      return zeroed;
    }

    if (ENABLE_SMART_LOCK) {
      // V6.1 RESILIENCE: Reset if corrupted state detected
      if (prevSmoothedRef.current && (isNaN(prevSmoothedRef.current.openingAmplitude) || isNaN(prevSmoothedRef.current.lateralDeviation))) {
        prevSmoothedRef.current = null;
      }

      if (!prevSmoothedRef.current) {
        prevSmoothedRef.current = newMetrics;
        return newMetrics;
      }

      const prev = prevSmoothedRef.current;

      // 1. Calculate Delta (Max change across main metrics)
      const delta = Math.max(
        Math.abs(newMetrics.openingAmplitude - prev.openingAmplitude),
        Math.abs(newMetrics.verticalAlignment - prev.verticalAlignment),
        Math.abs(newMetrics.lateralDeviation - prev.lateralDeviation)
      );

      // 2. Determine Alpha (Adaptive)
      // If signal changed less than threshold, assume noise -> Lock it down.
      // If signal changed more, assume user intent -> Let it flow.
      const alpha = delta < STABILITY_THRESHOLD ? STATIC_ALPHA : DYNAMIC_ALPHA;

      // 3. Apply Exponential Moving Average (EMA)
      const smoothed = {
        verticalAlignment: prev.verticalAlignment + alpha * (newMetrics.verticalAlignment - prev.verticalAlignment),
        openingAmplitude: prev.openingAmplitude + alpha * (newMetrics.openingAmplitude - prev.openingAmplitude),
        lateralDeviation: prev.lateralDeviation + alpha * (newMetrics.lateralDeviation - prev.lateralDeviation),
        isCentered: newMetrics.isCentered
      };

      prevSmoothedRef.current = smoothed;
      // Keeping logic block but unreachable for now
      return newMetrics;

    } else {
      // --- LEGACY LOGIC (Simple Moving Average) ---
      metricsBuffer.current.push(newMetrics);
      if (metricsBuffer.current.length > BUFFER_SIZE) metricsBuffer.current.shift();
      const count = metricsBuffer.current.length;
      return metricsBuffer.current.reduce((acc, m) => ({
        verticalAlignment: acc.verticalAlignment + m.verticalAlignment / count,
        openingAmplitude: acc.openingAmplitude + m.openingAmplitude / count,
        lateralDeviation: acc.lateralDeviation + m.lateralDeviation / count,
        isCentered: m.isCentered
      }), { verticalAlignment: 0, openingAmplitude: 0, lateralDeviation: 0, isCentered: false });
    }
  };

  /* 
   * CRITICAL FIX: Refs used to access latest state inside the purely stable callback
   * This prevents CameraView from re-rendering (and restarting the camera)
   * every time the mouth state changes.
   */
  const stateRef = useRef({ appState, isMouthOpen, repsCount });

  // Sync refs with state
  useEffect(() => {
    stateRef.current = { appState, isMouthOpen, repsCount };
  }, [appState, isMouthOpen, repsCount]);

  // V9.5 Fix: Store latest metrics in ref to avoid re-creating callbacks
  const latestMetricsRef = useRef<DiagnosticMetrics>(metrics);

  const handleMetricsUpdate = useCallback((rawMetrics: DiagnosticMetrics, landmarks: Landmark[]) => {
    // Access latest state via ref to avoid breaking callback stability
    const { appState: currentAppState, isMouthOpen: currentIsMouthOpen, repsCount: currentRepsCount } = stateRef.current;

    // Always smooth metrics first
    const smoothed = smoothMetrics(rawMetrics);

    // Update stable ref
    latestMetricsRef.current = smoothed;

    // LOGGING FOR DIAGNOSIS (V6.2)
    if (Math.random() < 0.05) { // Sample 5% of frames to avoid spam
      console.log("Health Check:", {
        state: currentAppState,
        raw: rawMetrics.openingAmplitude.toFixed(1),
        smooth: smoothed.openingAmplitude.toFixed(1),
        tare: tareRef.current.opening.toFixed(1)
      });
    }

    // Apply Taring (Subtract Calibration Offset)
    if (currentAppState === 'EXERCISE' || currentAppState === 'LEAD_FORM') {
      smoothed.lateralDeviation -= tareRef.current.lateral;
      smoothed.openingAmplitude = Math.max(0, smoothed.openingAmplitude - tareRef.current.opening);

      // ZERO-START DEADBAND (Suggestion Logic)
      // Logic: If mouth is effectively closed (< 5.0u), assume NO deviation.
      // This creates a clean "0.0 / 0.0" start and prevents static head-roll noise.
      if (smoothed.openingAmplitude < 5.0) {
        smoothed.openingAmplitude = 0;
        smoothed.lateralDeviation = 0;
      }
    }

    // Logging for diagnosis of "Zero Stick"
    if (currentIsMouthOpen && smoothed.openingAmplitude === 0) {
      console.warn("Metrics Zeroed while Open! Raw:", rawMetrics.openingAmplitude);
    }

    setMetrics(smoothed);

    // State Transitions Logic
    if (currentAppState === 'CALIBRATION') {
      if (smoothed.isCentered) {
        calibrationBuffer.current.push(smoothed);

        // Require 30 frames (~1s at 30fps)
        if (calibrationBuffer.current.length > 30) {
          // STABILITY CHECK (Standard Deviation)
          const mean = calibrationBuffer.current.reduce((sum, m) => sum + m.lateralDeviation, 0) / calibrationBuffer.current.length;
          const variance = calibrationBuffer.current.reduce((sum, m) => sum + Math.pow(m.lateralDeviation - mean, 2), 0) / calibrationBuffer.current.length;
          const stdDev = Math.sqrt(variance);

          // Threshold: 0.5u (Strict stability) used to reject "moving" calibrations
          if (stdDev < 0.5) {
            const avgOpening = calibrationBuffer.current.reduce((sum, m) => sum + m.openingAmplitude, 0) / calibrationBuffer.current.length;

            tareRef.current = { lateral: mean, opening: avgOpening };
            console.log("Auto-Calibration Completed. Tare Offset:", tareRef.current, "StdDev:", stdDev);

            calibrationBuffer.current = []; // Reset
            setAppState('EXERCISE');
          } else {
            console.log("Calibration Rejected - Too much movement. StdDev:", stdDev.toFixed(2));
            // Keep the last 15 frames to try again quickly (rolling buffer), discard oldest 15
            calibrationBuffer.current = calibrationBuffer.current.slice(15);
          }
        }
      } else {
        // Reset buffer if user moves out of center during calibration
        if (calibrationBuffer.current.length > 0) {
          calibrationBuffer.current = [];
        }
      }
    }

    if (currentAppState === 'EXERCISE') {
      telemetryHistory.current.push({ timestamp: Date.now(), metrics: smoothed });

      const adjustedThreshold = 18; // Sensitivity

      // V9.8 FIX: Double Counting & Graph Reset
      const now = Date.now();
      // Ref is now top-level


      if (smoothed.openingAmplitude > adjustedThreshold && !currentIsMouthOpen) {
        setIsMouthOpen(true);
        // V9.9 FIX: Clear Trajectory IMMEDIATELY on Rep Start
        // This ensures the Anchor (path[0]) is the "Closed" position of the NEW rep.
        setTrajectoryPath([]);
      } else if (smoothed.openingAmplitude < (adjustedThreshold * 0.6) && currentIsMouthOpen) {
        // DEBOUNCE: Only count if > 1.0s since last rep to prevent jitter/double-clutch
        if (now - lastRepTime.current > 1000) {
          setIsMouthOpen(false);
          setRepsCount(c => c + 1);
          lastRepTime.current = now;

          // AUTO-RESET GRAPH: Clear trajectory on every closed mouth (Cleaner Visuals)
          // setResetTrigger(t => t + 1);
        } else {
          // Just close state, don't count if too fast
          setIsMouthOpen(false);
        }
      }
    }
  }, []); // Empty dependency array = Stable Reference = No Camera Restart!

  useEffect(() => {
    if (repsCount >= REPS_REQUIRED && appState === 'EXERCISE') {
      setAppState('LEAD_FORM');
    }
  }, [repsCount, appState]);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingReport(true);
    // V9.0: Include Click Count in Report Generation
    const generatedText = await generateClinicalReport(telemetryHistory.current, clicksDetected);

    // V10.0: Calculate Score
    const avgMetrics = {
      openingAmplitude: telemetryHistory.current.reduce((acc, h) => acc + h.metrics.openingAmplitude, 0) / Math.max(1, telemetryHistory.current.length),
      lateralDeviation: telemetryHistory.current.reduce((acc, h) => acc + h.metrics.lateralDeviation, 0) / Math.max(1, telemetryHistory.current.length),
      verticalAlignment: 0,
      isCentered: true
    };
    const score = calculateATMScore(avgMetrics);

    setReportData({ text: generatedText, score });
    setIsLoadingReport(false);
    setAppState('REPORTING');
  };

  // V9.0 Biomechanics
  const [clicksDetected, setClicksDetected] = useState(0);
  const [showClickWarning, setShowClickWarning] = useState(false);
  const clickWarningTimeout = useRef<number | null>(null);

  // V9.9 TRAJECTORY REFACTOR (Centralized State)
  const handleTrajectoryVector = useCallback((vector: { x: number, y: number }) => {
    // Only record if we are "In Rep" (Mouth Open)
    if (stateRef.current.isMouthOpen && stateRef.current.appState === 'EXERCISE') {
      setTrajectoryPath(prev => {
        // Limit history to ~2s (60 frames)
        if (prev.length > 60) {
          return [...prev.slice(1), vector];
        }

        // V9.9 POLLUTION FILTER: Ignore micro-movements (Static Jitter)
        // This prevents "blobbing" when user holds the mouth open.
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          const dist = Math.sqrt(Math.pow(vector.x - last.x, 2) + Math.pow(vector.y - last.y, 2));
          if (dist < 0.001) return prev; // Filter out < 1mm (approx) movements

          // V9.0 BIOMECHANICS: Click/Pop Detection
          // Analyze velocity between last point and current point
          const motionAnalysis = analyzeMotion(vector, last, 33); // 33ms = ~30fps

          if (motionAnalysis.isClick) {
            setClicksDetected(c => c + 1);
            setShowClickWarning(true);

            // Clear warning after 1s
            if (clickWarningTimeout.current) clearTimeout(clickWarningTimeout.current);
            clickWarningTimeout.current = window.setTimeout(() => setShowClickWarning(false), 1000);
          }
        }

        return [...prev, vector];
      });
    }
  }, []);

  const handleCountdownComplete = useCallback(() => {
    // V9.4 AUTO-TARE - DISABLED (V9.8 FIX)
    tareRef.current = { lateral: 0, opening: 0 };
    console.log("Protocol Started. Auto-Tare DISABLED.");

    // V9.9: Clear path explicitly
    setTrajectoryPath([]);

    // Reset buffer to ensure clean start
    metricsBuffer.current = [];
    setAppState('EXERCISE');
  }, []);

  const handleCameraPermission = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        },
        audio: false
      });
      setStream(mediaStream);
      // Only set state if we are in the initial request phase
      if (appState === 'PERMISSION_REQUEST') {
        setAppState('COUNTDOWN'); // Fix: Go to Countdown Analysis
      }
    } catch (err) {
      console.error("Camera denied:", err);
      setPermissionError("Permissão negada. Verifique as configurações do navegador.");
    }
  };

  // V6.0 MOBILE RESUME FIX: Handle tab switching/minimizing
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log("App resumed. Checking camera stream...");

        // V6.1 RESILIENCE: Force reset of Smoothing Buffers to prevent "Frozen Numbers"
        prevSmoothedRef.current = null;
        metricsBuffer.current = [];

        // If we are in an active state but stream is missing or inactive, try to restore
        if (['CALIBRATION', 'EXERCISE'].includes(appState)) {
          if (!stream || !stream.active) {
            console.log("Stream invalid on resume. Attempting restore...");
            await handleCameraPermission();
          } else {
            // Even if stream object exists, mobile browsers might freeze the track
            stream.getVideoTracks().forEach(track => {
              track.enabled = true;
              // track.applyConstraints() might wake it up?
            });
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [appState, stream]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#001A13]">
      {appState === 'ONBOARDING' && <Onboarding onStart={() => setAppState('PERMISSION_REQUEST')} onDevMode={() => setAppState('ATM_PRECISION')} />}

      {/* CAMERA ALWAYS ACTIVE in these states to prevent black screen */}
      {/* Added COUNTDOWN to this list so camera stays on behind the overlay */}
      {/* CAMERA ALWAYS ACTIVE in these states to prevent black screen */}
      {/* Added ALL states to ensure UI renders (PERMISSION, LEAD, REPORTING) */}
      {['COUNTDOWN', 'CALIBRATION', 'EXERCISE', 'INSTRUCTION', 'PERMISSION_REQUEST', 'LEAD_FORM', 'REPORTING'].includes(appState) && (
        <>
          {stream && (
            <CameraView
              onCameraReady={() => { }}
              onMetricsUpdate={handleMetricsUpdate}
              stream={stream}
              tare={tareRef.current}
              onTrajectoryUpdate={handleTrajectoryVector} // V9.9
            />
          )}

          {appState === 'COUNTDOWN' && (
            <CountdownOverlay onComplete={handleCountdownComplete} />
          )}

          {/* GUIDANCE & METRICS (Hidden during form/permission/countdown) */}
          {['CALIBRATION', 'EXERCISE'].includes(appState) && (
            <>
              <GuidanceSystem
                message={getGuidance().m}
                subMessage={getGuidance().s}
                progress={appState === 'EXERCISE' ? repsCount / REPS_REQUIRED : undefined}
              />
              <MetricsPanel metrics={metrics} isRecording={appState === 'EXERCISE'} />
            </>
          )}

          {appState === 'EXERCISE' && (
            <>
              {/* V10.0 Breathing Background Logo */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none z-0">
                <style>{`
                    @keyframes relaxx-breath {
                        0%, 100% { scale: 1; opacity: 0.02; }
                        50% { scale: 1.1; opacity: 0.04; }
                    }
                    .animate-relaxx-breath { animation: relaxx-breath 8s ease-in-out infinite; }
                  `}</style>
                <img src="/logo_icon.png" className="w-[80%] h-[80%] object-contain animate-relaxx-breath" alt="" />
              </div>

              {/* V9.7: Trajectory Graph Overlay */}
              <div className="absolute top-1/2 -translate-y-1/2 right-8 z-40 w-auto animate-in fade-in slide-in-from-right duration-1000">
                <TrajectoryGraph path={trajectoryPath} />
              </div>

              {/* V9.0 BIOMECHANICS: Click Warning (New UI) */}
              <Notification
                isVisible={showClickWarning}
                message="ESTALO DETECTADO"
                type="error"
              />
            </>
          )}

          {appState === 'PERMISSION_REQUEST' && (
            <FadeIn className="absolute inset-0 z-[210] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md" duration={800}>
              <div className="max-w-sm w-full bg-[#002D20] border border-white/10 p-10 rounded-[48px] text-center space-y-8">
                <div className="w-16 h-16 bg-[#00FF66]/10 rounded-3xl mx-auto flex items-center justify-center animate-pulse">
                  <svg className="w-8 h-8 text-[#00FF66]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <p className="text-white text-lg font-medium">Para analisarmos seu movimento, precisamos ver você.</p>
                {permissionError && <p className="text-red-400 text-xs font-bold">{permissionError}</p>}
                <button
                  onClick={handleCameraPermission}
                  className="btn-relaxx w-full py-5 rounded-full font-black uppercase tracking-widest text-[10px] active:scale-95 transition-transform"
                >
                  Autorizar Câmera
                </button>
              </div>
            </FadeIn>
          )}

          {appState === 'LEAD_FORM' && (
            <FadeIn className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" duration={1000}>
              <div className="max-w-md w-full bg-[#002D20]/90 backdrop-blur-xl p-8 md:p-12 rounded-[48px] border border-white/10 shadow-2xl space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-[#00FF66] text-xs font-black uppercase tracking-[0.4em]">Análise Concluída</h2>
                  <p className="text-white text-xl font-bold">Qual seu melhor contato para enviarmos a sua análise?</p>
                </div>
                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <input required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-[#00FF66] outline-none transition-colors" placeholder="Nome Completo" value={userData.name} onChange={e => setUserData({ ...userData, name: e.target.value })} />
                  <input required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-[#00FF66] outline-none transition-colors" placeholder="WhatsApp" type="tel" value={userData.whatsapp} onChange={e => setUserData({ ...userData, whatsapp: e.target.value })} />
                  <input required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-[#00FF66] outline-none transition-colors" placeholder="E-mail Corporativo" type="email" value={userData.email} onChange={e => setUserData({ ...userData, email: e.target.value })} />
                  <button disabled={isLoadingReport} className="btn-relaxx w-full py-5 rounded-full font-black uppercase tracking-[0.3em] text-[10px] mt-4 shadow-2xl">
                    {isLoadingReport ? 'Sincronizando...' : 'Ver minha análise completa'}
                  </button>
                </form>
              </div>
            </FadeIn>
          )}

          {appState === 'REPORTING' && reportData && (
            <ReportView
              report={reportData.text}
              score={reportData.score}
              clicks={clicksDetected}
              history={telemetryHistory.current}
              onReset={() => window.location.reload()}
            />
          )}
        </>
      )}

      {/* V22.0 NEW MODULE ROUTE */}
      {appState === 'ATM_PRECISION' && (
        <ATMAnalysisScreen />
      )}
    </div>
  );
}


export default App;
