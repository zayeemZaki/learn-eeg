"use client";

import { useState } from "react";

import { EegImage } from "@/components/ui/eeg-image";
import { ImageLightbox, type LightboxImage } from "@/components/ui/image-lightbox";

/** One displayable image — exactly the client-safe shape (url + alt only). */
export type GalleryImageView = LightboxImage;

/**
 * The question's EEG image gallery + click-to-zoom lightbox. Each thumbnail
 * reuses the shared EegImage frame (16:9, object-contain, "No image" state) and
 * is a <button> that opens a focus-trapped lightbox at that index.
 *
 * The lightbox is built on the shared Modal primitive (role="dialog", aria-modal,
 * Tab-trap, Escape, scrim, body-scroll lock, focus-restore-to-trigger) and adds
 * ←/→ key navigation plus prev/next buttons and a "n / N" counter. The full image
 * renders as a bare <img> (object-contain, capped to the viewport) — NOT the 16:9
 * frame — so it shows at its natural shape as large as fits. Each image uses its
 * stored alt, falling back to a sensible default.
 *
 * Renders nothing when there are no images (the parent decides whether to show a
 * section at all).
 */
export function QuestionGallery({ images }: { images: GalleryImageView[] }) {
  // null = lightbox closed; otherwise the active image index.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const count = images.length;
  if (count === 0) return null;

  const altFor = (img: GalleryImageView, i: number) =>
    img.alt && img.alt.length > 0 ? img.alt : `EEG image ${i + 1} of ${count}`;

  return (
    <>
      <ul
        className={`mt-4 grid gap-3 ${count === 1 ? "grid-cols-1 sm:max-w-md" : "grid-cols-2 sm:grid-cols-3"}`}
      >
        {images.map((img, i) => (
          <li key={`${img.url}-${i}`}>
            <button
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`View larger: ${altFor(img, i)}`}
              aria-haspopup="dialog"
              className="group relative block w-full overflow-hidden rounded-md outline-none transition duration-200 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] motion-safe:hover:-translate-y-0.5 [&_.eeg-image-frame]:transition-colors [&_.eeg-image-frame]:duration-200 hover:[&_.eeg-image-frame]:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] [&_img]:transition-transform [&_img]:duration-300 motion-safe:group-hover:[&_img]:scale-[1.04]"
            >
              <EegImage src={img.url} alt={altFor(img, i)} />

              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[var(--accent)] opacity-0 transition-opacity duration-200 group-hover:opacity-[0.06]"
              />
            </button>
          </li>
        ))}
      </ul>

      {activeIndex !== null ? (
        <ImageLightbox
          images={images}
          initialIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
        />
      ) : null}
    </>
  );
}
