"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Button } from "../buttons/button";
import { ButtonLink } from "../buttons/button-link";
import { mergeClassNames } from "../_internal/merge-class-names";
import { Link } from "./link";
import styles from "./submenu-navigation.module.css";

export type SubmenuNavigationLink = Readonly<{
  description?: string;
  href: string;
  label: string;
}>;

export type SubmenuNavigationSection = Readonly<{
  label: string;
  links: readonly SubmenuNavigationLink[];
}>;

export type SubmenuNavigationFooter = Readonly<{
  description?: string;
  label: string;
  links: readonly SubmenuNavigationLink[];
  status?: "available";
}>;

export type SubmenuNavigationItem =
  | Readonly<{
      href: string;
      kind: "link";
      label: string;
      presentation?: "action" | "default";
    }>
  | Readonly<{
      id: string;
      kind: "separator";
    }>
  | Readonly<{
      id: string;
      kind: "slot";
    }>
  | Readonly<{
      footer?: SubmenuNavigationFooter;
      id: string;
      kind: "submenu";
      label: string;
      panelSize?: "medium" | "wide";
      sections: readonly SubmenuNavigationSection[];
    }>;

export type SubmenuNavigationProps = Readonly<{
  ariaLabel: string;
  className?: string;
  items: readonly SubmenuNavigationItem[];
  mobileMenuLabel?: string;
  slots?: Readonly<Record<string, ReactNode>>;
}>;

type SubmenuItem = Extract<SubmenuNavigationItem, { kind: "submenu" }>;
type TransitionDirection = "backward" | "forward" | "idle";

const closeDelay = 150;
const morphDuration = 240;
const transitionDuration = 210;

function ChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path
        d="m4.5 6.25 3.5 3.5 3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.35"
      />
    </svg>
  );
}

function MenuIcon({ open }: Readonly<{ open: boolean }>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path
        d={open ? "M4 4 12 12M12 4 4 12" : "M3 5h10M3 11h10"}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.35"
      />
    </svg>
  );
}

function getMenuIndex(items: readonly SubmenuItem[], id: string) {
  return items.findIndex((item) => item.id === id);
}

export function SubmenuNavigation({
  ariaLabel,
  className,
  items,
  mobileMenuLabel = "Menu",
  slots,
}: SubmenuNavigationProps) {
  const componentId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const activePanelRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverOpenMenuRef = useRef<string | null>(null);
  const morphTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [direction, setDirection] = useState<TransitionDirection>("idle");
  const [mobileMenuId, setMobileMenuId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [morphing, setMorphing] = useState(false);
  const [previousMenuId, setPreviousMenuId] = useState<string | null>(null);
  const [transitionRevision, setTransitionRevision] = useState(0);

  const submenuItems = items.filter(
    (item): item is SubmenuItem => item.kind === "submenu",
  );
  const activeMenu = submenuItems.find((item) => item.id === activeMenuId);
  const previousMenu = submenuItems.find((item) => item.id === previousMenuId);
  const mobilePanelId = `${componentId}-mobile-panel`;
  const mobileTriggerId = `${componentId}-mobile-trigger`;

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const clearPreviousTimer = useCallback(() => {
    if (previousTimerRef.current !== null) {
      clearTimeout(previousTimerRef.current);
      previousTimerRef.current = null;
    }
  }, []);

  const clearMorphTimer = useCallback(() => {
    if (morphTimerRef.current !== null) {
      clearTimeout(morphTimerRef.current);
      morphTimerRef.current = null;
    }
  }, []);

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current !== null) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const closeDesktopMenu = useCallback(() => {
    clearCloseTimer();
    clearMorphTimer();
    clearPreviousTimer();
    clearResetTimer();
    hoverOpenMenuRef.current = null;
    setDesktopOpen(false);
    setMorphing(false);
    setPreviousMenuId(null);
    setDirection("idle");
    resetTimerRef.current = setTimeout(() => {
      setActiveMenuId(null);
      shellRef.current?.style.removeProperty("--submenu-width");
      shellRef.current?.style.removeProperty("--submenu-height");
      resetTimerRef.current = null;
    }, transitionDuration);
  }, [clearCloseTimer, clearMorphTimer, clearPreviousTimer, clearResetTimer]);

  function scheduleDesktopClose() {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      closeDesktopMenu();
    }, closeDelay);
  }

  function openDesktopMenu(nextMenuId: string) {
    clearCloseTimer();
    clearMorphTimer();
    clearResetTimer();

    if (desktopOpen && activeMenuId === nextMenuId) {
      return;
    }

    clearPreviousTimer();

    if (desktopOpen && activeMenuId && activeMenuId !== nextMenuId) {
      const currentIndex = getMenuIndex(submenuItems, activeMenuId);
      const nextIndex = getMenuIndex(submenuItems, nextMenuId);

      setDirection(nextIndex < currentIndex ? "backward" : "forward");
      setMorphing(true);
      setPreviousMenuId(activeMenuId);
      morphTimerRef.current = setTimeout(() => {
        setMorphing(false);
        morphTimerRef.current = null;
      }, morphDuration);
      previousTimerRef.current = setTimeout(() => {
        setPreviousMenuId(null);
        previousTimerRef.current = null;
      }, transitionDuration);
    } else {
      setDirection("idle");
      setMorphing(false);
      setPreviousMenuId(null);
    }

    setActiveMenuId(nextMenuId);
    setDesktopOpen(true);
    setTransitionRevision((revision) => revision + 1);
  }

  function closeAllNavigation() {
    closeDesktopMenu();
    setMobileMenuId(null);
    setMobileOpen(false);
  }

  function handleRootKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") {
      return;
    }

    if (mobileOpen) {
      event.preventDefault();
      setMobileMenuId(null);
      setMobileOpen(false);
      document.getElementById(mobileTriggerId)?.focus();
      return;
    }

    if (desktopOpen && activeMenuId) {
      event.preventDefault();
      closeDesktopMenu();
      document
        .getElementById(`${componentId}-${activeMenuId}-trigger`)
        ?.focus();
    }
  }

  function renderPanel(menu: SubmenuItem, layer: "active" | "previous") {
    const panelId = `${componentId}-${menu.id}-panel`;
    const triggerId = `${componentId}-${menu.id}-trigger`;

    return (
      <div
        aria-hidden={layer === "previous" || !desktopOpen}
        aria-labelledby={triggerId}
        className={mergeClassNames(
          styles["subnav-panel-b8u5ap"],
          menu.panelSize === "medium"
            ? styles["subnav-medium-1di2oa"]
            : styles["subnav-wide-fgq9ut"],
        )}
        data-direction={direction}
        data-layer={layer}
        id={layer === "active" ? panelId : undefined}
        inert={layer === "previous" || !desktopOpen}
        key={`${menu.id}-${layer}-${transitionRevision}`}
        ref={
          layer === "active"
            ? (node) => {
                activePanelRef.current = node;
              }
            : undefined
        }
        role="region"
      >
        <div className={styles["subnav-grid-7ylxur"]}>
          {menu.sections.map((section) => (
            <section
              className={styles["subnav-section-5v8z01"]}
              key={section.label}
            >
              <h2 className={styles["subnav-eyebrow-gpri9o"]}>
                {section.label}
              </h2>
              <ul className={styles["subnav-links-be3x9z"]} role="list">
                {section.links.map((link) => (
                  <li className={styles["subnav-entry-f9frco"]} key={link.href}>
                    <Link
                      className={styles["subnav-panellink-avtix2"]}
                      href={link.href}
                      onClick={closeAllNavigation}
                      underline="none"
                    >
                      <span className={styles["subnav-title-v5k1e3"]}>
                        {link.label}
                      </span>
                      {link.description ? (
                        <span className={styles["subnav-desc-fbc670"]}>
                          {link.description}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        {menu.footer ? (
          <div className={styles["subnav-rail-7y02z9"]}>
            <div className={styles["subnav-note-muh96z"]}>
              {menu.footer.status === "available" ? (
                <span
                  aria-hidden="true"
                  className={styles["subnav-signal-5ukerm"]}
                />
              ) : null}
              <span>
                <strong>{menu.footer.label}</strong>
                {menu.footer.description ? (
                  <small>{menu.footer.description}</small>
                ) : null}
              </span>
            </div>
            <ul className={styles["subnav-raillinks-eic6ku"]} role="list">
              {menu.footer.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={closeAllNavigation}
                    underline="none"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  useEffect(() => {
    return () => {
      clearCloseTimer();
      clearMorphTimer();
      clearPreviousTimer();
      clearResetTimer();
    };
  }, [clearCloseTimer, clearMorphTimer, clearPreviousTimer, clearResetTimer]);

  useEffect(() => {
    if (!desktopOpen && !mobileOpen) {
      return;
    }

    function handleOutsidePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        closeDesktopMenu();
        setMobileMenuId(null);
        setMobileOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
    };
  }, [closeDesktopMenu, desktopOpen, mobileOpen]);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const panel = activePanelRef.current;

    if (!shell || !panel || !activeMenu) {
      return;
    }

    const activePanel = panel;
    const submenuShell = shell;

    function updateShellSize() {
      const panelWidth = activePanel.offsetWidth;
      const panelHeight = activePanel.offsetHeight;

      if (panelWidth === 0 || panelHeight === 0) {
        return;
      }

      submenuShell.style.setProperty("--submenu-width", `${panelWidth}px`);
      submenuShell.style.setProperty("--submenu-height", `${panelHeight}px`);
    }

    updateShellSize();
    const observer = new ResizeObserver(updateShellSize);
    observer.observe(activePanel);

    return () => {
      observer.disconnect();
    };
  }, [activeMenu, transitionRevision]);

  return (
    <div
      className={mergeClassNames(styles["subnav-root-m3b0xd"], className)}
      data-component-status="styled"
      onKeyDown={handleRootKeyDown}
      ref={rootRef}
    >
      <nav
        aria-label={ariaLabel}
        className={styles["subnav-desktop-2i8lup"]}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            scheduleDesktopClose();
          }
        }}
        onPointerEnter={clearCloseTimer}
        onPointerLeave={scheduleDesktopClose}
      >
        <ul className={styles["subnav-list-aumjvs"]} role="list">
          {items.map((item) => {
            if (item.kind === "separator") {
              return (
                <li
                  aria-hidden="true"
                  className={styles["subnav-divider-azz7wp"]}
                  key={item.id}
                />
              );
            }

            if (item.kind === "slot") {
              const slot = slots?.[item.id];

              return slot ? (
                <li
                  className={styles["subnav-slot-dgzmv0"]}
                  key={item.id}
                  onFocus={closeDesktopMenu}
                  onPointerEnter={scheduleDesktopClose}
                >
                  {slot}
                </li>
              ) : null;
            }

            if (item.kind === "submenu") {
              const expanded = desktopOpen && activeMenuId === item.id;
              const panelId = `${componentId}-${item.id}-panel`;
              const triggerId = `${componentId}-${item.id}-trigger`;

              return (
                <li className={styles["subnav-item-slartv"]} key={item.id}>
                  <button
                    aria-controls={panelId}
                    aria-expanded={expanded}
                    className={styles["subnav-trigger-ombe5n"]}
                    data-active={expanded ? "true" : "false"}
                    id={triggerId}
                    onClick={() => {
                      if (expanded && hoverOpenMenuRef.current === item.id) {
                        hoverOpenMenuRef.current = null;
                        return;
                      }

                      hoverOpenMenuRef.current = null;
                      if (expanded) {
                        closeDesktopMenu();
                      } else {
                        openDesktopMenu(item.id);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        openDesktopMenu(item.id);
                        requestAnimationFrame(() => {
                          document
                            .getElementById(panelId)
                            ?.querySelector<HTMLAnchorElement>("a")
                            ?.focus();
                        });
                      }
                    }}
                    onPointerEnter={(event) => {
                      if (event.pointerType === "mouse") {
                        hoverOpenMenuRef.current = item.id;
                        openDesktopMenu(item.id);
                      }
                    }}
                    type="button"
                  >
                    <span>{item.label}</span>
                    <span className={styles["subnav-chevron-ipkrp2"]}>
                      <ChevronIcon />
                    </span>
                  </button>
                </li>
              );
            }

            return (
              <li
                className={mergeClassNames(
                  styles["subnav-item-slartv"],
                  item.presentation === "action"
                    ? styles["subnav-actionitem-xqfutp"]
                    : undefined,
                )}
                key={item.href}
                onFocus={closeDesktopMenu}
                onPointerEnter={scheduleDesktopClose}
              >
                {item.presentation === "action" ? (
                  <ButtonLink
                    data-navigation-action=""
                    href={item.href}
                    kind="primary"
                    onClick={closeAllNavigation}
                    size="small"
                  >
                    {item.label}
                  </ButtonLink>
                ) : (
                  <Link
                    className={styles["subnav-direct-zhpxuy"]}
                    href={item.href}
                    onClick={closeAllNavigation}
                    underline="none"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        <div className={styles["subnav-stage-8f32k4"]}>
          <div
            aria-hidden={!desktopOpen}
            className={styles["subnav-shell-mmkpq7"]}
            data-active-menu={activeMenuId ?? undefined}
            data-morphing={morphing ? "true" : "false"}
            data-state={desktopOpen ? "open" : "closed"}
            data-submenu-surface=""
            inert={!desktopOpen}
            ref={shellRef}
          >
            {previousMenu ? renderPanel(previousMenu, "previous") : null}
            {activeMenu ? renderPanel(activeMenu, "active") : null}
          </div>
        </div>
      </nav>

      <div className={styles["subnav-mobile-7ksb9f"]}>
        <Button
          aria-controls={mobilePanelId}
          aria-expanded={mobileOpen}
          className={styles["subnav-toggle-vh8hvw"]}
          id={mobileTriggerId}
          kind="ghost"
          onClick={() => {
            setMobileMenuId(null);
            setMobileOpen((open) => !open);
          }}
          size="small"
          trailingIcon={
            <span className={styles["subnav-menuicon-ou7o47"]}>
              <MenuIcon open={mobileOpen} />
            </span>
          }
        >
          {mobileMenuLabel}
        </Button>
        <div
          aria-hidden={!mobileOpen}
          className={styles["subnav-drawer-u0d8ch"]}
          data-mobile-navigation=""
          data-state={mobileOpen ? "open" : "closed"}
          id={mobilePanelId}
          inert={!mobileOpen}
        >
          <nav aria-label={`${ariaLabel} mobile`}>
            <ul className={styles["subnav-mobilelist-ek9roz"]} role="list">
              {items.map((item) => {
                if (item.kind === "separator") {
                  return (
                    <li
                      aria-hidden="true"
                      className={styles["subnav-mobiledivider-brs5q7"]}
                      key={item.id}
                    />
                  );
                }

                if (item.kind === "slot") {
                  const slot = slots?.[item.id];

                  return slot ? (
                    <li
                      className={styles["subnav-mobileitem-4mrier"]}
                      key={item.id}
                      onClick={(event) => {
                        if (
                          event.target instanceof Element &&
                          event.target.closest("a")
                        ) {
                          closeAllNavigation();
                        }
                      }}
                    >
                      {slot}
                    </li>
                  ) : null;
                }

                if (item.kind === "link") {
                  return (
                    <li
                      className={styles["subnav-mobileitem-4mrier"]}
                      key={item.href}
                    >
                      {item.presentation === "action" ? (
                        <ButtonLink
                          className={styles["subnav-mobileaction-o927ep"]}
                          data-navigation-action=""
                          href={item.href}
                          kind="primary"
                          onClick={closeAllNavigation}
                          size="small"
                        >
                          {item.label}
                        </ButtonLink>
                      ) : (
                        <Link
                          className={styles["subnav-mobilelink-41y11b"]}
                          href={item.href}
                          onClick={closeAllNavigation}
                          underline="none"
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  );
                }

                const expanded = mobileMenuId === item.id;
                const disclosureId = `${componentId}-${item.id}-mobile`;

                return (
                  <li
                    className={styles["subnav-mobileitem-4mrier"]}
                    key={item.id}
                  >
                    <Button
                      aria-controls={disclosureId}
                      aria-expanded={expanded}
                      className={styles["subnav-mobiletrigger-w0uib0"]}
                      kind="ghost"
                      onClick={() => setMobileMenuId(expanded ? null : item.id)}
                      size="small"
                      trailingIcon={
                        <span className={styles["subnav-chevron-ipkrp2"]}>
                          <ChevronIcon />
                        </span>
                      }
                    >
                      {item.label}
                    </Button>
                    <div
                      aria-hidden={!expanded}
                      className={styles["subnav-mobilecontent-tm314e"]}
                      data-state={expanded ? "open" : "closed"}
                      id={disclosureId}
                      inert={!expanded}
                    >
                      <div className={styles["subnav-mobileinner-7ici2c"]}>
                        {item.sections.map((section) => (
                          <section key={section.label}>
                            <h2 className={styles["subnav-mobilehead-9kgoua"]}>
                              {section.label}
                            </h2>
                            <ul
                              className={styles["subnav-mobilelinks-xfuwkx"]}
                              role="list"
                            >
                              {section.links.map((link) => (
                                <li key={link.href}>
                                  <Link
                                    href={link.href}
                                    onClick={closeAllNavigation}
                                    underline="none"
                                  >
                                    {link.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </section>
                        ))}
                        {item.footer ? (
                          <ul
                            className={styles["subnav-mobilelinks-xfuwkx"]}
                            role="list"
                          >
                            {item.footer.links.map((link) => (
                              <li key={link.href}>
                                <Link
                                  href={link.href}
                                  onClick={closeAllNavigation}
                                  underline="none"
                                >
                                  {link.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
