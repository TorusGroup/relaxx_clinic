
import { Landmark, DiagnosticMetrics } from '../types';
import { LANDMARK_INDICES } from '../constants';

// Índices para normalização (Olho esquerdo e direito)
const LEFT_EYE = 33;
const RIGHT_EYE = 263;

export const calculateMetrics = (landmarks: Landmark[], aspectRatio: number = 1): DiagnosticMetrics => {
  if (!landmarks || landmarks.length === 0) {
    return { verticalAlignment: 0, openingAmplitude: 0, lateralDeviation: 0, isCentered: false };
  }

  // 1. Régua Biológica (IPD - Interpupillary Distance)
  const lEye = landmarks[LEFT_EYE];
  const rEye = landmarks[RIGHT_EYE];

  // Aspect-Ratio Corrected 3D Distance (X is weighted by AR)
  const ipd = Math.sqrt(
    Math.pow((rEye.x - lEye.x) * aspectRatio, 2) +
    Math.pow(rEye.y - lEye.y, 2) +
    Math.pow(rEye.z - lEye.z, 2)
  );

  const forehead = landmarks[LANDMARK_INDICES.FOREHEAD];
  const chin = landmarks[LANDMARK_INDICES.CHIN];
  const upperLip = landmarks[LANDMARK_INDICES.UPPER_LIP];
  const lowerLip = landmarks[LANDMARK_INDICES.LOWER_LIP];

  // 2. Amplitude (Abertura) - AR Corrected
  const rawOpening = Math.sqrt(
    Math.pow((lowerLip.x - upperLip.x) * aspectRatio, 2) +
    Math.pow(lowerLip.y - upperLip.y, 2)
  );

  // Normalized to approx mm (Multiplicador 65 baseados no IPD médio)
  const normalizedOpening = (rawOpening / ipd) * 65;

  // 3. Desvio Lateral (AR Corrected Dot Product)
  const midEye = {
    x: (lEye.x + rEye.x) / 2,
    y: (lEye.y + rEye.y) / 2
  };

  const eyeVector = {
    x: (rEye.x - lEye.x) * aspectRatio,
    y: rEye.y - lEye.y
  };

  const chinVector = {
    x: (chin.x - midEye.x) * aspectRatio,
    y: chin.y - midEye.y
  };

  // Scalar Projection
  const dotProduct = (chinVector.x * eyeVector.x) + (chinVector.y * eyeVector.y);
  const rawDeviation = dotProduct / ipd;

  const lateralDev = (rawDeviation / ipd) * 65;

  // 4. Ângulo Vertical (Using AR-corrected vectors for accurate roll)
  const headRoll = Math.atan2(eyeVector.y, eyeVector.x);
  const chinAngle = Math.atan2(chin.y - forehead.y, (chin.x - forehead.x) * aspectRatio);

  let angle = (chinAngle - headRoll) * (180 / Math.PI);
  angle = Math.abs(angle - 90);

  // 5. Estabilidade
  const isHeadStraight = Math.abs(headRoll) < 0.2;
  const isCentered = forehead.x > 0.35 && forehead.x < 0.65 && isHeadStraight;

  return {
    verticalAlignment: angle,
    openingAmplitude: normalizedOpening,
    lateralDeviation: lateralDev,
    isCentered
  };
};
