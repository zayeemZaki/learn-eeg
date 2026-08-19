/**
 * Turns an admin-authored article URL into the safe presentation data used by
 * the literature reader. This deliberately has no React dependency so its URL
 * handling can be checked in isolation.
 */
export type ArticleLink =
  | {
      kind: "youtube";
      videoId: string;
      embedUrl: string;
      thumbnailUrl: string;
      watchUrl: string;
    }
  | { kind: "vimeo"; videoId: string; embedUrl: string; watchUrl: string }
  | { kind: "pubmed"; pmid: string; url: string }
  | { kind: "doi"; doi: string; url: string }
  | { kind: "link"; url: string; hostname: string };

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;
const VIMEO_ID = /^\d+$/;
const DOI = /^10\.\d{4,9}\/[\-._;()/:a-z0-9]+$/i;

const YOUTUBE_HOSTS = new Set(["youtube.com", "youtu.be"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "player.vimeo.com"]);
const PUBMED_HOSTS = new Set(["pubmed.ncbi.nlm.nih.gov", "ncbi.nlm.nih.gov"]);
const DOI_HOSTS = new Set(["doi.org"]);
const URL_IN_TEXT = /https?:\/\/[^\s<>"']+/gi;

function stripWww(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function onePathSegment(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 1 ? segments[0] ?? null : null;
}

function youtubeId(url: URL, hostname: string) {
  if (hostname === "youtu.be") return onePathSegment(url.pathname);

  const segments = url.pathname.split("/").filter(Boolean);
  if (url.pathname === "/watch") return url.searchParams.get("v");
  if ((segments[0] === "embed" || segments[0] === "shorts") && segments.length === 2) {
    return segments[1] ?? null;
  }
  return null;
}

function vimeoId(url: URL, hostname: string) {
  const segments = url.pathname.split("/").filter(Boolean);
  if (hostname === "vimeo.com" && segments.length === 1) return segments[0] ?? null;
  if (hostname === "player.vimeo.com" && segments[0] === "video" && segments.length === 2) {
    return segments[1] ?? null;
  }
  return null;
}

function pubmedId(url: URL, hostname: string) {
  const segments = url.pathname.split("/").filter(Boolean);
  if (hostname === "pubmed.ncbi.nlm.nih.gov" && segments.length === 1) return segments[0] ?? null;
  if (hostname === "ncbi.nlm.nih.gov" && segments[0] === "pubmed" && segments.length === 2) {
    return segments[1] ?? null;
  }
  return null;
}

/**
 * Resolves recognised article destinations. Only http(s) URLs are linkable;
 * malformed and non-web schemes quietly render nothing. In particular, embed
 * URLs are always constructed from validated IDs and hardcoded provider bases.
 */
export function resolveArticleLink(input: string): ArticleLink | null {
  if (typeof input !== "string" || !input.trim()) return null;

  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const hostname = stripWww(url.hostname);
  const link = (): ArticleLink => ({ kind: "link", url: url.href, hostname });

  if (YOUTUBE_HOSTS.has(hostname)) {
    const videoId = youtubeId(url, hostname);
    if (!videoId || !YOUTUBE_ID.test(videoId)) return link();

    return {
      kind: "youtube",
      videoId,
      // Do not derive this from input: no raw URL reaches an iframe src.
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      watchUrl: url.href,
    };
  }

  if (VIMEO_HOSTS.has(hostname)) {
    const videoId = vimeoId(url, hostname);
    if (!videoId || !VIMEO_ID.test(videoId)) return link();

    return {
      kind: "vimeo",
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      watchUrl: url.href,
    };
  }

  if (PUBMED_HOSTS.has(hostname)) {
    const pmid = pubmedId(url, hostname);
    if (pmid && /^\d+$/.test(pmid)) {
      return { kind: "pubmed", pmid, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` };
    }
    return link();
  }

  if (DOI_HOSTS.has(hostname)) {
    let doi: string;
    try {
      doi = decodeURIComponent(url.pathname.slice(1));
    } catch {
      return link();
    }
    if (DOI.test(doi)) return { kind: "doi", doi, url: `https://doi.org/${encodeURI(doi)}` };
    return link();
  }

  return link();
}

/**
 * Pull web URLs out of plain authored content. The cleaned text lets content
 * pages show a proper media card rather than leaving a long raw URL in a
 * paragraph. This extraction is deliberately presentation-only: the stored
 * content remains untouched.
 */
export function splitContentLinks(text: string): { text: string; urls: string[] } {
  const urls = Array.from(text.matchAll(URL_IN_TEXT), (match) =>
    // Sentence punctuation belongs to the sentence, not the URL.
    match[0].replace(/[),.!?;:]+$/, ""),
  ).filter(Boolean);

  return {
    text: text.replace(URL_IN_TEXT, "").replace(/\s{2,}/g, " ").trim(),
    urls: [...new Set(urls)],
  };
}

/** Collect unique links from dedicated fields and plain authored content. */
export function contentLinkUrls(...values: (string | null | undefined)[]): string[] {
  const urls = values.flatMap((value) => (value ? splitContentLinks(value).urls : []));
  return [...new Set(urls)];
}
