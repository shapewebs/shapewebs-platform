"use client";

import { ButtonControl } from "@shapewebs/ui/button-control";
import { lazy, Suspense, useEffect, useId, useRef, useState } from "react";

import styles from "./site-search.module.css";

const SiteSearchPanel = lazy(() => import("./site-search-panel"));

export function SiteSearch() {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [hasOpened, setHasOpened] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    function handleOutsidePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);

    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [searchOpen]);

  function toggleSearch() {
    if (!searchOpen) {
      setHasOpened(true);
    }

    setSearchOpen(!searchOpen);
  }

  return (
    <div
      className={styles["sitesearch-root-7hql4y"]}
      onKeyDown={(event) => {
        if (event.key === "Escape" && searchOpen) {
          event.preventDefault();
          setSearchOpen(false);
        }
      }}
      ref={rootRef}
    >
      <ButtonControl
        aria-controls={panelId}
        aria-expanded={searchOpen}
        aria-haspopup="dialog"
        className={styles["sitesearch-trigger-64yddp"]}
        kind="ghost"
        onClick={toggleSearch}
        size="small"
      >
        Search
      </ButtonControl>

      {hasOpened ? (
        <Suspense fallback={null}>
          <SiteSearchPanel
            onClose={() => setSearchOpen(false)}
            open={searchOpen}
            panelId={panelId}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
