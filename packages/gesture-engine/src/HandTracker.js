const DEFAULT_WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const DEFAULT_MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export class HandTracker {
  constructor(options = {}) {
    this.wasmPath = options.wasmPath || DEFAULT_WASM_PATH;
    this.modelPath = options.modelPath || DEFAULT_MODEL_PATH;
    this.numHands = options.numHands ?? 1;
    this.delegate = options.delegate || 'GPU';
    this.minDetectionConfidence = options.minDetectionConfidence ?? 0.7;
    this.minPresenceConfidence = options.minPresenceConfidence ?? 0.5;
    this.minTrackingConfidence = options.minTrackingConfidence ?? 0.5;
    this._handLandmarker = null;
  }

  async initialize() {
    const { FilesetResolver, HandLandmarker } = await import(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs'
    );

    const vision = await FilesetResolver.forVisionTasks(this.wasmPath);

    const createOptions = (delegate) => ({
      baseOptions: {
        modelAssetPath: this.modelPath,
        delegate,
      },
      runningMode: 'VIDEO',
      numHands: this.numHands,
      minHandDetectionConfidence: this.minDetectionConfidence,
      minHandPresenceConfidence: this.minPresenceConfidence,
      minTrackingConfidence: this.minTrackingConfidence,
    });

    // Try preferred delegate first, fall back to CPU if it fails (common on mobile)
    try {
      this._handLandmarker = await HandLandmarker.createFromOptions(vision, createOptions(this.delegate));
    } catch (err) {
      if (this.delegate === 'GPU') {
        console.warn('GPU delegate failed, falling back to CPU:', err.message);
        this._handLandmarker = await HandLandmarker.createFromOptions(vision, createOptions('CPU'));
      } else {
        throw err;
      }
    }
  }

  detect(video, timestamp) {
    if (!this._handLandmarker) {
      throw new Error('HandTracker not initialized. Call initialize() first.');
    }
    return this._handLandmarker.detectForVideo(video, timestamp);
  }

  destroy() {
    if (this._handLandmarker) {
      this._handLandmarker.close();
      this._handLandmarker = null;
    }
  }
}
