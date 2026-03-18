// Shared Gmail API fetch helper using net.fetch directly.
// All Gmail tools import gmailNetFetch from here instead of
// using gmailFetch (from ../api) or oauth.fetch.

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

/** Default per-request timeout in seconds. */
const FETCH_TIMEOUT_SEC = 20;

export interface GmailFetchResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: number; message: string };
}

/**
 * Fetch from the Gmail API using net.fetch directly.
 * Retrieves the OAuth access token from oauth.getCredential() unless
 * an explicit accessToken override is provided.
 */
export async function gmailNetFetch<T = unknown>(
  endpoint: string,
  options: {
    method?: string;
    body?: string;
    timeout?: number;
    /** Optional explicit access token (e.g. passed from the frontend). */
    accessToken?: string;
  } = {}
): Promise<GmailFetchResult<T>> {
  const token = options.accessToken || (oauth.getCredential()?.accessToken as string | undefined);

  if (!token) {
    return {
      success: false,
      error: { code: 401, message: 'Gmail not connected. Complete OAuth setup first.' },
    };
  }

  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${GMAIL_API_BASE}${path}`;

  try {
    console.log('gmailNetFetch', url, options);
    const res = await net.fetch(url, {
      method: options.method || 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: options.body,
      timeout: options.timeout || FETCH_TIMEOUT_SEC,
    });
    console.log('🚀 ~ gmailNetFetch ~ res:', res);

    if (res.status >= 200 && res.status < 300) {
      const data = res.body ? (JSON.parse(res.body as string) as T) : undefined;
      return { success: true, data };
    }

    let errCode = res.status;
    let errMessage = `Gmail API error: ${res.status}`;
    try {
      const parsed = JSON.parse(res.body as string);
      if (parsed?.error?.code) errCode = parsed.error.code;
      if (parsed?.error?.message) errMessage = parsed.error.message;
    } catch {
      // Keep defaults
    }
    return { success: false, error: { code: errCode, message: errMessage } };
  } catch (err) {
    return {
      success: false,
      error: { code: 500, message: err instanceof Error ? err.message : String(err) },
    };
  }
}
