import { verifyPassword } from "better-auth/crypto";

const maximumAdminPasswordLength = 128;

export async function verifyAdminPasswordHash(
  password: string,
  hash: string,
): Promise<boolean> {
  if (!password || password.length > maximumAdminPasswordLength) {
    return false;
  }

  try {
    return await verifyPassword({ hash, password });
  } catch {
    return false;
  }
}
