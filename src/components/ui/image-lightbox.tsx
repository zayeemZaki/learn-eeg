"use client";

import { useCallback, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { ChevronLeftIcon, ChevronRightIcon, CrossIcon } from "@/components/ui/icons";

/** The client-safe data required by every EEG-image lightbox. */
export interface LightboxImage {
  url: string;
  alt: string | null;
  caption?: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  initialIndex: number;
  onClose: () => void;
}

/**
 * Shared focus-trapped image lightbox for questions and atlas entries. Modal
 * supplies focus management, Escape, scrim dismissal, and focus restoration;
 * this component adds image navigation and the counter used by both surfaces.
 */
export function ImageLightbox({ images, initialIndex, onClose }: ImageLightboxProps) {
  const count = images.length;
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const active = images[activeIndex] ?? null;

  const next = useCallback(
    () => {
      setActiveIndex((index) => (index + 1) % count);
    },
    [count],
  );
  const prev = useCallback(
    () => {
      setActiveIndex((index) => (index - 1 + count) % count);
    },
    [count],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (count < 2) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
      }
    },
    [count, next, prev],
  );

  if (!active) return null;

  const alt = active.alt && active.alt.length > 0 ? active.alt : `EEG image ${activeIndex + 1} of ${count}`;

  return (
    <Modal
      open
      onClose={onClose}
      onKeyDown={onKeyDown}
      label={`Image viewer — ${alt}`}
      className="flex w-full max-w-4xl flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-3 text-white">
        <span className="rounded-full bg-[color-mix(in_srgb,black_50%,transparent)] px-3 py-1 text-sm font-medium tabular-nums backdrop-blur-sm">
          {activeIndex + 1} / {count}
        </span>
        <button type="button" onClick={onClose} aria-label="Close image viewer" className={`p-2 ${overlayControl}`}>
          <CrossIcon className="h-5 w-5 shrink-0" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2">
        {count > 1 ? (
          <NavButton onClick={prev} label="Previous image">
            <ChevronLeftIcon className="h-6 w-6" />
          </NavButton>
        ) : null}

        <div className="min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={active.url}
            src={active.url}
            alt={alt}
            decoding="async"
            className="eeg-image-img max-h-[75vh] w-auto max-w-full rounded-md object-contain shadow-lg"
          />
          {active.caption ? <p className="mt-2 text-sm text-white">{active.caption}</p> : null}
        </div>

        {count > 1 ? (
          <NavButton onClick={next} label="Next image">
            <ChevronRightIcon className="h-6 w-6" />
          </NavButton>
        ) : null}
      </div>
    </Modal>
  );
}

const overlayControl =
  "rounded-full bg-[color-mix(in_srgb,black_50%,transparent)] text-white backdrop-blur-sm outline-none transition duration-150 " +
  "hover:bg-[color-mix(in_srgb,black_70%,transparent)] active:scale-95 " +
  "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black";

function NavButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`shrink-0 p-2 ${overlayControl}`}>
      {children}
    </button>
  );
}
