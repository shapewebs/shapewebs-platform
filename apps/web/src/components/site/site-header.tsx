"use client";

import { useEffect, useRef, useState } from "react";
import { Buttons, mergeClassNames } from "@shapewebs/ui";
import { SiteLink } from "@/components/navigation/site-link";
import { SiteLogo } from "./site-logo";
import { SiteNavLink } from "./site-nav-link";
import { SiteThemeToggle } from "./site-theme-toggle";
import {
  siteCallToAction,
  siteMenus,
  sitePrimaryLinks,
  type SiteMenu,
} from "./site-navigation-data";
import styles from "./site-header.module.css";

type SiteMenuKey = SiteMenu["key"];

export function SiteHeader() {
  const shellRef = useRef<HTMLElement | null>(null);
  const submenuViewportRef = useRef<HTMLDivElement | null>(null);
  const mobileViewportRef = useRef<HTMLDivElement | null>(null);
  const [activeMenu, setActiveMenu] = useState<SiteMenuKey | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedPanelHeight, setExpandedPanelHeight] = useState(0);

  const activeMenuData = siteMenus.find((menu) => menu.key === activeMenu);

  useEffect(() => {
    if (!activeMenu && !isMobileOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        shellRef.current &&
        !shellRef.current.contains(event.target as Node)
      ) {
        setActiveMenu(null);
        setIsMobileOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveMenu(null);
        setIsMobileOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMenu, isMobileOpen]);

  useEffect(() => {
    const target = isMobileOpen ? mobileViewportRef.current : submenuViewportRef.current;
    let frameId = 0;

    if (!target || (!isMobileOpen && !activeMenuData)) {
      frameId = window.requestAnimationFrame(() => {
        setExpandedPanelHeight(0);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    const updateHeight = () => {
      frameId = window.requestAnimationFrame(() => {
        setExpandedPanelHeight(target.scrollHeight);
      });
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });
    resizeObserver.observe(target);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [activeMenuData, isMobileOpen]);

  const handleNavigate = () => {
    setActiveMenu(null);
    setIsMobileOpen(false);
  };

  const handleMenuChange = (nextMenu: SiteMenuKey) => {
    setActiveMenu(nextMenu);
    setIsMobileOpen(false);
  };

  const toggleMenu = (menuKey: SiteMenuKey) => {
    if (activeMenu === menuKey) {
      setActiveMenu(null);
      return;
    }

    handleMenuChange(menuKey);
  };

  const headerIsExpanded = Boolean(activeMenu || isMobileOpen);

  return (
    <>
      <div aria-hidden="true" className={styles.fixedMaskW0cpa} />

      <header
        className={mergeClassNames(
          styles.containerK9p3s,
          headerIsExpanded ? styles.containerExpandedR4m2k7 : undefined,
          isMobileOpen ? styles.mobileOpenH5k8q : undefined,
        )}
        onMouseLeave={() => {
          setActiveMenu(null);
        }}
        ref={shellRef}
        style={{
          maxHeight: `calc(var(--sw-ui-header-height) + ${expandedPanelHeight}px)`,
        }}
      >
        <div className={styles.contentZ7j2q}>
          <SiteLink
            aria-label="Shapewebs home"
            className={styles.logoLinkB5m7s}
            href="/"
            onClick={handleNavigate}
            showPendingHint={false}
          >
            <SiteLogo className={styles.logoMarkP8k4r} />
          </SiteLink>

          <nav aria-label="Primary navigation" className={styles.navH7k2s}>
            <ul className={styles.navListZ9j4p}>
              {siteMenus.map((menu) => (
                <li className={styles.navItemQ5m3r} key={menu.key}>
                  <Buttons.Button
                    aria-controls={`site-menu-${menu.key}`}
                    aria-expanded={activeMenu === menu.key}
                    className={mergeClassNames(
                      styles.dropdownTriggerZ8p4r,
                      activeMenu === menu.key
                        ? styles.dropdownActiveL7k3q
                        : undefined,
                    )}
                    kind="ghost"
                    onClick={() => toggleMenu(menu.key)}
                    onMouseEnter={() => handleMenuChange(menu.key)}
                    size="small"
                  >
                    {menu.label}
                  </Buttons.Button>
                </li>
              ))}

              {sitePrimaryLinks.map((item) => (
                <li
                  className={mergeClassNames(
                    styles.navItemQ5m3r,
                    item.label === "Customers"
                      ? styles.navItemCustomersL5k8q
                      : undefined,
                    item.label === "Contact"
                      ? styles.navItemContactZ7j3s
                      : undefined,
                  )}
                  key={item.href}
                >
                  <SiteNavLink
                    variant="header"
                    href={item.href}
                    onClick={handleNavigate}
                  >
                    {item.label}
                  </SiteNavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.actionsL6j8s}>
            <SiteThemeToggle className={styles.themeToggleP4q8m2} />

            <Buttons.Button
              aria-label="Search"
              className={styles.searchButtonP5k8q}
              kind="ghost"
              size="small"
              title="Search"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="7"
                  cy="7"
                  fill="none"
                  r="4.5"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <path
                  d="M10.5 10.5L14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1"
                />
              </svg>
            </Buttons.Button>

            <SiteNavLink
              className={styles.getStartedButtonB9k6p}
              href={siteCallToAction.href}
              onClick={handleNavigate}
              variant="cta"
            >
              {siteCallToAction.label}
            </SiteNavLink>

            <Buttons.Button
              aria-controls="site-mobile-navigation"
              aria-expanded={isMobileOpen}
              aria-label="Toggle menu"
              className={mergeClassNames(
                styles.hamburgerQ7p3s,
                isMobileOpen ? styles.menuButtonOpenP4n7x3 : undefined,
              )}
              kind="ghost"
              onClick={() => {
                setIsMobileOpen((current) => !current);
                setActiveMenu(null);
              }}
              size="small"
            >
              <span className={styles.hamburgerContentQ7p3s}>
                <span className={styles.hamburgerLineZ9j4p} />
                <span className={styles.hamburgerLineZ9j4p} />
                <span className={styles.hamburgerLineZ9j4p} />
              </span>
            </Buttons.Button>
          </div>
        </div>

        <div
          className={mergeClassNames(
            styles.submenuContainerH8p4q,
            activeMenuData ? styles.submenuOpenP2n4s6 : styles.submenuClosedX7d2q4,
          )}
          id={activeMenuData ? `site-menu-${activeMenuData.key}` : undefined}
        >
          <div className={styles.submenuViewportQ2h7m4} ref={submenuViewportRef}>
            <div className={styles.submenuContentL7j3s}>
              {activeMenuData?.sections.map((section) => (
                <section className={styles.submenuSectionK8j4p} key={section.title}>
                  <h2 className={styles.submenuSectionTitleP3k7s}>
                    {section.title}
                  </h2>
                  <div className={styles.submenuSectionItemsL9m2q}>
                    {section.items.map((item) => (
                      <SiteNavLink
                        className={styles.submenuItemZ9k4r}
                        href={item.href}
                        key={item.href}
                        onClick={handleNavigate}
                        variant="submenu"
                      >
                        <span className={styles.submenuItemContentP8j3s}>
                          <span className={styles.submenuItemLabelL7k4r}>
                            {item.label}
                          </span>
                          {item.description ? (
                            <span className={styles.submenuItemDescriptionQ9m2p}>
                              {item.description}
                            </span>
                          ) : null}
                        </span>
                      </SiteNavLink>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>

        <div
          className={mergeClassNames(
            styles.mobileMenuL7j3s,
            isMobileOpen ? styles.mobileMenuOpenV9s3k2 : styles.mobileMenuClosedB6n1r8,
          )}
          id="site-mobile-navigation"
        >
          <div className={styles.mobileViewportM4d8q3} ref={mobileViewportRef}>
            <div className={styles.mobileMenuContentP5k8q}>
              <ul className={styles.mobileNavListB9k6p}>
                {sitePrimaryLinks.map((item) => (
                  <li className={styles.mobileNavItemZ7j3s} key={item.href}>
                    <SiteNavLink
                      className={styles.mobileNavLinkQ5m3r}
                      href={item.href}
                      onClick={handleNavigate}
                      variant="mobile"
                    >
                      {item.label}
                    </SiteNavLink>
                  </li>
                ))}
                <li className={styles.mobileNavItemZ7j3s}>
                  <SiteNavLink
                    className={styles.mobileNavLinkQ5m3r}
                    href={siteCallToAction.href}
                    onClick={handleNavigate}
                    variant="mobile"
                  >
                    {siteCallToAction.label}
                  </SiteNavLink>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
