import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Video,
    VideoOff,
    AlertTriangle,
    Eye,
    Smartphone,
    Activity,
    Gauge,
    Wifi,
    WifiOff,
    User,
    Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDriverMonitoring } from '@/hooks/useDriverMonitoring';

/**
 * Status Badge Component
 */
const StatusBadge = ({ status }) => {
    const statusConfig = {
        connected: { color: 'bg-emerald-500', text: 'Connected', icon: Wifi },
        disconnected: { color: 'bg-red-500', text: 'Disconnected', icon: WifiOff },
        checking: { color: 'bg-yellow-500', text: 'Checking...', icon: Wifi },
        error: { color: 'bg-red-500', text: 'Error', icon: WifiOff },
    };

    const config = statusConfig[status] || statusConfig.checking;
    const Icon = config.icon;

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.color}/20 border border-${config.color.replace('bg-', '')}/30`}>
            <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
            <Icon className="w-4 h-4 text-slate-300" />
            <span className="text-sm font-medium text-slate-300">{config.text}</span>
        </div>
    );
};

/**
 * Alert Card Component
 */
const AlertCard = ({ label, active, icon: Icon, color }) => {
    const bgColor = active ? color : 'bg-slate-800';
    const borderColor = active ? color.replace('bg-', 'border-') : 'border-slate-700';
    const textColor = active ? 'text-white' : 'text-slate-500';

    return (
        <div className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 ${bgColor}/20 ${borderColor} ${active ? 'shadow-lg shadow-red-500/20' : ''}`}>
            {active && (
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${color} animate-ping`} />
            )}
            <Icon className={`w-8 h-8 mb-2 ${textColor}`} />
            <span className={`text-sm font-semibold uppercase tracking-wider ${textColor}`}>
                {label}
            </span>
            <span className={`text-xs mt-1 ${active ? 'text-white/80' : 'text-slate-600'}`}>
                {active ? 'ALERT!' : 'Normal'}
            </span>
        </div>
    );
};

/**
 * Metric Gauge Component
 */
const MetricGauge = ({ label, value, unit, min, max, threshold, thresholdType = 'below', icon: Icon }) => {
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

    // Determine if in danger zone
    const inDanger = thresholdType === 'below'
        ? value < threshold
        : value > threshold;

    const barColor = inDanger ? 'bg-red-500' : 'bg-cyan-500';
    const textColor = inDanger ? 'text-red-400' : 'text-cyan-400';

    return (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-300">{label}</span>
                </div>
                <span className={`text-lg font-bold ${textColor}`}>
                    {typeof value === 'number' ? value.toFixed(2) : value}{unit}
                </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${barColor} transition-all duration-300 rounded-full`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="flex justify-between mt-1 text-xs text-slate-500">
                <span>{min}</span>
                <span className="text-slate-400">Threshold: {threshold}</span>
                <span>{max}</span>
            </div>
        </div>
    );
};

/**
 * Driver Monitoring Dashboard Page
 */
const DriverMonitoringPage = () => {
    const navigate = useNavigate();

    const {
        videoRef,
        isStreaming,
        isProcessing,
        startMonitoring,
        stopMonitoring,
        metrics,
        alerts,
        detections,
        serviceStatus,
        error,
    } = useDriverMonitoring();

    const hasAnyAlert = alerts.drowsy || alerts.yawning || alerts.distracted || alerts.phoneDetected || !alerts.faceVisible;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Back Button & Title */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-400" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-white">Driver Monitoring</h1>
                                <p className="text-xs text-slate-500">Real-time fatigue detection</p>
                            </div>
                        </div>

                        {/* Status & Controls */}
                        <div className="flex items-center gap-4">
                            <StatusBadge status={serviceStatus} />

                            {isStreaming ? (
                                <Button
                                    variant="destructive"
                                    onClick={stopMonitoring}
                                    className="bg-red-500 hover:bg-red-600"
                                >
                                    <VideoOff className="w-4 h-4 mr-2" />
                                    Stop Monitoring
                                </Button>
                            ) : (
                                <Button
                                    variant="accent"
                                    onClick={startMonitoring}
                                    disabled={serviceStatus === 'disconnected'}
                                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                                >
                                    <Video className="w-4 h-4 mr-2" />
                                    Start Monitoring
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-3">
                    <div className="max-w-7xl mx-auto flex items-center gap-2 text-red-400">
                        <AlertTriangle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Video Feed - Left Side */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                            {/* Video Container */}
                            <div className="relative aspect-video bg-slate-950">
                                {/* Always render video element so ref is available */}
                                <video
                                    ref={videoRef}
                                    className={`absolute inset-0 w-full h-full object-cover ${isStreaming ? 'block' : 'hidden'}`}
                                    style={{ transform: 'scaleX(-1)' }}
                                    autoPlay
                                    playsInline
                                    muted
                                />

                                {/* Camera Off Overlay */}
                                {!isStreaming && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                                        <Video className="w-16 h-16 mb-4 opacity-50" />
                                        <p className="text-lg font-medium">Camera Off</p>
                                        <p className="text-sm mt-1">Click "Start Monitoring" to begin</p>
                                    </div>
                                )}

                                {/* Face Not Visible Overlay */}
                                {isStreaming && !alerts.faceVisible && (
                                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                                        <div className="bg-red-500/90 px-6 py-3 rounded-lg text-white font-bold text-lg">
                                            DRIVER NOT VISIBLE
                                        </div>
                                    </div>
                                )}

                                {/* Processing Indicator */}
                                {isStreaming && isProcessing && (
                                    <div className="absolute top-4 right-4">
                                        <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse" />
                                    </div>
                                )}

                                {/* Alert Overlay */}
                                {isStreaming && hasAnyAlert && (
                                    <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2">
                                        {alerts.drowsy && (
                                            <span className="px-3 py-1 rounded-full bg-red-500 text-white text-sm font-bold animate-pulse">
                                                ⚠️ DROWSINESS
                                            </span>
                                        )}
                                        {alerts.yawning && (
                                            <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-sm font-bold animate-pulse">
                                                ⚠️ YAWNING
                                            </span>
                                        )}
                                        {alerts.distracted && (
                                            <span className="px-3 py-1 rounded-full bg-yellow-500 text-black text-sm font-bold animate-pulse">
                                                ⚠️ DISTRACTED
                                            </span>
                                        )}
                                        {alerts.phoneDetected && (
                                            <span className="px-3 py-1 rounded-full bg-purple-500 text-white text-sm font-bold animate-pulse">
                                                📱 PHONE DETECTED
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Video Footer Stats */}
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-t border-slate-700">
                                <div className="flex items-center gap-4 text-sm text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                        <Activity className="w-4 h-4" />
                                        FPS: <span className="text-cyan-400 font-mono">{metrics.fps}</span>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-4 h-4" />
                                        Latency: <span className="text-cyan-400 font-mono">{metrics.processingTime}ms</span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                                    <span className="text-sm text-slate-400">
                                        {isStreaming ? 'Live' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metrics Panel - Right Side */}
                    <div className="space-y-6">
                        {/* Real-time Metrics */}
                        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Gauge className="w-5 h-5 text-cyan-400" />
                                Real-time Metrics
                            </h3>

                            <div className="space-y-4">
                                <MetricGauge
                                    label="Eye Aspect Ratio (EAR)"
                                    value={metrics.ear}
                                    unit=""
                                    min={0}
                                    max={0.5}
                                    threshold={0.21}
                                    thresholdType="below"
                                    icon={Eye}
                                />

                                <MetricGauge
                                    label="Mouth Aspect Ratio (MAR)"
                                    value={metrics.mar}
                                    unit=""
                                    min={0}
                                    max={1.2}
                                    threshold={0.6}
                                    thresholdType="above"
                                    icon={User}
                                />

                                <MetricGauge
                                    label="Head Yaw"
                                    value={Math.abs(metrics.yaw)}
                                    unit="°"
                                    min={0}
                                    max={60}
                                    threshold={30}
                                    thresholdType="above"
                                    icon={Activity}
                                />
                            </div>
                        </div>

                        {/* Detections Info */}
                        {detections.length > 0 && (
                            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
                                <h3 className="text-lg font-semibold text-white mb-3">YOLO Detections</h3>
                                <div className="space-y-2">
                                    {detections.map((det, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm">
                                            <span className="text-slate-300 capitalize">{det.class}</span>
                                            <span className="text-cyan-400 font-mono">
                                                {(det.confidence * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Alert Cards */}
                <div className="mt-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        Alert Status
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <AlertCard
                            label="Drowsy"
                            active={alerts.drowsy}
                            icon={Eye}
                            color="bg-red-500"
                        />
                        <AlertCard
                            label="Yawning"
                            active={alerts.yawning}
                            icon={User}
                            color="bg-orange-500"
                        />
                        <AlertCard
                            label="Distracted"
                            active={alerts.distracted}
                            icon={Activity}
                            color="bg-yellow-500"
                        />
                        <AlertCard
                            label="Phone"
                            active={alerts.phoneDetected}
                            icon={Smartphone}
                            color="bg-purple-500"
                        />
                    </div>
                </div>

                {/* Instructions */}
                {!isStreaming && serviceStatus === 'connected' && (
                    <div className="mt-8 bg-slate-800/30 rounded-xl border border-slate-700 p-6">
                        <h3 className="text-lg font-semibold text-white mb-3">How it works</h3>
                        <ul className="space-y-2 text-slate-400">
                            <li className="flex items-start gap-2">
                                <span className="text-cyan-400 font-bold">1.</span>
                                Click "Start Monitoring" to enable your webcam
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-cyan-400 font-bold">2.</span>
                                Position yourself clearly in front of the camera
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-cyan-400 font-bold">3.</span>
                                The system will detect drowsiness, yawning, distraction, and phone usage
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-cyan-400 font-bold">4.</span>
                                Alerts will appear when unsafe behavior is detected
                            </li>
                        </ul>
                    </div>
                )}

                {serviceStatus === 'disconnected' && (
                    <div className="mt-8 bg-red-500/10 rounded-xl border border-red-500/30 p-6">
                        <h3 className="text-lg font-semibold text-red-400 mb-3">CV Service Not Available</h3>
                        <p className="text-slate-400 mb-4">
                            The computer vision service is not running. Please start it with:
                        </p>
                        <code className="block bg-slate-900 rounded-lg p-4 text-cyan-400 font-mono text-sm">
                            cd backend/cv_service && python app.py
                        </code>
                    </div>
                )}
            </main>
        </div>
    );
};

export default DriverMonitoringPage;
