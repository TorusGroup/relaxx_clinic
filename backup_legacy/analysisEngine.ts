
import { Landmark, DiagnosticMetrics } from '../types';
import { LANDMARK_INDICES } from '../constants';

// Índices para normalização (Olho esquerdo e direito)
const LEFT_EYE = 33;
const RIGHT_EYE = 263;

export const calculateMetrics = (landmarks: Landmark[]): DiagnosticMetrics => {
  if (!landmarks || landmarks.length === 0) {
    return { verticalAlignment: 0, openingAmplitude: 0, lateralDeviation: 0, isCentered: false };
  }

  // 1. Régua Biológica (IPD - Interpupillary Distance)
  const lEye = landmarks[LEFT_EYE];
  const rEye = landmarks[RIGHT_EYE];

  // Distância 3D entre olhos
  const ipd = Math.sqrt(
    Math.pow(rEye.x - lEye.x, 2) +
    Math.pow(rEye.y - lEye.y, 2) +
    Math.pow(rEye.z - lEye.z, 2)
  );

  const forehead = landmarks[LANDMARK_INDICES.FOREHEAD];
  const chin = landmarks[LANDMARK_INDICES.CHIN]; // Virtual Chin (Centroid) passed from CameraView
  const upperLip = landmarks[LANDMARK_INDICES.UPPER_LIP];
  const lowerLip = landmarks[LANDMARK_INDICES.LOWER_LIP];

  // 2. Amplitude (Abertura) - Normalizada
  const rawOpening = Math.sqrt(
    Math.pow(lowerLip.x - upperLip.x, 2) + Math.pow(lowerLip.y - upperLip.y, 2)
  );
  // Escala empírica ajustada para Outer Lips (0/17)
  // MULTIPLIER 65: Approximates Millimeters (Avg IPD = 63-65mm)
  // This converts "Ratio of IPD" to "Estimated Millimeters"
  const normalizedOpening = (rawOpening / ipd) * 65;

  // 3. Desvio Lateral com CORREÇÃO DE ROTAÇÃO (Head Roll Correction)
  // Em vez de comparar X absoluto, projetamos o vetor Queixo->MeioOlhos no vetor OlhoDir->OlhoEsq.

  // Ponto Central dos Olhos (Pivô)
  const midEye = {
    x: (lEye.x + rEye.x) / 2,
    y: (lEye.y + rEye.y) / 2
  };

  // Vetor da Linha dos Olhos (Eixo Horizontal do Rosto)
  const eyeVector = {
    x: rEye.x - lEye.x,
    y: rEye.y - lEye.y
  };

  // Vetor do Queixo em relação ao Pivô
  const chinVector = {
    x: chin.x - midEye.x,
    y: chin.y - midEye.y
  };

  // Projeção Escalar (Dot Product)
  // Desvio = (Chin . Eye) / |Eye|
  const dotProduct = (chinVector.x * eyeVector.x) + (chinVector.y * eyeVector.y);
  // Como usamos coordenadas normalizadas (0..1), não precisamos dividir pelo módulo do EyeVector no dot product se quisermos Projeção Relativa,
  // mas para ter milímetros/unidades corretas, dividimos pelo IPD (que é o |Eye| aprox).

  // Desvio em Unidades de Tela (projeta o queixo na linha dos olhos)
  // Se for 0, o queixo está exatamente na perpendicular (90 graus) da linha dos olhos.
  const rawDeviation = dotProduct / ipd;

  // Normalização Percentual (Relativa ao IPD)
  // Multiplicamos por variávies de calibração se necessário.
  // MULTIPLIER 65: Approximates Millimeters (Avg IPD 63-65mm)
  const lateralDev = (rawDeviation / ipd) * 65;

  // 4. Ângulo Vertical (Corrigido)
  // Calculamos o ângulo entre o vetor Queixo-Testa e a vertical "real" do rosto
  // O rosto está inclinado?
  const headRoll = Math.atan2(eyeVector.y, eyeVector.x);

  // Ângulo do Queixo
  const chinAngle = Math.atan2(chin.y - forehead.y, chin.x - forehead.x);

  // Diferença (Vertical Alignment) - 90 graus (PI/2)
  // Ajuste simples para display
  let angle = (chinAngle - headRoll) * (180 / Math.PI);
  // Normalizar para 90 ser "reto"
  angle = Math.abs(angle - 90);

  // 5. Estabilidade
  const isHeadStraight = Math.abs(headRoll) < 0.2; // ~11 graus
  const isCentered = forehead.x > 0.35 && forehead.x < 0.65 && isHeadStraight;

  return {
    verticalAlignment: angle,
    openingAmplitude: normalizedOpening,
    lateralDeviation: lateralDev, // Agora imune a inclinação da cabeça!
    isCentered
  };
};
