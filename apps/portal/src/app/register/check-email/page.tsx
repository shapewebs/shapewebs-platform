import Link from "next/link";
import { connection } from "next/server";

import { AuthShell } from "@/components/auth-shell";
import styles from "@/components/auth-shell.module.css";

export default async function CheckCustomerEmailPage() {
  await connection();

  return (
    <AuthShell eyebrow="Email verification" title="Check your inbox">
      <p className={styles["sw-portal-copy-j6m3v8"]}>
        Your provisional account is safely stored, but it has no access yet.
        Open the single-use Shapewebs message and choose the final password to
        verify the mailbox and activate your assigned projects.
      </p>
      <Link className={styles["sw-portal-link-d7q4m2"]} href="/login">
        Return to sign in
      </Link>
    </AuthShell>
  );
}
