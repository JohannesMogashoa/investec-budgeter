export interface Base64Encoder {
  encode(value: string): string;
}

export class AppsScriptBase64Encoder implements Base64Encoder {
  encode(value: string): string {
    return Utilities.base64Encode(value, Utilities.Charset.UTF_8);
  }
}
