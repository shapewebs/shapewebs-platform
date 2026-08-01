import { Spinner } from "../feedback/spinner";
import styles from "./auth-pending.module.css";

export function AuthPending({
  label = "Loading securely",
}: {
  label?: string;
}) {
  return (
    <div
      aria-live="polite"
      className={styles["authpending-root-glhdxg"]}
      data-component-status="styled"
      data-slot="auth-pending"
      role="status"
    >
      <Spinner announce={false} size="sm" />
      <span className={styles["authpending-label-yfwtv0"]}>{label}</span>
    </div>
  );
}
