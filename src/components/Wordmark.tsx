/* eslint-disable i18next/no-literal-string -- brand name is not translatable */
import React from "react";

interface WordmarkProps {
  className?: string;
}

/**
 * Awaz brand wordmark, in the brand sans (`.font-brand`) — the display
 * serif is for page titles, never for the name.
 */
export const Wordmark: React.FC<WordmarkProps> = ({ className = "" }) => (
  <span
    className={`font-brand font-semibold tracking-tight text-ink leading-none select-none inline-block ${className}`}
  >
    Awaz
  </span>
);

export default Wordmark;
