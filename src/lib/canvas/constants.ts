export type Orientation = "landscape" | "portrait";

export const ORIENTATIONS = ["landscape", "portrait"] as const satisfies readonly Orientation[];

export const CHUNK_SIZE = 50;

export type CanvasDimensions = { width: number; height: number };

export const CANVAS_DIMENSIONS: Record<Orientation, CanvasDimensions> = {
  landscape: { width: 800, height: 400 },
  portrait: { width: 400, height: 800 },
};

export type PaletteEntry = { name: string; hex: string; rgb: readonly [number, number, number] };

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
};

const definePalette = (entries: ReadonlyArray<{ name: string; hex: string }>): readonly PaletteEntry[] =>
  entries.map((e) => ({ ...e, rgb: hexToRgb(e.hex) }));

export const PALETTE = definePalette([
  { name: "white", hex: "#FFFFFF" },
  { name: "lightGray", hex: "#D4D4D4" },
  { name: "darkGray", hex: "#888888" },
  { name: "black", hex: "#222222" },
  { name: "pink", hex: "#FFA7D1" },
  { name: "red", hex: "#E50000" },
  { name: "orange", hex: "#E59500" },
  { name: "brown", hex: "#A06A42" },
  { name: "yellow", hex: "#E5D900" },
  { name: "lightGreen", hex: "#94E044" },
  { name: "green", hex: "#02BE01" },
  { name: "cyan", hex: "#00D3DD" },
  { name: "lightBlue", hex: "#0083C7" },
  { name: "blue", hex: "#0000EA" },
  { name: "magenta", hex: "#CF6EE4" },
  { name: "purple", hex: "#820080" },
]);

export const PALETTE_SIZE = PALETTE.length;

export const MAX_PIXELS_PER_REQUEST = 100;
