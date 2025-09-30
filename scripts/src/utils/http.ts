import axios from 'axios';

// -------------------- Networking (timeouts + retries) --------------------
const http = axios.create({
  timeout: 20_000,
  maxRedirects: 5,
  headers: {
    'User-Agent': 'wh-doc-gen/1.0 (+docs generator)',
    Accept: 'text/plain, text/*;q=0.9, */*;q=0.8',
  },
});

export async function fetchText(url: string, tries = 3): Promise<string> {
  let lastErr: any;
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await http.get(url, { responseType: 'text', transformResponse: (v) => v });
      return (res.data as string) ?? '';
    } catch (e) {
      lastErr = e;
      if (i < tries) await new Promise((r) => setTimeout(r, 350 * i));
    }
  }
  throw lastErr;
}
