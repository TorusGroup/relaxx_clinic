import React, { useState, useEffect, useRef } from 'react';
import { HighPrecisionCamera } from '../components/HighPrecisionCamera';
import { TrajectoryGraph } from '../components/TrajectoryGraph';
import { JawMetrics } from '../analysis/JawMovementAnalyzer';

/**
 * 🏥 ATM Analysis Screen
 * The container view for the new "Medical Grade" module.
 */
export const ATMAnalysisScreen: React.FC = () => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<JawMetrics | null>(null);
    const [trajectory, setTrajectory] = useState<{ dev: number, open: number }[]>([]);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const recordingBuffer = useRef<any[]>([]);
    const [recordDuration, setRecordDuration] = useState(0);

    // Timer sync
    useEffect(() => {
        let interval: number;
        if (isRecording) {
            interval = window.setInterval(() => {
                setRecordDuration(d => d + 1);
            }, 1000);
        } else {
            setRecordDuration(0);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const handleToggleRecord = () => {
        if (isRecording) {
            setIsRecording(false);
            exportRecording();
        } else {
            recordingBuffer.current = [];
            setIsRecording(true);
        }
    };

    const exportRecording = () => {
        if (recordingBuffer.current.length === 0) return;

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(recordingBuffer.current, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `atm_session_${Date.now()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleMetrics = (newMetrics: JawMetrics) => {
        setMetrics(newMetrics);
        if (isRecording) {
            recordingBuffer.current.push({
                timestamp: Date.now(),
                metrics: newMetrics
            });
        }
    };

    useEffect(() => {
        const startCamera = async () => {
            try {
                const s = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        facingMode: "user"
                    },
                    audio: false
                });
                setStream(s);
            } catch (err) {
                console.error(err);
                setError("Camera access denied or unavailable.");
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    return (
        <div className="w-full h-screen bg-[#050505] text-white flex flex-col">
            {/* Header */}
            <header className="h-16 flex items-center px-8 border-b border-white/10 bg-black/50 backdrop-blur-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00FF66] to-emerald-800 opacity-80" />
                    <div>
                        <h1 className="text-sm font-bold tracking-[0.2em] font-mono">RELAXX.CLINIC</h1>
                        <p className="text-[10px] text-white/40 uppercase">ATM Precision Module v1.0</p>
                    </div>
                </div>

                <div className="ml-auto flex gap-4">
                    <button onClick={exportRecording} className="px-4 py-1.5 text-xs font-mono border border-white/10 rounded-full hover:bg-white/5 transition-colors">
                        EXPORT DATA
                    </button>
                    <button
                        onClick={handleToggleRecord}
                        className={`px-4 py-1.5 text-xs font-mono font-bold rounded-full transition-all shadow-[0_0_15px_rgba(0,255,102,0.3)] ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-[#00FF66] text-black hover:bg-[#00CC52]'
                            }`}
                    >
                        {isRecording ? `REC ${new Date(recordDuration * 1000).toISOString().substr(14, 5)}` : 'START RECORDING'}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-6 flex flex-col md:flex-row gap-6 overflow-y-auto md:overflow-hidden">
                {/* Left: Camera Feed */}
                <div className="flex-1 relative min-h-[50vh] md:min-h-0 bg-black rounded-3xl overflow-hidden border border-white/10">
                    {error ? (
                        <div className="flex items-center justify-center h-full text-red-400 font-mono">
                            {error}
                        </div>
                    ) : (
                        <HighPrecisionCamera
                            stream={stream}
                            onMetrics={handleMetrics}
                            onTrajectoryUpdate={setTrajectory}
                        />
                    )}
                </div>

                {/* Right: Metrics Panel */}
                <aside className="w-full md:w-80 flex flex-col gap-4 pb-8 md:pb-0 overflow-y-auto">

                    {/* Trajectory Graph */}
                    <TrajectoryGraph trajectory={trajectory} />

                    {/* Numeric HUD */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="text-white/50 text-xs font-mono mb-1 uppercase">Opening</div>
                            <div className="text-2xl font-bold font-mono text-[#00FF66]">
                                {metrics?.openingMM.toFixed(1)}<span className="text-[10px] ml-1 opacity-50">MM</span>
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="text-white/50 text-xs font-mono mb-1 uppercase">Dev.</div>
                            <div className={`text-2xl font-bold font-mono ${Math.abs(metrics?.deviationMM || 0) > 3 ? 'text-red-400' : 'text-white'}`}>
                                {metrics?.deviationMM.toFixed(1)}<span className="text-[10px] ml-1 opacity-50">MM</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div className="text-white/50 text-xs font-mono mb-2 uppercase">Status</div>
                        <div className={`text-xl font-bold ${metrics?.isOpen ? 'text-[#00FF66]' : 'text-white/30'}`}>
                            {metrics?.isOpen ? 'MOVING' : 'IDLE'}
                        </div>
                    </div>

                    <div className="flex-1 bg-white/5 rounded-2xl border border-white/5 p-4">
                        <h3 className="text-xs font-mono text-white/50 mb-4 uppercase">Session Notes</h3>
                        <textarea
                            className="w-full h-32 bg-transparent resize-none outline-none text-xs font-mono text-white/70"
                            placeholder="Type clinical observations..."
                        />
                    </div>
                </aside>
            </main>
        </div>
    );
};
