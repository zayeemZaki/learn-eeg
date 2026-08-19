import assert from "node:assert/strict";

import { resolveArticleLink, splitContentLinks } from "./article-link";

const cases = [
  ["youtu.be short link", "https://youtu.be/dQw4w9WgXcQ", "youtube"],
  ["YouTube watch URL", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube"],
  ["YouTube embed URL", "https://youtube.com/embed/dQw4w9WgXcQ", "youtube"],
  ["YouTube Shorts URL", "https://youtube.com/shorts/dQw4w9WgXcQ", "youtube"],
  [
    "YouTube extra query parameters",
    "https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=12",
    "youtube",
  ],
  ["non-video YouTube URL", "https://youtube.com/channel/UC123", "link"],
  ["lookalike YouTube hostname", "https://youtube.com.evil.com/watch?v=x", "link"],
  ["invalid YouTube ID", "https://youtube.com/watch?v=too-short", "link"],
  ["PubMed", "https://pubmed.ncbi.nlm.nih.gov/12345678/", "pubmed"],
  ["DOI", "https://doi.org/10.1000/example.1", "doi"],
  ["unparseable", "not a url", null],
] as const;

for (const [name, input, kind] of cases) {
  const result = resolveArticleLink(input);
  assert.equal(result?.kind ?? null, kind, name);
}

const youtube = resolveArticleLink("https://youtube.com/watch?v=dQw4w9WgXcQ");
assert.equal(youtube?.kind, "youtube");
if (youtube?.kind === "youtube") {
  assert.equal(youtube.embedUrl, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
}

assert.deepEqual(
  splitContentLinks("Watch https://youtu.be/dQw4w9WgXcQ. Then discuss."),
  { text: "Watch Then discuss.", urls: ["https://youtu.be/dQw4w9WgXcQ"] },
);
