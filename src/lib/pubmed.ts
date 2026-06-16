/**
 * Latest Epilepsy Literature — read service over NCBI PubMed E-utilities.
 *
 * Two-step API: esearch (term -> PMIDs) then esummary (PMIDs -> metadata).
 * Results are cached in Redis (when configured) to stay well under PubMed's
 * rate limit and to keep the dashboard fast. All network calls are time-bounded
 * and failures degrade to an empty list rather than crashing the page.
 */
import { redis } from "@/lib/redis";
import { env } from "@/env";

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const SEARCH_TERM = "epilepsy[Title/Abstract] AND EEG[Title/Abstract]";
const CACHE_KEY = "literature:epilepsy:latest";
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour
const REQUEST_TIMEOUT_MS = 8000;

export interface Article {
  pmid: string;
  title: string;
  journal: string;
  pubDate: string;
  url: string;
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`PubMed responded ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function withApiKey(params: URLSearchParams): URLSearchParams {
  if (env.PUBMED_API_KEY) params.set("api_key", env.PUBMED_API_KEY);
  return params;
}

async function searchPmids(limit: number): Promise<string[]> {
  const params = withApiKey(
    new URLSearchParams({
      db: "pubmed",
      term: SEARCH_TERM,
      retmode: "json",
      retmax: String(limit),
      sort: "pub_date",
    }),
  );
  const data = (await fetchJson(`${EUTILS}/esearch.fcgi?${params}`)) as {
    esearchresult?: { idlist?: string[] };
  };
  return data.esearchresult?.idlist ?? [];
}

async function summarize(pmids: string[]): Promise<Article[]> {
  if (pmids.length === 0) return [];
  const params = withApiKey(
    new URLSearchParams({
      db: "pubmed",
      id: pmids.join(","),
      retmode: "json",
    }),
  );
  const data = (await fetchJson(`${EUTILS}/esummary.fcgi?${params}`)) as {
    result?: Record<string, { uid: string; title?: string; fulljournalname?: string; source?: string; pubdate?: string }>;
  };
  const result = data.result ?? {};
  // `result.uids` holds ordering; the rest are keyed by PMID.
  return pmids
    .map((pmid) => result[pmid])
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({
      pmid: item.uid,
      title: item.title ?? "Untitled",
      journal: item.fulljournalname ?? item.source ?? "Unknown journal",
      pubDate: item.pubdate ?? "",
      url: `https://pubmed.ncbi.nlm.nih.gov/${item.uid}/`,
    }));
}

/**
 * Returns the latest epilepsy/EEG articles, cached when Redis is available.
 * Never throws to the caller: on any failure it returns an empty array and
 * logs, so the page renders a graceful empty state.
 */
export async function getLatestLiterature(limit = 10): Promise<Article[]> {
  try {
    if (redis) {
      const cached = await redis.get(CACHE_KEY);
      if (cached) return JSON.parse(cached) as Article[];
    }

    const articles = await summarize(await searchPmids(limit));

    if (redis && articles.length > 0) {
      await redis.set(CACHE_KEY, JSON.stringify(articles), "EX", CACHE_TTL_SECONDS);
    }
    return articles;
  } catch (error) {
    console.error("Failed to load literature:", error);
    return [];
  }
}
