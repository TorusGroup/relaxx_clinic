/**
 * OneEuroFilter implementation for high-quality signal smoothing.
 * Adapted for TypeScript from standard implementations used in HCI/Robotics.
 * 
 * Ref: Casiez, G., Roussel, N. and Vogel, D. (2012). 1€ Filter: A Simple Speed-based Low-pass Filter for Noisy Input in Interactive Systems.
 */

export class LowPassFilter {
    y: number;
    s: number;
    alpha: number = 0;

    constructor(alpha: number, initval: number = 0) {
        this.y = this.s = initval;
        this.setAlpha(alpha);
    }

    setAlpha(alpha: number) {
        if (alpha <= 0 || alpha > 1.0) throw new Error("alpha should be in (0.0., 1.0]");
        this.alpha = alpha;
    }

    filter(val: number): number {
        const result = this.alpha * val + (1.0 - this.alpha) * this.s;
        this.s = result;
        this.y = result;
        return result;
    }

    lastValue(): number {
        return this.y;
    }
}

export class OneEuroFilter {
    freq: number;
    mincutoff: number;
    beta: number;
    dcutoff: number;
    x: LowPassFilter;
    dx: LowPassFilter;
    lasttime: number | undefined;

    constructor(freq: number, mincutoff: number = 1.0, beta: number = 0.0, dcutoff: number = 1.0) {
        this.freq = freq;
        this.mincutoff = mincutoff;
        this.beta = beta;
        this.dcutoff = dcutoff;
        this.x = new LowPassFilter(this.alpha(mincutoff));
        this.dx = new LowPassFilter(this.alpha(dcutoff));
    }

    alpha(cutoff: number): number {
        const te = 1.0 / this.freq;
        const tau = 1.0 / (2 * Math.PI * cutoff);
        return 1.0 / (1.0 + tau / te);
    }

    filter(val: number, timestamp: number = -1): number {
        // If no timestamp provided, assume constant frequency
        if (this.lasttime !== undefined && timestamp !== -1) {
            this.freq = 1.0 / (timestamp - this.lasttime);
        }
        this.lasttime = timestamp;

        const dx = (val - this.x.lastValue()) * this.freq;
        const edx = this.dx.filter(dx);
        const cutoff = this.mincutoff + this.beta * Math.abs(edx);

        this.x.setAlpha(this.alpha(cutoff));
        return this.x.filter(val);
    }
}
