"use client";

import { useState } from "react";

import { EegImage } from "@/components/ui/eeg-image";
import { ImageLightbox } from "@/components/ui/image-lightbox";

interface AtlasImageLightboxProps {
  src: string | null;
  title: string;
  description: string;
}

/** A single atlas figure with the shared image-lightbox behaviour. */
export function AtlasImageLightbox({ src, title, description }: AtlasImageLightboxProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!src) return <EegImage src={src} alt={title} />;

  return (
    <>
      <button
        type="button"
        onClick={() => setActiveIndex(0)}
        aria-label={`View larger: ${title}`}
        aria-haspopup="dialog"
        className="group relative block w-full overflow-hidden rounded-md outline-none transition duration-200 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] motion-safe:hover:-translate-y-0.5 [&_.eeg-image-frame]:transition-colors [&_.eeg-image-frame]:duration-200 hover:[&_.eeg-image-frame]:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] [&_img]:transition-transform [&_img]:duration-300 motion-safe:group-hover:[&_img]:scale-[1.04]"
      >
        <EegImage src={src} alt={title} />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[var(--accent)] opacity-0 transition-opacity duration-200 group-hover:opacity-[0.06]" />
      </button>
      {activeIndex !== null ? (
        <ImageLightbox
          images={[{ url: src, alt: title, caption: description }]}
          initialIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
        />
      ) : null}
    </>
  );
}
