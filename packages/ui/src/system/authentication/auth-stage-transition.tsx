"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import styles from "./auth-stage-transition.module.css";

type TransitionPhase = "entering" | "idle" | "leaving";

export type AuthStageTransitionProps<Stage extends string> = Readonly<{
  children: (displayedStage: Stage) => ReactNode;
  stage: Stage;
}>;

export function AuthStageTransition<Stage extends string>({
  children,
  stage,
}: AuthStageTransitionProps<Stage>) {
  const [displayedStage, setDisplayedStage] = useState(stage);
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (stage === displayedStage) {
      return;
    }

    transitionTimer.current = setTimeout(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setDisplayedStage(stage);
        setPhase("idle");
        return;
      }

      setPhase("leaving");
      transitionTimer.current = setTimeout(() => {
        setDisplayedStage(stage);
        setPhase("entering");
      }, 140);
    }, 0);

    return () => {
      if (transitionTimer.current) {
        clearTimeout(transitionTimer.current);
      }
    };
  }, [displayedStage, stage]);

  useEffect(() => {
    if (phase !== "entering") {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      setPhase("idle");
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [phase]);

  return (
    <div
      className={styles["authtransition-root-0puzm7"]}
      data-component-status="styled"
      data-displayed-stage={displayedStage}
      data-slot="auth-stage-transition"
      data-transition-phase={phase}
    >
      {children(displayedStage)}
    </div>
  );
}
