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
    calculateMidSagittalPlane(landmarks: ATMLandmark[]): Plane3D | null {
        // We need specific landmarks:
        // 10: Glabella (Forehead)
        // 168: Nose Bridge (Between eyes)
        // 0: Upper Lip Center (Philtrum) - Can represent the bottom anchor of the skull proper

        // Find landmarks by ID
        const glabella = landmarks.find(l => l.id === 10);
        const noseBridge = landmarks.find(l => l.id === 168); // If not 168, use mid-eyes
        const philtrum = landmarks.find(l => l.id === 0); // Upper Lip center

        // Fallback if 168 missing, compute mid-eyes (33 + 263 / 2)
        let midEyePoint = noseBridge;
        if (!midEyePoint) {
            const lEye = landmarks.find(l => l.id === 33);
            const rEye = landmarks.find(l => l.id === 263);
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

        // V22.0 Algorithm: "Stable Triangle"
        // We define the plane using:
        // 1. The line connecting Glabella -> Philtrum (Vertical Axis)
        // 2. A normal vector perpendicular to the face surface (Glabella -> Nose Tip x Glabella -> Philtrum?)

        // Simpler approach for Plane: Point + Normal.
        // Point: MidEyePoint (Central)
        // Normal: Cross Product of (RightEye - LeftEye) and (Chin - Forehead)?
        // Better: The plane passes through Glabella and Philtrum, and is perpendicular to the Eye Line.

        // 1. Vertical Vector (Glabella -> Philtrum)
        const verticalVec = VectorMath3D.vectorFromPoints(glabella, philtrum);

        // 2. We need a "Face Normal" (Forward vector).
        // Let's use Cross Product of (EyeLine) and (VerticalVec).
        // EyeLine:
        const lEye = landmarks.find(l => l.id === 33);
        const rEye = landmarks.find(l => l.id === 263);

        let visualNormal: Vector3D;

        if (lEye && rEye) {
            const eyeVec = VectorMath3D.vectorFromPoints(lEye, rEye);
            // Normal to the sagittal plane is the Eye Vector (roughly)
            // But we want the plane ITSELF. The plane's normal is the Eye Vector?
            // Yes. The sagittal plane splits left/right. The normal points Left/Right.
            // So Eye Vector is roughly the normal.

            // To be precise: We project Eye Vector to be perpendicular to Vertical Vector?
            // Or just use Cross Product methodology to find orthogonal basis.

            // Let Z_axis = EyeVec X VerticalVec (Forward from face)
            // Then Normal = VerticalVec X Z_axis (Pointing Right)

            const zAxis = VectorMath3D.crossProduct(eyeVec, verticalVec);
            visualNormal = VectorMath3D.crossProduct(verticalVec, zAxis);

            // Normalize
            visualNormal = VectorMath3D.normalize(visualNormal);
        } else {
            // Fallback: Assume simple geometry
            visualNormal = { x: 1, y: 0, z: 0 };
        }

        return {
            point: midEyePoint,
            normal: visualNormal
        };
    }
}
