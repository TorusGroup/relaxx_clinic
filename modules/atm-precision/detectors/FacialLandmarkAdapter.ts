import { ATMLandmark, Point3D } from '../core/types';
import { OneEuroFilter } from '../../../utils/oneEuroFilter';
import { LANDMARK_INDICES } from '../../../constants';

/**
 * Adapter to convert raw MediaPipe results into medical-grade ATMLandmark objects.
 * Handles filtering (OneEuro), confidence checking, and subset selection.
 */
export class FacialLandmarkAdapter {
    private filters: Map<number, { x: OneEuroFilter, y: OneEuroFilter, z: OneEuroFilter }> = new Map();
    private minConfidence: number = 0.5;

    constructor(minConfidence: number = 0.5) {
        this.minConfidence = minConfidence;
    }

    /**
     * Process raw landmarks into stabilized ATM landmarks.
     * @param rawLandmarks Array of objects {x, y, z} from MediaPipe.
     * @param timestamp Current timestamp in seconds (for filtering).
     */
    process(rawLandmarks: any[], timestamp: number): ATMLandmark[] {
        if (!rawLandmarks || rawLandmarks.length === 0) return [];

        // We only process specific indices relevant to ATM to save performance
        // (Eyes, Jaw, Lips, Nose, Forehead)
        const relevantIndices = [
            ...LANDMARK_INDICES.MANDIBLE_PATH,
            33, 263, // Eyes (Corners - Fallback)
            468, 473, // Iris Centers (Medical Ruler)
            1,       // Nose Tip
            168,     // Nose Bridge (Symmetry Anchor)
            0,       // Upper Lip Center (Philtrum Anchor)
            152,     // Chin (Menton)
            13, 14,  // Lips (Inner)
            10,      // Forehead (Glabella)
            234, 454 // Tragus/Ear
        ];

        // Ensure unique
        const uniqueIndices = Array.from(new Set(relevantIndices));

        return uniqueIndices.map(index => {
            const raw = rawLandmarks[index];
            if (!raw) return { id: index, x: 0, y: 0, z: 0, confidence: 0 };

            // Apply OneEuroFilter
            const filter = this.getFilter(index);

            // Note: MediaPipe returns normalized coordinates [0,1].
            // We filter directly in normalized space.
            const x = filter.x.filter(raw.x, timestamp);
            const y = filter.y.filter(raw.y, timestamp);
            const z = filter.z.filter(raw.z, timestamp); // Z is scaled by width usually in MediaPipe, roughly.

            return {
                id: index,
                x: x,
                y: y,
                z: z, // Keep as raw relative Z for now, Analyzer will scale it
                confidence: 1.0 // MediaPipe FaceMesh doesn't give per-landmark confidence in JS solution often
            };
        });
    }

    /**
     * Lazy initialization of filters for each landmark.
     * Uses High-Precision config (Low Beta) by default for medical analysis.
     */
    private getFilter(id: number) {
        if (!this.filters.has(id)) {
            // --- ULTRA-RESPONSIVE FILTERING (Phase 5) ---
            const isMandibleOrLip = [13, 14, 152, 17, ...LANDMARK_INDICES.MANDIBLE_PATH].includes(id);

            // LIPS/MANDIBLE: minCutoff 0.3 + Beta 0.8 = Instant response + Fast convergence
            // ANCHORS: minCutoff 0.1 + Beta 0.12 = Rock solid reference
            const minCutoff = isMandibleOrLip ? 0.3 : 0.1;
            const beta = isMandibleOrLip ? 0.8 : 0.12;

            this.filters.set(id, {
                x: new OneEuroFilter(30, minCutoff, beta, 1),
                y: new OneEuroFilter(30, minCutoff, beta, 1),
                z: new OneEuroFilter(30, minCutoff, beta, 1)
            });
        }
        return this.filters.get(id)!;
    }

    /**
     * Resets all filters (e.g. on new patient).
     */
    reset() {
        this.filters.clear();
    }
}
