"use client";

import { useEffect, useState } from "react";

interface ArticleVideoProps {
  title: string;
  embedUrl: string;
  watchUrl: string;
  thumbnailUrl?: string;
}

const frameClass =
  "relative aspect-[16/9] w-full overflow-hidden rounded-md border border-[var(--border)] bg-[var(--background)]";

/**
 * The only client-side part of article media. It first renders a normal
 * link-out, then enhances to a button after hydration; this preserves a useful
 * poster link for readers with JavaScript disabled and never loads an iframe
 * until a deliberate click.
 */
export function ArticleVideo({ title, embedUrl, watchUrl, thumbnailUrl }: ArticleVideoProps) {
  const [enhanced, setEnhanced] = useState(false);
  const [playing, setPlaying] = useState(false);
  const safeTitle = title || "Untitled article";

  useEffect(() => setEnhanced(true), []);

  if (playing) {
    return (
      <div className={frameClass}>
        <iframe
          src={embedUrl}
          title={`Video: ${safeTitle}`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  const poster = thumbnailUrl ? (
    // Provider thumbnail URL is derived from a validated video ID, never author input.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-sm font-medium text-[var(--muted)]">
      Video
    </div>
  );

  if (!enhanced) {
    return (
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${frameClass} block outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]`}
      >
        {poster}
        <span className="sr-only">Watch video: {safeTitle}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play video: ${safeTitle}`}
      className={`${frameClass} block cursor-pointer text-left outline-none transition-shadow motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]`}
    >
      {poster}
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--foreground)_25%,transparent)]"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--accent)] shadow-sm">
          ▶
        </span>
      </span>
    </button>
  );
}
