import * as Crypto from "expo-crypto";

function toBinary(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

function utf8Encode(input: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let c = input.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < input.length) {
      const c2 = input.charCodeAt(++i);
      c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return new Uint8Array(out);
}

function bytesToBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}

function sha256Digest(_algorithm: AlgorithmIdentifier | { name: string }, data: BufferSource): Promise<ArrayBuffer> {
  const bytes =
    data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array((data as ArrayBufferView).buffer, (data as ArrayBufferView).byteOffset, (data as ArrayBufferView).byteLength);
  const input = new TextDecoder().decode(bytes);
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, {
    encoding: Crypto.CryptoEncoding.HEX,
  }).then((hex) => {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return bytesToBuffer(out);
  });
}

export function ensureWebCrypto(): void {
  const g = globalThis as any;
  if (typeof g.TextEncoder === "undefined") {
    g.TextEncoder = class TextEncoder {
      readonly encoding = "utf-8";
      encode(input = ""): Uint8Array {
        return utf8Encode(String(input));
      }
      encodeInto(input: string, dest: Uint8Array): { read: number; written: number } {
        const src = utf8Encode(String(input));
        const written = Math.min(src.length, dest.length);
        dest.set(src.subarray(0, written));
        return { read: written, written };
      }
    };
  }
  if (typeof g.TextDecoder === "undefined") {
    g.TextDecoder = class TextDecoder {
      readonly encoding = "utf-8";
      decode(input?: ArrayBufferView | ArrayBuffer): string {
        const bytes =
          input == null
            ? new Uint8Array(0)
            : input instanceof ArrayBuffer
              ? new Uint8Array(input)
              : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        let out = "";
        for (let i = 0; i < bytes.length; ) {
          const b = bytes[i++];
          if (b < 0x80) out += String.fromCharCode(b);
          else if (b < 0xe0) out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f));
          else if (b < 0xf0) {
            out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
          } else {
            let c = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
            c -= 0x10000;
            out += String.fromCharCode(0xd800 + (c >> 10), 0xdc00 + (c & 0x3ff));
          }
        }
        return out;
      }
    };
  }
  if (g.crypto && typeof g.crypto.subtle !== "undefined") return;
  const subtle = { digest: sha256Digest };
  if (g.crypto) {
    Object.defineProperty(g.crypto, "subtle", { configurable: true, enumerable: true, value: subtle });
  } else {
    g.crypto = { subtle };
  }
}
