
import { Landmark, DiagnosticMetrics } from '../types';
import { LANDMARK_INDICES } from '../constants';

// Índices para normalização (Olho esquerdo e direito)
const LEFT_EYE = 33;
const RIGHT_EYE = 263;

export const calculateMetrics = (landmarks: Landmark[]): DiagnosticMetrics => {
  if (!landmarks || landmarks.length === 0) {
    return { verticalAlignment: 0, openingAmplitude: 0, lateralDeviation: 0, isCentered: false };
  }

  // 1. Cálculo da Régua Biológica (Distância Interpupilar em 3D)
  const lEye = landmarks[LEFT_EYE];
  const rEye = landmarks[RIGHT_EYE];
  const ipd = Math.sqrt(
    Math.pow(rEye.x - lEye.x, 2) + 
    Math.pow(rEye.y - lEye.y, 2) + 
    Math.pow(rEye.z - lEye.z, 2)
  );

  const forehead = landmarks[LANDMARK_INDICES.FOREHEAD];
  const chin = landmarks[LANDMARK_INDICES.CHIN];
  const upperLip = landmarks[LANDMARK_INDICES.UPPER_LIP];
  const lowerLip = landmarks[LANDMARK_INDICES.LOWER_LIP];

  // 2. Amplitude de Abertura Normalizada
  // Dividimos pela IPD para que o valor seja independente da distância da câmera
  const rawOpening = Math.sqrt(
    Math.pow(lowerLip.x - upperLip.x, 2) + Math.pow(lowerLip.y - upperLip.y, 2)
  );
  const normalizedOpening = (rawOpening / ipd) * 100; // Escala centesimal relativa à IPD

  // 3. Alinhamento Vertical (Ângulo do Eixo Y)
  const dx = chin.x - forehead.x;
  const dy = chin.y - forehead.y;
  const angle = Math.atan2(dx, dy) * (180 / Math.PI);

  // 4. Desvio Lateral Relativo (Mandibular Drift)
  // Medimos o quanto o queixo foge da linha média do nariz/testa
  const lateralDev = ((chin.x - forehead.x) / ipd) * 100;

  // 5. Critério de Estabilidade de Pose
  // Verifica se o rosto não está muito inclinado (evita erro de projeção)
  const isHeadStraight = Math.abs(lEye.y - rEye.y) < 0.05; 
  const isCentered = forehead.x > 0.35 && forehead.x < 0.65 && isHeadStraight;

  return {
    verticalAlignment: angle,
    openingAmplitude: normalizedOpening,
    lateralDeviation: lateralDev,
    isCentered
  };
};
