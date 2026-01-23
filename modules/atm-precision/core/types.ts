/**
 * Medical-grade 3D Point structure.
 */
export interface Point3D {
    x: number;
    y: number;
    z: number;
}

/**
 * Represents a vector in 3D space.
 */
export interface Vector3D {
    x: number;
    y: number;
    z: number;
}

/**
 * Represents a plane in 3D space defined by a normal vector and a point.
 */
export interface Plane3D {
    normal: Vector3D;
    point: Point3D;
}

/**
 * Clinical Landmark with metadata.
 */
export interface ATMLandmark extends Point3D {
    id: number;
    name?: string;
    confidence?: number;
}

/**
 * Standard units for clinical measurement.
 */
export enum DistanceUnit {
    MM = 'mm',
    CM = 'cm',
    PIXEL = 'px'
}
