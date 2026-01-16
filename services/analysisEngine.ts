
import { Landmark, DiagnosticMetrics } from '../types';
import { LANDMARK_INDICES } from '../constants';

// Índices para normalização (Olho esquerdo e direito)
const LEFT_EYE = 33;
const RIGHT_EYE = 263;

export const calculateMetrics = (landmarks: Landmark[]): DiagnosticMetrics => {
  if (!landmarks || landmarks.length === 0) {
    return { verticalAlignment: 0, openingAmplitude: 0, lateralDeviation: 0, isCentered: false };
  }

  // 1. Biological Ruler (IPD - Interpupillary Distance)
  const lEye = landmarks[LEFT_EYE];
  const rEye = landmarks[RIGHT_EYE];

  // IPD calculation now simple Euclidean because landmarks are in "Square Space"
  const ipd = Math.sqrt(
    Math.pow(rEye.x - lEye.x, 2) +
    Math.pow(rEye.y - lEye.y, 2) +
    Math.pow(rEye.z - lEye.z, 2)
  );

  if (ipd < 0.001) return { verticalAlignment: 0, openingAmplitude: 0, lateralDeviation: 0, isCentered: false };

  const forehead = landmarks[LANDMARK_INDICES.FOREHEAD];
  const chin = landmarks[LANDMARK_INDICES.CHIN];
  const upperLip = landmarks[LANDMARK_INDICES.UPPER_LIP];
  const lowerLip = landmarks[LANDMARK_INDICES.LOWER_LIP];

  // 2. Amplitude (Abertura)
  const rawOpening = Math.sqrt(
    Math.pow(lowerLip.x - upperLip.x, 2) +
    Math.pow(lowerLip.y - upperLip.y, 2)
  );

  // Normalized to approx mm (Multiplicator 65 based on average IPD)
  const normalizedOpening = (rawOpening / ipd) * 65;

  // 3. Lateral Deviation (Dot Product in Square Space)
  const midEye = {
    x: (lEye.x + rEye.x) / 2,
    y: (lEye.y + rEye.y) / 2
  };

  const eyeVector = {
    x: rEye.x - lEye.x,
    y: rEye.y - lEye.y
  };

  const chinVector = {
    x: chin.x - midEye.x,
    y: chin.y - midEye.y
  };

  // Scalar Projection
  const dotProduct = (chinVector.x * eyeVector.x) + (chinVector.y * eyeVector.y);
  const rawDeviation = dotProduct / ipd;

  const lateralDev = (rawDeviation / ipd) * 65;

  // 4. Vertical Angle (Roll Correction)
  const headRoll = Math.atan2(eyeVector.y, eyeVector.x);
  const chinAngle = Math.atan2(chin.y - forehead.y, chin.x - forehead.x);

  let angle = (chinAngle - headRoll) * (180 / Math.PI);
  angle = Math.abs(angle - 90);

  // 5. Estabilidade
  const isHeadStraight = Math.abs(headRoll) < 0.2;
  const isCentered = isHeadStraight;

  return {
    verticalAlignment: angle,
    openingAmplitude: normalizedOpening,
    lateralDeviation: lateralDev,
    isCentered
  };
};
