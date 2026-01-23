import { Point3D, Vector3D, Plane3D } from './types';

/**
 * V22.0: High-Performance Vector Math Library
 * Specialized for 3D facial analysis and ATM biomechanics.
 */
export class VectorMath3D {

    /**
     * Calculates the Euclidean distance between two 3D points.
     */
    static distance(p1: Point3D, p2: Point3D): number {
        return Math.sqrt(
            Math.pow(p2.x - p1.x, 2) +
            Math.pow(p2.y - p1.y, 2) +
            Math.pow(p2.z - p1.z, 2)
        );
    }

    /**
     * Calculates the dot product of two vectors.
     */
    static dotProduct(v1: Vector3D, v2: Vector3D): number {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }

    /**
     * Calculates the cross product of two vectors.
     */
    static crossProduct(v1: Vector3D, v2: Vector3D): Vector3D {
        return {
            x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x
        };
    }

    /**
     * Normalizes a vector to unit length.
     */
    static normalize(v: Vector3D): Vector3D {
        const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        if (length === 0) return { x: 0, y: 0, z: 0 };
        return {
            x: v.x / length,
            y: v.y / length,
            z: v.z / length
        };
    }

    /**
     * Creates a vector from two points (Head - Tail).
     */
    static vectorFromPoints(tail: Point3D, head: Point3D): Vector3D {
        return {
            x: head.x - tail.x,
            y: head.y - tail.y,
            z: head.z - tail.z
        };
    }

    /**
     * Projects a point onto a plane defined by a normal vector and a reference point.
     * Essential for correcting head tilt (projecting landmarks onto the face plane).
     */
    static projectPointToPlane(point: Point3D, plane: Plane3D): Point3D {
        const v = VectorMath3D.vectorFromPoints(plane.point, point);
        const dist = VectorMath3D.dotProduct(v, plane.normal);

        return {
            x: point.x - dist * plane.normal.x,
            y: point.y - dist * plane.normal.y,
            z: point.z - dist * plane.normal.z
        };
    }

    /**
     * Calculates the angle between two vectors in radians.
     */
    static angleBetweenVectors(v1: Vector3D, v2: Vector3D): number {
        const dot = VectorMath3D.dotProduct(v1, v2);
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

        if (mag1 === 0 || mag2 === 0) return 0;

        // Clamp for numerical stability
        const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
        return Math.acos(cosTheta);
    }

    /**
     * Converts a simplified 2D point (x, y) to a 3D point (z=0) if needed.
     */
    static toPoint3D(p: { x: number, y: number, z?: number }): Point3D {
        return { x: p.x, y: p.y, z: p.z || 0 };
    }

    /**
     * Rotates a 3D point around a center on the XY plane.
     */
    static rotatePoint(point: Point3D, angleRad: number, center: Point3D): Point3D {
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const dx = point.x - center.x;
        const dy = point.y - center.y;

        return {
            x: center.x + (dx * cos - dy * sin),
            y: center.y + (dx * sin + dy * cos),
            z: point.z
        };
    }

    /**
     * Projects a point (p2) onto an axis defined by an origin (p1) and an angle.
     */
    static projectScalar(p1: Point3D, p2: Point3D, angleRad: number): number {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        // Axis unit vector
        const ux = Math.cos(angleRad);
        const uy = Math.sin(angleRad);

        return (dx * ux) + (dy * uy);
    }
}
