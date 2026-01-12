
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Onboarding from './components/Onboarding';
import CameraView from './components/CameraView';
import MetricsPanel from './components/MetricsPanel';
import ReportView from './components/ReportView';
import GuidanceSystem from './components/GuidanceSystem';
import { AppState, DiagnosticMetrics, TelemetryData, Landmark, UserData } from './types';
import { generateClinicalReport } from './services/geminiService';

const BUFFER_SIZE = 5;
const REPS_REQUIRED = 5;
const OPEN_THRESHOLD = 22; // Ajustado para ser mais responsivo

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('ONBOARDING');
  const [metrics, setMetrics] = useState<DiagnosticMetrics>({
    verticalAlignment: 0,
    openingAmplitude: 0,
    lateralDeviation: 0,
    isCentered: false
  });

  const [repsCount, setRepsCount] = useState(0);
  const [isMouthOpen, setIsMouthOpen] = useState(false);
  const [userData, setUserData] = useState<UserData>({ name: '', whatsapp: '', email: '' });
  const [report, setReport] = useState<string | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Taring (Auto-Calibration) Refs
  const tareRef = useRef({ lateral: 0, opening: 0 });
  const calibrationBuffer = useRef<DiagnosticMetrics[]>([]);

  // History Refs
  const telemetryHistory = useRef<TelemetryData[]>([]);
  const metricsBuffer = useRef<DiagnosticMetrics[]>([]);

  const getGuidance = () => {
    switch (appState) {
      case 'PERMISSION_REQUEST': return { m: "Iniciando inteligência diagnóstica Relaxx.", s: "Sincronizando Sensores" };
      case 'CALIBRATION': return { m: "Mantenha o rosto ABSOLUTAMENTE IMÓVEL.", s: "Calibrando Zero Biológico..." };
      case 'EXERCISE': return { m: `Abra a boca suavemente (${repsCount}/${REPS_REQUIRED}).`, s: "Capturando Movimento" };
      case 'LEAD_FORM': return { m: "Dados capturados. Prepare-se para o laudo.", s: "Criptografando Telemetria" };
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

  const handleMetricsUpdate = useCallback((rawMetrics: DiagnosticMetrics, landmarks: Landmark[]) => {
    // Access latest state via ref to avoid breaking callback stability
    const { appState: currentAppState, isMouthOpen: currentIsMouthOpen, repsCount: currentRepsCount } = stateRef.current;

    // Always smooth metrics first
    const smoothed = smoothMetrics(rawMetrics);

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
      // Logic: If mouth is effectively closed (< 2.5u), assume NO deviation.
      // This creates a clean "0.0 / 0.0" start and prevents static head-roll noise.
      if (smoothed.openingAmplitude < 2.5) {
        smoothed.openingAmplitude = 0;
        smoothed.lateralDeviation = 0;
      }
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

      if (smoothed.openingAmplitude > adjustedThreshold && !currentIsMouthOpen) {
        setIsMouthOpen(true);
      } else if (smoothed.openingAmplitude < (adjustedThreshold * 0.6) && currentIsMouthOpen) {
        setIsMouthOpen(false);
        setRepsCount(c => c + 1);
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
    const generatedReport = await generateClinicalReport(telemetryHistory.current);
    setReport(generatedReport);
    setIsLoadingReport(false);
    setAppState('REPORTING');
  };

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

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
        setAppState('CALIBRATION');
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
      {appState === 'ONBOARDING' && <Onboarding onStart={() => setAppState('PERMISSION_REQUEST')} />}

      {/* CAMERA ALWAYS ACTIVE in these states to prevent black screen */}
      {(appState === 'CALIBRATION' || appState === 'EXERCISE' || appState === 'PERMISSION_REQUEST' || appState === 'LEAD_FORM') && (
        <>
          {stream && (
            <CameraView
              onMetricsUpdate={handleMetricsUpdate}
              stream={stream}
              tare={tareRef.current}
            />
          )}

          {appState !== 'LEAD_FORM' && (
            <GuidanceSystem message={getGuidance().m} subMessage={getGuidance().s} />
          )}

          {appState !== 'LEAD_FORM' && (
            <MetricsPanel metrics={metrics} isRecording={appState === 'EXERCISE'} />
          )}

          {appState === 'EXERCISE' && (
            <div className="fixed bottom-12 md:bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[240px] z-50">
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-[#00FF66]/40 to-[#00FF66] transition-all duration-700"
                  style={{ width: `${(repsCount / REPS_REQUIRED) * 100}%` }}
                />
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-[8px] text-[#00FF66] font-black uppercase tracking-widest">Protocolo Relaxx</span>
                <span className="text-white font-mono text-xs">{repsCount}/{REPS_REQUIRED}</span>
              </div>
            </div>
          )}
        </>
      )}

      {appState === 'PERMISSION_REQUEST' && (
        <div className="absolute inset-0 z-[210] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md">
          <div className="max-w-sm w-full bg-[#002D20] border border-white/10 p-10 rounded-[48px] text-center space-y-8">
            <div className="w-16 h-16 bg-[#00FF66]/10 rounded-3xl mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-[#00FF66]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <p className="text-white text-lg font-medium">Precisamos acessar sua câmera para iniciar a biometria.</p>
            {permissionError && <p className="text-red-400 text-xs font-bold">{permissionError}</p>}
            <button
              onClick={handleCameraPermission}
              className="btn-relaxx w-full py-5 rounded-full font-black uppercase tracking-widest text-[10px] active:scale-95 transition-transform"
            >
              Autorizar Câmera
            </button>
          </div>
        </div>
      )}

      {appState === 'LEAD_FORM' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="max-w-md w-full bg-[#002D20]/90 backdrop-blur-xl p-8 md:p-12 rounded-[48px] border border-white/10 shadow-2xl space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-[#00FF66] text-xs font-black uppercase tracking-[0.4em]">Análise Concluída</h2>
              <p className="text-white text-xl font-bold">Identifique-se para o Laudo</p>
            </div>
            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <input required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-[#00FF66] outline-none" placeholder="Nome Completo" value={userData.name} onChange={e => setUserData({ ...userData, name: e.target.value })} />
              <input required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-[#00FF66] outline-none" placeholder="WhatsApp" type="tel" value={userData.whatsapp} onChange={e => setUserData({ ...userData, whatsapp: e.target.value })} />
              <input required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-[#00FF66] outline-none" placeholder="E-mail Corporativo" type="email" value={userData.email} onChange={e => setUserData({ ...userData, email: e.target.value })} />
              <button disabled={isLoadingReport} className="btn-relaxx w-full py-5 rounded-full font-black uppercase tracking-[0.3em] text-[10px] mt-4 shadow-2xl">
                {isLoadingReport ? 'Sincronizando...' : 'Gerar Bio-Laudo Digital'}
              </button>
            </form>
          </div>
        </div>
      )}

      {appState === 'REPORTING' && report && (
        <ReportView report={report} onReset={() => window.location.reload()} />
      )}
    </div>
  );
};

export default App;
