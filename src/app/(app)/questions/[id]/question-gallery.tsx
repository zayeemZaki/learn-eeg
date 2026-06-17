"use client";

import { useCallback, useState } from "react";

import { EegImage } from "@/components/ui/eeg-image";
import { Modal } from "@/components/ui/modal";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CrossIcon,
} from "@/components/ui/icons";

/** One displayable image — exactly the client-safe shape (url + alt only). */
export interface GalleryImageView {
  url: string;
  alt: string | null;
}

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
  const open = activeIndex !== null;

  const close = useCallback(() => setActiveIndex(null), []);
  const next = useCallback(
    () => setActiveIndex((i) => (i === null ? i : (i + 1) % count)),
    [count],
  );
  const prev = useCallback(
    () => setActiveIndex((i) => (i === null ? i : (i - 1 + count) % count)),
    [count],
  );

  // ←/→ navigation inside the lightbox. Escape is handled by the Modal itself.
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (count < 2) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    },
    [count, next, prev],
  );

  if (count === 0) return null;

  const altFor = (img: GalleryImageView, i: number) =>
    img.alt && img.alt.length > 0 ? img.alt : `EEG image ${i + 1} of ${count}`;

  const active = activeIndex !== null ? images[activeIndex]! : null;

  return (
    <>
      {/* Gallery grid — single image still gets a button so zoom is consistent. */}
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
              className="group block w-full overflow-hidden rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] motion-safe:hover:-translate-y-0.5"
            >
              <EegImage src={img.url} alt={altFor(img, i)} />
            </button>
          </li>
        ))}
      </ul>

      {open && active ? (
        <Modal
          open={open}
          onClose={close}
          onKeyDown={onKeyDown}
          label={`Image viewer — ${altFor(active, activeIndex!)}`}
          className="flex w-full max-w-4xl flex-col gap-3"
        >
          {/* Top bar: counter (text, never colour-only) + close. */}
          <div className="flex items-center justify-between gap-3 text-white">
            <span className="rounded-md bg-[color-mix(in_srgb,black_45%,transparent)] px-2.5 py-1 text-sm font-medium tabular-nums">
              {activeIndex! + 1} / {count}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Close image viewer"
              className="rounded-md bg-[color-mix(in_srgb,black_45%,transparent)] p-2 outline-none transition hover:bg-[color-mix(in_srgb,black_65%,transparent)] focus-visible:ring-2 focus-visible:ring-white"
            >
              <CrossIcon className="h-5 w-5 shrink-0" />
            </button>
          </div>

          {/* The full image — bare <img>, object-contain, capped to the viewport. */}
          <div className="flex items-center justify-center gap-2">
            {count > 1 ? (
              <NavButton onClick={prev} label="Previous image">
                <ChevronLeftIcon className="h-6 w-6" />
              </NavButton>
            ) : null}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.url}
              alt={altFor(active, activeIndex!)}
              className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain"
            />

            {count > 1 ? (
              <NavButton onClick={next} label="Next image">
                <ChevronRightIcon className="h-6 w-6" />
              </NavButton>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </>
  );
}

/** A large prev/next control flanking the lightbox image. */
function NavButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="shrink-0 rounded-full bg-[color-mix(in_srgb,black_45%,transparent)] p-2 text-white outline-none transition hover:bg-[color-mix(in_srgb,black_65%,transparent)] focus-visible:ring-2 focus-visible:ring-white"
    >
      {children}
    </button>
  );
}
