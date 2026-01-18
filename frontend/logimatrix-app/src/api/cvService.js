/**
 * CV Service API Client
 * Communicates with the Flask CV backend for YOLO + MediaPipe inference
 */

// CV Service runs on port 5000 by default
// In development, requests are proxied through Vite
const CV_SERVICE_URL = '/cv';

/**
 * Check if CV service is healthy
 * @returns {Promise<{status: string, models: string[]}>}
 */
export async function checkHealth() {
    try {
        const response = await fetch(`${CV_SERVICE_URL}/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Health check failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('CV Service health check failed:', error);
        throw error;
    }
}

/**
 * Send a frame for full inference (YOLO detection + MediaPipe landmarks)
 * @param {string} frameBase64 - Base64 encoded JPEG image
 * @returns {Promise<{detections: Array, landmarks: Array, face_detected: boolean, timing: Object}>}
 */
export async function sendFrame(frameBase64) {
    try {
        const response = await fetch(`${CV_SERVICE_URL}/infer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ frame: frameBase64 }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Inference failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('CV Service inference failed:', error);
        throw error;
    }
}

/**
 * Send a frame for YOLO detection only
 * @param {string} frameBase64 - Base64 encoded JPEG image
 * @returns {Promise<{detections: Array, processing_time_ms: number}>}
 */
export async function detectObjects(frameBase64) {
    try {
        const response = await fetch(`${CV_SERVICE_URL}/detect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ frame: frameBase64 }),
        });

        if (!response.ok) {
            throw new Error(`Detection failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('CV Service detection failed:', error);
        throw error;
    }
}

/**
 * Send a frame for facial landmark extraction only
 * @param {string} frameBase64 - Base64 encoded JPEG image
 * @returns {Promise<{landmarks: Array, detected: boolean, num_landmarks: number}>}
 */
export async function getLandmarks(frameBase64) {
    try {
        const response = await fetch(`${CV_SERVICE_URL}/landmarks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ frame: frameBase64 }),
        });

        if (!response.ok) {
            throw new Error(`Landmarks failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('CV Service landmarks failed:', error);
        throw error;
    }
}

export default {
    checkHealth,
    sendFrame,
    detectObjects,
    getLandmarks,
    CV_SERVICE_URL,
};
