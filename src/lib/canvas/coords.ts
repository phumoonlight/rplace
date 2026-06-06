import { CANVAS_DIMENSIONS, CHUNK_SIZE, type Orientation } from "./constants";

export type ChunkCoord = { cx: number; cy: number };
export type LocalCoord = { lx: number; ly: number };
export type PixelLocation = ChunkCoord & LocalCoord;

export const chunkKey = (cy: number, cx: number): string => `${cy}_${cx}`;

export const parseChunkKey = (key: string): ChunkCoord => {
  const [cyStr, cxStr] = key.split("_");
  return { cy: Number(cyStr), cx: Number(cxStr) };
};

export const getChunkGrid = (orientation: Orientation): { cols: number; rows: number } => {
  const { width, height } = CANVAS_DIMENSIONS[orientation];
  return { cols: width / CHUNK_SIZE, rows: height / CHUNK_SIZE };
};

export const getAllChunkKeys = (orientation: Orientation): string[] => {
  const { cols, rows } = getChunkGrid(orientation);
  const keys: string[] = [];
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      keys.push(chunkKey(cy, cx));
    }
  }
  return keys;
};

export const pixelToChunk = (x: number, y: number): PixelLocation => {
  const cx = Math.floor(x / CHUNK_SIZE);
  const cy = Math.floor(y / CHUNK_SIZE);
  return { cx, cy, lx: x - cx * CHUNK_SIZE, ly: y - cy * CHUNK_SIZE };
};

export const isPixelInBounds = (
  orientation: Orientation,
  x: number,
  y: number,
): boolean => {
  const { width, height } = CANVAS_DIMENSIONS[orientation];
  return x >= 0 && y >= 0 && x < width && y < height;
};
