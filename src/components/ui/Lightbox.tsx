"use client";

import { useEffect } from "react";

// A minimal image lightbox: fixed dark backdrop with a centered image. Closes on
// Escape or a backdrop click. Controlled — render when `src` is set, and pass an
// `onClose` handler. No external dependencies.
export default function Lightbox({
  src,
  alt = "",
  caption,
  onClose,
}: {
  src: string | null;
  alt?: string;
  caption?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Prevent the page behind from scrolling while open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Image preview"}
      onClick={onClose}
      className="fixed inset-0 z-50 flex animate-fade-in flex-col items-center justify-center bg-charcoal/80 p-6 backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="focus-ring absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-2xl leading-none text-on-dark hover:bg-white/20"
      >
        ×
      </button>
      {/* Stop propagation so clicking the image itself doesn't close. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-[90vw] rounded-md bg-white object-contain shadow-card"
      />
      {caption && (
        <p className="mt-3 max-w-[90vw] text-center text-body-sm text-on-dark-muted">{caption}</p>
      )}
    </div>
  );
}
