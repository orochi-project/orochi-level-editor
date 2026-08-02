import {
  NoteType,
  Direction,
  NOTE_TYPES,
  ALL_DIRECTIONS,
} from "../shared/utils/notes";
import { ROW_HEIGHT } from "./constants";

/**
 * Get the full specs of a note type.
 *
 * @param noteType - The note type to get the metadata of.
 *
 * @returns The metadata/specs of the given note type.
 */
export function getNoteTypeMetadata(noteType: NoteType) {
  return NOTE_TYPES.find((t: any) => t.key === noteType)!;
}

/**
 * Get the icon indicator of a specific direction.
 *
 * @param direction - The direction to get the icon of.
 *
 * @returns The icon name of the direction, or undefined if not found.
 */
export function getDirectionIcon(
  direction: Direction | null,
): string | undefined {
  return ALL_DIRECTIONS.find((d: any) => d.key === direction)?.icon;
}

/**
 * Get the label string of a specific direction.
 *
 * @param direction - The direction to get the label of.
 *
 * @returns The label of the direction.
 */
export function getDirectionLabel(direction: Direction | null): string {
  return ALL_DIRECTIONS.find((d: any) => d.key === direction)?.label ?? "";
}

/**
 * Convert a frame number to pixels based on the defined pixelsPerFrame value.
 *
 * @param frame - The frame number to convert.
 * @param pixelsPerFrame - The zoom factor.
 *
 * @returns The calculated pixel value.
 */
export function frameToPx(frame: number, pixelsPerFrame: number): number {
  return frame * pixelsPerFrame;
}

/**
 * Convert an absolute pixel position to a frame number.
 *
 * Used only for placing notes from a raw position.
 *
 * @param px - The pixel position on the timeline.
 * @param pixelsPerFrame - The zoom factor.
 * @param snapFrames - The current snap amount.
 * @param snap - Whether or not the result should snap to the frame grid.
 *
 * @returns The calculated the frame number.
 */
export function pxToFrame(
  px: number,
  pixelsPerFrame: number,
  snapFrames: number,
  snap = true,
): number {
  const rawFrame = px / pixelsPerFrame;
  const snapAmount = Number(snapFrames) || 4;
  const frame = snap
    ? Math.round(rawFrame / snapAmount) * snapAmount
    : Math.round(rawFrame);

  return Math.max(0, frame);
}

/**
 * Convert a relative pixel delta (e.g. pointer movement during a drag) to a frame delta.
 *
 * Unlike pxToFrame, this does not clamp to zero. Deltas should be negative when dragging/resizing leftward. Any clamping of the resulting frame value should happen at the call site, after adding the delta to the original frame.
 *
 * @param px - The pixel delta to convert.
 * @param pixelsPerFrame - The zoom factor.
 * @param snapFrames - The current snap amount.
 *
 * @returns The calculated frame delta.
 */
export function pxDeltaToFrame(
  px: number,
  pixelsPerFrame: number,
  snapFrames: number,
): number {
  const rawFrame = px / pixelsPerFrame;
  const snapAmount = Number(snapFrames) || 4;
  return Math.round(rawFrame / snapAmount) * snapAmount;
}

/**
 * Get a pointer event's position relative to the rows container's current visual box.
 *
 * @param e - The pointer event properties.
 * @param container - The container element.
 *
 * @returns The x-position and y-position relative to the rows container.
 */
export function containerRelativePos(
  e: PointerEvent,
  container: HTMLElement,
): { x: number; y: number } {
  const rect = container.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

/**
 * Get the note-type row index at a given container-relative y position.
 *
 * @param y - The y position relative to the rows container.
 *
 * @returns The clamped row index.
 */
export function rowIndexAtY(y: number): number {
  return Math.max(
    0,
    Math.min(NOTE_TYPES.length - 1, Math.floor(y / ROW_HEIGHT)),
  );
}
