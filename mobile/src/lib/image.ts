import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

/**
 * RN replacement for the web `downscaleImage` (canvas-based).
 * Returns a base64 JPEG (no data: prefix) sized to fit `maxSide`.
 */
export async function downscaleToBase64(
  uri: string,
  maxSide: number,
  quality: number,
): Promise<string> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: maxSide } }],
    { compress: quality, format: SaveFormat.JPEG, base64: true },
  );
  return result.base64 ?? "";
}

/** Tiny JPEG thumbnail data-URL for history rows (kept in AsyncStorage). */
export async function makeThumbDataUrl(uri: string): Promise<string | undefined> {
  try {
    const b64 = await downscaleToBase64(uri, 128, 0.5);
    return b64 ? `data:image/jpeg;base64,${b64}` : undefined;
  } catch {
    return undefined;
  }
}
