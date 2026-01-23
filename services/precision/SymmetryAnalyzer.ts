import { ATMLandmark, Plane3D, Point3D, Vector3D } from './precision-types';
import { VectorMath3D } from './VectorMath3D';

/**
 * Analyzes facial symmetry and establishes the Mid-Sagittal Plane.
 * This plane is the "Truth" for all lateral deviation measurements.
 */
export class SymmetryAnalyzer {

    /**
     * Calculates the Mid-Sagittal Plane based on stable skull landmarks.
     * We use the Glabella (Forehead) and Philtrum (Upper Lip) as anchors,
     * as they are relatively stable compared to the jaw.
     */
    calculateMidSagittalPlane(landmarks: ATMLandmark[], width: number = 640, height: number = 480): Plane3D | null {
        // --- 1. ASPECT-AWARE PIXEL PROJECTION ---
        const pixelLandmarks = landmarks.map(p => ({
            ...p,
            x: p.x * width,
            y: p.y * height,
            z: p.z * width
        }));

        const glabella = pixelLandmarks.find(l => l.id === 10);
        const noseBridge = pixelLandmarks.find(l => l.id === 168);
        const philtrum = pixelLandmarks.find(l => l.id === 0);

        let midEyePoint = noseBridge;
        if (!midEyePoint) {
            const lEye = pixelLandmarks.find(l => l.id === 33);
            const rEye = pixelLandmarks.find(l => l.id === 263);
            if (lEye && rEye) {
                midEyePoint = {
                    id: -1,
                    x: (lEye.x + rEye.x) / 2,
                    y: (lEye.y + rEye.y) / 2,
                    z: (lEye.z + rEye.z) / 2
                } as ATMLandmark;
            }
        }

        if (!glabella || !midEyePoint || !philtrum) return null;

        const verticalVec = VectorMath3D.vectorFromPoints(glabella, philtrum);

        const lEye = pixelLandmarks.find(l => l.id === 33);
        const rEye = pixelLandmarks.find(l => l.id === 263);

        let visualNormal: Vector3D;

        if (lEye && rEye) {
            const eyeVec = VectorMath3D.vectorFromPoints(lEye, rEye);
            const zAxis = VectorMath3D.crossProduct(eyeVec, verticalVec);
            visualNormal = VectorMath3D.crossProduct(verticalVec, zAxis);
            visualNormal = VectorMath3D.normalize(visualNormal);
        } else {
            visualNormal = { x: 1, y: 0, z: 0 };
        }

        return {
            point: {
                id: midEyePoint.id,
                x: midEyePoint.x / width,
                y: midEyePoint.y / height,
                z: midEyePoint.z / width
            } as ATMLandmark,
            normal: visualNormal
        };
    }
}
