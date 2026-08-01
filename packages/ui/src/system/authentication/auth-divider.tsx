import styles from "./auth-divider.module.css";

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div
      aria-hidden="true"
      className={styles["authdivider-root-vaugpe"]}
      data-component-status="styled"
      data-slot="auth-divider"
    >
      <span className={styles["authdivider-label-25lhmn"]}>{label}</span>
    </div>
  );
}
