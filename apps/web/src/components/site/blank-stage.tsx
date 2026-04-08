import styles from "./blank-stage.module.css";

type BlankStageProps = {
  isLoading?: boolean;
  routeLabel: string;
};

export function BlankStage({
  isLoading = false,
  routeLabel,
}: BlankStageProps) {
  return (
    <section className={styles.pageContainerX9f4j} aria-busy={isLoading || undefined}>
      <div aria-label={routeLabel} className={styles.pageContentL7p2q}>
        <h1 className={styles.srOnlyA6v2n9}>{routeLabel}</h1>
      </div>
    </section>
  );
}
