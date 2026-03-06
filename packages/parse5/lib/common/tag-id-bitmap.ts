import { TAG_ID } from './html.js';

// Derive bitmap size from the actual TAG_ID enum to avoid silent failures
// if the enum grows. Object.values on a numeric enum returns both keys and values;
// filter to numbers to get the max.
const MAX_TAG_ID = Math.max(...Object.values(TAG_ID).filter((v): v is number => typeof v === 'number'));

/** Number of bytes needed to hold one bit per TAG_ID value. */
export const BITMAP_SIZE = Math.ceil((MAX_TAG_ID + 1) / 8);

/** Create a bit-packed Uint8Array bitmap from an array of TAG_ID values. */
export function createBitmap(tagIds: TAG_ID[]): Uint8Array {
    const bitmap = new Uint8Array(BITMAP_SIZE);
    for (const id of tagIds) {
        bitmap[id >>> 3] |= 1 << (id & 7);
    }
    return bitmap;
}

/** Check whether a TAG_ID is present in a bit-packed bitmap. */
export function bitmapHas(bitmap: Uint8Array, id: number): boolean {
    return (bitmap[id >>> 3] & (1 << (id & 7))) !== 0;
}
