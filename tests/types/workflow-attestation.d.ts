declare module '*.mjs' {
  export const buildManifest: (input: unknown) => Record<string, unknown>;
  export const canonicalJson: (value: unknown) => string;
  export const sha256: (value: string) => string;
  export const validateManifest: (manifest: unknown) => boolean;
  export const verifyGhResult: (output: string, options: unknown) => unknown;
}
