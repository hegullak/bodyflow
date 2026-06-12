export function buildAppUrl(request: Request, path: string): URL {
  const current = new URL(request.url);
  return new URL(path, `${current.protocol}//${current.host}`);
}

export function getAppOrigin(request?: Request): string {
  if (request) {
    const current = new URL(request.url);
    return `${current.protocol}//${current.host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";
}
