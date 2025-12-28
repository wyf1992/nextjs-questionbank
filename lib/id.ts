import Hashids from "hashids";

// 使用固定的salt来确保一致性
const hashids = new Hashids("questionbank-salt", 8);

/**
 * 将数字ID编码为混淆的字符串ID
 */
export function encodeId(id: number): string {
  return hashids.encode(id);
}

/**
 * 将混淆的字符串ID解码为数字ID
 */
export function decodeId(encodedId: string): number | null {
  const decoded = hashids.decode(encodedId);
  return decoded.length > 0 ? (decoded[0] as number) : null;
}
