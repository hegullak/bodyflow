export function getAppOrigin(request?: Request): string {
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto");
    if (forwardedHost) {
      const host = forwardedHost.split(",")[0]?.trim();
      if (host) {
        const proto = forwardedProto?.split(",")[0]?.trim() ?? "https";
        return `${proto}://${host}`;
      }
    }

    const current = new URL(request.url);
    return `${current.protocol}//${current.host}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";
}

export function buildAppUrl(request: Request, path: string): URL {
  return new URL(path, getAppOrigin(request));
}

export function getWithingsCallbackUrl(request: Request): string {
  return `${getAppOrigin(request)}/api/integrations/withings/callback`;
}
