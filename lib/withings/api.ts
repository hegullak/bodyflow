import { getWithingsConfig } from "./config";

export class WithingsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "WithingsApiError";
  }
}

interface WithingsEnvelope<T> {
  status: number;
  body: T;
}

export interface WithingsTokenResponse {
  userid: string;
  access_token: string;
  refresh_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
}

export interface WithingsMeasureResponse {
  updatetime: number;
  timezone: string;
  measuregrps: {
    grpid: number;
    date: number;
    measures: { value: number; type: number; unit: number }[];
  }[];
}

async function parseWithingsResponse<T>(response: Response): Promise<T> {
  const json = (await response.json()) as WithingsEnvelope<T>;
  if (json.status !== 0) {
    throw new WithingsApiError(`Withings API error status ${json.status}`, json.status);
  }
  return json.body;
}

async function postForm<T>(
  url: string,
  params: Record<string, string>,
  accessToken?: string,
): Promise<T> {
  const body = new URLSearchParams(params);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new WithingsApiError(`Withings HTTP ${response.status}`, response.status);
  }

  return parseWithingsResponse<T>(response);
}

export function buildAuthorizeUrl(state: string, redirectUri: string): string {
  const config = getWithingsConfig();
  if (!config) throw new Error("Withings is not configured");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    scope: config.scopes,
    redirect_uri: redirectUri,
    state,
  });

  if (config.oauthMode === "demo") {
    params.set("mode", "demo");
  }

  return `${config.authorizeUrl}?${params.toString()}`;
}

export async function exchangeAuthorizationCode(
  code: string,
  redirectUri: string,
): Promise<WithingsTokenResponse> {
  const config = getWithingsConfig();
  if (!config) throw new Error("Withings is not configured");

  return postForm<WithingsTokenResponse>(`${config.apiBase}/v2/oauth2`, {
    action: "requesttoken",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
}

export async function refreshAccessToken(refreshToken: string): Promise<WithingsTokenResponse> {
  const config = getWithingsConfig();
  if (!config) throw new Error("Withings is not configured");

  return postForm<WithingsTokenResponse>(`${config.apiBase}/v2/oauth2`, {
    action: "requesttoken",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

export async function fetchMeasurements(
  accessToken: string,
  options: { lastupdate?: number; startdate?: number; enddate?: number },
): Promise<WithingsMeasureResponse> {
  const config = getWithingsConfig();
  if (!config) throw new Error("Withings is not configured");

  const params: Record<string, string> = {
    action: "getmeas",
    meastypes: "1",
  };

  if (options.lastupdate != null) {
    params.lastupdate = String(options.lastupdate);
  } else {
    if (options.startdate != null) params.startdate = String(options.startdate);
    if (options.enddate != null) params.enddate = String(options.enddate);
  }

  return postForm<WithingsMeasureResponse>(`${config.apiBase}/measure`, params, accessToken);
}

export async function subscribeToBodyMetrics(
  accessToken: string,
  callbackUrl: string,
): Promise<void> {
  const config = getWithingsConfig();
  if (!config) throw new Error("Withings is not configured");

  await postForm<Record<string, never>>(
    `${config.apiBase}/notify`,
    {
      action: "subscribe",
      callbackurl: callbackUrl,
      appli: "1",
    },
    accessToken,
  );
}
