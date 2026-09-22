import type { HttpRequest, HttpResponse, HttpTransport } from './ports';

type RawHeaders = Record<string, string | string[]>;

function normalizeHeaders(headers: RawHeaders): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(', ') : value,
    ]),
  );
}

export class AppsScriptHttpTransport implements HttpTransport {
  request(request: HttpRequest): HttpResponse {
    const response = UrlFetchApp.fetch(request.url, {
      method: request.method.toLowerCase() as GoogleAppsScript.URL_Fetch.HttpMethod,
      headers: request.headers ? { ...request.headers } : undefined,
      payload: request.body,
      muteHttpExceptions: true,
      followRedirects: false,
    });

    return {
      status: response.getResponseCode(),
      headers: normalizeHeaders(response.getAllHeaders() as RawHeaders),
      body: response.getContentText(),
    };
  }
}
