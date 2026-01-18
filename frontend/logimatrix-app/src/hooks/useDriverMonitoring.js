import { useState, useRef, useCallback, useEffect } from 'react';
import { sendFrame, checkHealth } from '@/api/cvService';

// MediaPipe Face Landmark indices for fatigue detection
const LEFT_EYE_INDICES = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
const UPPER_LIP = 13;
const LOWER_LIP = 14;
const LEFT_MOUTH = 61;
const RIGHT_MOUTH = 291;

// Thresholds (matching webcam_demo.py)
const CONFIG = {
    EAR_THRESHOLD: 0.21,
    EAR_CONSEC_FRAMES: 15,
    YAWN_THRESHOLD: 0.6,
    YAWN_CONSEC_FRAMES: 10,
    HEAD_YAW_THRESHOLD: 30,
    HEAD_PITCH_THRESHOLD: 25,
    PHONE_CONFIDENCE: 0.5,
    TARGET_FPS: 8, // Target frames per second to send
};

/**
 * Calculate Eye Aspect Ratio (EAR) for drowsiness detection
 */
function calculateEAR(landmarks, eyeIndices) {
    if (!landmarks || landmarks.length < 468) return 0.3;

    const getPoint = (idx) => ({
        x: landmarks[idx].x,
        y: landmarks[idx].y,
    });

    const p1 = getPoint(eyeIndices[0]);
    const p2 = getPoint(eyeIndices[1]);
    const p3 = getPoint(eyeIndices[2]);
    const p4 = getPoint(eyeIndices[3]);
    const p5 = getPoint(eyeIndices[4]);
    const p6 = getPoint(eyeIndices[5]);

    const distance = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

    const vertical1 = distance(p2, p6);
    const vertical2 = distance(p3, p5);
    const horizontal = distance(p1, p4);

    if (horizontal === 0) return 0.3;

    return (vertical1 + vertical2) / (2.0 * horizontal);
}

/**
 * Calculate Mouth Aspect Ratio (MAR) for yawn detection
 */
function calculateMAR(landmarks) {
    if (!landmarks || landmarks.length < 468) return 0;

    const getPoint = (idx) => ({
        x: landmarks[idx].x,
        y: landmarks[idx].y,
    });

    const left = getPoint(LEFT_MOUTH);
    const right = getPoint(RIGHT_MOUTH);
    const top = getPoint(UPPER_LIP);
    const bottom = getPoint(LOWER_LIP);

    const distance = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

    const horizontal = distance(left, right);
    const vertical = distance(top, bottom);

    if (horizontal === 0) return 0;

    return vertical / horizontal;
}

/**
 * Estimate head pose (yaw) from landmarks
 */
function estimateHeadPose(landmarks) {
    if (!landmarks || landmarks.length < 468) return { yaw: 0, pitch: 0 };

    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];

    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const noseOffset = nose.x - eyeCenterX;
    const faceWidth = Math.abs(rightEye.x - leftEye.x);

    let yaw = 0;
    if (faceWidth > 0) {
        yaw = (noseOffset / faceWidth) * 60;
    }

    const pitch = nose.z ? nose.z * 45 : 0;

    return { yaw, pitch };
}

/**
 * Custom hook for driver monitoring with webcam
 */
export function useDriverMonitoring() {
    // Refs
    const videoRef = useRef(null);
    const canvasRef = useRef(document.createElement('canvas'));
    const streamRef = useRef(null);
    const intervalRef = useRef(null);

    // Use refs for values accessed in interval to avoid closure issues
    const isStreamingRef = useRef(false);
    const isProcessingRef = useRef(false);

    // Alert frame counters
    const drowsyFramesRef = useRef(0);
    const yawnFramesRef = useRef(0);
    const lastFrameTimeRef = useRef(0);

    // State for UI
    const [isStreaming, setIsStreaming] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [serviceStatus, setServiceStatus] = useState('checking');
    const [error, setError] = useState(null);

    // Metrics state
    const [metrics, setMetrics] = useState({
        ear: 0.3,
        mar: 0,
        yaw: 0,
        pitch: 0,
        fps: 0,
        processingTime: 0,
    });

    // Alerts state
    const [alerts, setAlerts] = useState({
        drowsy: false,
        yawning: false,
        distracted: false,
        phoneDetected: false,
        faceVisible: true,
    });

    // Detections state (for drawing boxes)
    const [detections, setDetections] = useState([]);

    // Check CV service health on mount
    useEffect(() => {
        const checkService = async () => {
            try {
                await checkHealth();
                setServiceStatus('connected');
            } catch (err) {
                setServiceStatus('disconnected');
                console.error('CV Service not available:', err);
            }
        };

        checkService();
        const interval = setInterval(checkService, 10000); // Check every 10s

        return () => clearInterval(interval);
    }, []);

    /**
     * Capture frame from video and convert to base64
     */
    const captureFrame = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || video.readyState !== 4) {
            return null;
        }

        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Flip horizontally for mirror effect
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform

        // Convert to base64 JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        return dataUrl.split(',')[1]; // Remove "data:image/jpeg;base64," prefix
    }, []);

    /**
     * Process a single frame
     */
    const processFrame = useCallback(async () => {
        // Use refs to avoid closure issues
        if (!isStreamingRef.current || isProcessingRef.current) {
            return;
        }

        const frameBase64 = captureFrame();
        if (!frameBase64) {
            return;
        }

        isProcessingRef.current = true;
        setIsProcessing(true);

        try {
            const now = performance.now();
            const startTime = performance.now();
            const result = await sendFrame(frameBase64);
            const processingTime = performance.now() - startTime;

            // Calculate FPS
            const fps = lastFrameTimeRef.current > 0
                ? 1000 / (now - lastFrameTimeRef.current)
                : 0;
            lastFrameTimeRef.current = now;

            // Update detections
            setDetections(result.detections || []);

            // Check for phone detection
            const phoneDetected = (result.detections || []).some(
                d => d.class === 'cell phone' && d.confidence > CONFIG.PHONE_CONFIDENCE
            );

            // Process landmarks if face detected
            if (result.face_detected && result.landmarks?.length >= 468) {
                const leftEAR = calculateEAR(result.landmarks, LEFT_EYE_INDICES);
                const rightEAR = calculateEAR(result.landmarks, RIGHT_EYE_INDICES);
                const avgEAR = (leftEAR + rightEAR) / 2;

                const mar = calculateMAR(result.landmarks);
                const headPose = estimateHeadPose(result.landmarks);

                // Update metrics
                setMetrics({
                    ear: avgEAR,
                    mar,
                    yaw: headPose.yaw,
                    pitch: headPose.pitch,
                    fps: Math.round(fps * 10) / 10,
                    processingTime: Math.round(processingTime),
                });

                // Drowsiness detection
                if (avgEAR < CONFIG.EAR_THRESHOLD) {
                    drowsyFramesRef.current += 1;
                } else {
                    drowsyFramesRef.current = 0;
                }

                // Yawn detection
                if (mar > CONFIG.YAWN_THRESHOLD) {
                    yawnFramesRef.current += 1;
                } else {
                    yawnFramesRef.current = 0;
                }

                // Update alerts
                setAlerts({
                    drowsy: drowsyFramesRef.current >= CONFIG.EAR_CONSEC_FRAMES,
                    yawning: yawnFramesRef.current >= CONFIG.YAWN_CONSEC_FRAMES,
                    distracted: Math.abs(headPose.yaw) > CONFIG.HEAD_YAW_THRESHOLD,
                    phoneDetected,
                    faceVisible: true,
                });
            } else {
                // No face detected
                setMetrics(prev => ({
                    ...prev,
                    fps: Math.round(fps * 10) / 10,
                    processingTime: Math.round(processingTime),
                }));

                setAlerts(prev => ({
                    ...prev,
                    faceVisible: false,
                    phoneDetected,
                }));
            }

            setServiceStatus('connected');
        } catch (err) {
            console.error('Frame processing error:', err);
            setServiceStatus('error');
        } finally {
            isProcessingRef.current = false;
            setIsProcessing(false);
        }
    }, [captureFrame]);

    /**
     * Start monitoring
     */
    const startMonitoring = useCallback(async () => {
        try {
            setError(null);

            // Request webcam access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user',
                },
                audio: false,
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;

                // Wait for video to be ready
                await new Promise((resolve) => {
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current.play().then(resolve);
                    };
                });
            }

            // Set streaming state
            isStreamingRef.current = true;
            setIsStreaming(true);
            lastFrameTimeRef.current = 0;

            // Start processing loop using setInterval for reliability
            const frameInterval = 1000 / CONFIG.TARGET_FPS;
            intervalRef.current = setInterval(() => {
                processFrame();
            }, frameInterval);

            console.log('Monitoring started');

        } catch (err) {
            console.error('Failed to start monitoring:', err);
            setError(err.message || 'Failed to access webcam');
            isStreamingRef.current = false;
            setIsStreaming(false);
        }
    }, [processFrame]);

    /**
     * Stop monitoring
     */
    const stopMonitoring = useCallback(() => {
        // Stop interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Stop media stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // Clear video source
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        // Reset state
        isStreamingRef.current = false;
        isProcessingRef.current = false;
        setIsStreaming(false);
        setIsProcessing(false);
        drowsyFramesRef.current = 0;
        yawnFramesRef.current = 0;

        setAlerts({
            drowsy: false,
            yawning: false,
            distracted: false,
            phoneDetected: false,
            faceVisible: true,
        });

        console.log('Monitoring stopped');
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return {
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
    };
}

export default useDriverMonitoring;
