"use client";

import { Link } from "@shapewebs/ui/link";
import { useEffect, useRef, useState } from "react";

import styles from "./site-search.module.css";

const searchDestinations = [
  {
    category: "Services",
    href: "/services/website-design",
    label: "Website design",
  },
  {
    category: "Services",
    href: "/services/nextjs-development",
    label: "Next.js development",
  },
  { category: "Work", href: "/projects", label: "Selected work" },
  { category: "Studio", href: "/journal", label: "Journal" },
  { category: "Studio", href: "/process", label: "Process" },
  { category: "Connect", href: "/contact", label: "Contact" },
] as const;

type SiteSearchPanelProps = Readonly<{
  onClose: () => void;
  open: boolean;
  panelId: string;
}>;

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <circle cx="7" cy="7" fill="none" r="4.25" stroke="currentColor" />
      <path
        d="m10.25 10.25 3 3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function SiteSearchPanel({
  onClose,
  open,
  panelId,
}: SiteSearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const results = normalizedQuery
    ? searchDestinations.filter(({ category, label }) =>
        `${category} ${label}`.toLowerCase().includes(normalizedQuery),
      )
    : searchDestinations;

  useEffect(() => {
    if (!open) {
      return;
    }

    const focusFrame = requestAnimationFrame(() => inputRef.current?.focus());

    return () => cancelAnimationFrame(focusFrame);
  }, [open]);

  return (
    <div
      aria-hidden={!open}
      aria-label="Site search"
      className={styles["sitesearch-panel-zlfxw1"]}
      data-state={open ? "open" : "closed"}
      id={panelId}
      inert={!open}
      role="dialog"
    >
      <form
        className={styles["sitesearch-form-pyra1q"]}
        onSubmit={(event) => event.preventDefault()}
        role="search"
      >
        <div className={styles["sitesearch-inputrow-agw24s"]}>
          <span className={styles["sitesearch-icon-6qt758"]}>
            <SearchIcon />
          </span>
          <input
            aria-label="Search Shapewebs"
            className={styles["sitesearch-input-8pz354"]}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Shapewebs"
            ref={inputRef}
            type="search"
            value={query}
          />
        </div>
      </form>

      <p className={styles["sitesearch-eyebrow-0yyd2h"]}>
        {query ? "Results" : "Quick access"}
      </p>
      {results.length > 0 ? (
        <ul className={styles["sitesearch-results-syg9p2"]} role="list">
          {results.map((result) => (
            <li key={result.href}>
              <Link
                className={styles["sitesearch-result-ngs0gq"]}
                href={result.href}
                onClick={onClose}
                underline="none"
              >
                <span className={styles["sitesearch-resultcopy-v8j6x2"]}>
                  <strong className={styles["sitesearch-resultlabel-f2orbc"]}>
                    {result.label}
                  </strong>
                  <small className={styles["sitesearch-resultmeta-s0jxu1"]}>
                    {result.category}
                  </small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles["sitesearch-empty-5k78v4"]}>
          No matching pages yet.
        </p>
      )}
    </div>
  );
}
