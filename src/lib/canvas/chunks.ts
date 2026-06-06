import { CHUNK_SIZE, PALETTE_SIZE } from "./constants";

export const CHUNK_PIXEL_COUNT = CHUNK_SIZE * CHUNK_SIZE;

export const EMPTY_CHUNK_HEX = "0".repeat(CHUNK_PIXEL_COUNT);

export const decodeChunkHex = (hex: string): Uint8Array => {
  if (hex.length !== CHUNK_PIXEL_COUNT) {
    throw new Error(
      `Chunk hex must be ${CHUNK_PIXEL_COUNT} chars, got ${hex.length}`,
    );
  }
  const out = new Uint8Array(CHUNK_PIXEL_COUNT);
  for (let i = 0; i < CHUNK_PIXEL_COUNT; i++) {
    const nibble = parseInt(hex[i], 16);
    out[i] = Number.isNaN(nibble) ? 0 : nibble;
  }
  return out;
};

export const encodeChunkHex = (indices: Uint8Array): string => {
  if (indices.length !== CHUNK_PIXEL_COUNT) {
    throw new Error(
      `Chunk indices must be ${CHUNK_PIXEL_COUNT} entries, got ${indices.length}`,
    );
  }
  let out = "";
  for (let i = 0; i < CHUNK_PIXEL_COUNT; i++) {
    const v = indices[i];
    if (v >= PALETTE_SIZE) {
      throw new Error(`Palette index out of range at ${i}: ${v}`);
    }
    out += v.toString(16);
  }
  return out;
};

export const emptyChunkIndices = (): Uint8Array => new Uint8Array(CHUNK_PIXEL_COUNT);

export const localIndex = (lx: number, ly: number): number => ly * CHUNK_SIZE + lx;

export const getPixelInChunk = (
  indices: Uint8Array,
  lx: number,
  ly: number,
): number => indices[localIndex(lx, ly)];

export const setPixelInChunk = (
  indices: Uint8Array,
  lx: number,
  ly: number,
  color: number,
): void => {
  indices[localIndex(lx, ly)] = color;
};
