import type { Hasher } from './ports';

export class AppsScriptHasher implements Hasher {
  sha256(value: string): string {
    const bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      value,
      Utilities.Charset.UTF_8,
    );
    return bytes.map((byte) => ((byte + 256) % 256).toString(16).padStart(2, '0')).join('');
  }
}
