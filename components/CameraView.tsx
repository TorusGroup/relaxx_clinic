
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { LANDMARK_INDICES, COLORS } from '../constants';
import { calculateMetrics } from '../services/analysisEngine';
import { DiagnosticMetrics, Landmark } from '../types';

interface Props {
  onMetricsUpdate: (metrics: DiagnosticMetrics, landmarks: Landmark[]) => void;
}

const CameraView: React.FC<Props> = ({ onMetricsUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceMeshRef = useRef<any>(null);
  const requestRef = useRef<number>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onResults = useCallback((results: any) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      const metrics = calculateMetrics(landmarks);
      onMetricsUpdate(metrics, landmarks);

      // Renderização mais leve para evitar lag
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = COLORS.RELAXX_GREEN;

      const drawPoint = (p: Landmark, size = 1.5, color = COLORS.RELAXX_GREEN) => {
        canvasCtx.fillStyle = color;
        canvasCtx.beginPath();
        // Mirror X coordinate since we removed canvas scaling
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

      const forehead = landmarks[LANDMARK_INDICES.FOREHEAD];
      const chin = landmarks[LANDMARK_INDICES.CHIN];
      drawLine(forehead, chin, COLORS.RELAXX_GREEN, 0.2);

      // Path mandibular (Simplified for performance)
      canvasCtx.globalAlpha = 0.6;
      canvasCtx.beginPath();
      LANDMARK_INDICES.MANDIBLE_PATH.forEach((idx, i) => {
        const p = landmarks[idx];
        const x = (1 - p.x) * canvasRef.current!.width; // Mirror X
        const y = p.y * canvasRef.current!.height;
        if (i === 0) canvasCtx.moveTo(x, y);
        else canvasCtx.lineTo(x, y);
      });
      canvasCtx.stroke();

      const upper = landmarks[LANDMARK_INDICES.UPPER_LIP];
      const lower = landmarks[LANDMARK_INDICES.LOWER_LIP];
      drawLine(upper, lower, '#FFFFFF', 0.8);
      drawPoint(upper, 2, '#FFFFFF');
      drawPoint(lower, 2, '#FFFFFF');

      // VISUAL MATH: Display Metrics near the face
      // We position the text to the LEFT of the mouth (since image is mirrored, right becomes left)
      const textX = ((1 - upper.x) * canvasRef.current!.width) + 20;
      const textY = (upper.y * canvasRef.current!.height);

      canvasCtx.font = "600 12px 'JetBrains Mono'";
      canvasCtx.fillStyle = "rgba(0, 255, 102, 0.9)";
      canvasCtx.shadowColor = "rgba(0, 0, 0, 0.8)";
      canvasCtx.shadowBlur = 4;

      // Draw calculated amplitude
      canvasCtx.fillText(`AMP: ${metrics.openingAmplitude.toFixed(1)}mm`, textX, textY);

      // Draw Lateral Deviation if significant
      if (Math.abs(metrics.lateralDeviation) > 1) {
        canvasCtx.fillStyle = Math.abs(metrics.lateralDeviation) > 5 ? "#FF3333" : "rgba(255, 255, 255, 0.8)";
        canvasCtx.fillText(`DEV: ${metrics.lateralDeviation.toFixed(1)}mm`, textX, textY + 16);
      }
    }
    canvasCtx.restore();
  }, [onMetricsUpdate]);

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

    const processVideo = async () => {
      if (videoRef.current && videoRef.current.readyState >= 2 && active) {
        try {
          await faceMesh.send({ image: videoRef.current });
        } catch (e) {
          console.debug("Frame skip");
        }
      }
      if (active) {
        requestRef.current = requestAnimationFrame(processVideo);
      }
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
            frameRate: { ideal: 30 }
          },
          audio: false
        });

        if (videoRef.current && active) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current && canvasRef.current) {
              videoRef.current.play();
              // SYNC CANVAS WITH VIDEO SOURCE
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
              setIsLoaded(true);
              processVideo();
            }
          };
        }
      } catch (err) {
        setError("Acesso à câmera negado.");
      }
    };

    startCamera();

    return () => {
      active = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      faceMesh.close();
    };
  }, [onResults]);

  return (
    <div className="relative w-full h-screen bg-[#001A13] flex items-center justify-center overflow-hidden">
      {!isLoaded && !error && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#001A13]">
          <div className="w-12 h-12 border-2 border-t-[#00FF66] border-[#00FF66]/10 rounded-full animate-spin mb-4" />
          <p className="text-[#00FF66] font-black uppercase tracking-[0.4em] text-[9px] animate-pulse">Iniciando Biometria...</p>
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
          className="absolute inset-0 w-full h-full object-cover md:rounded-[40px] pointer-events-none"
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
