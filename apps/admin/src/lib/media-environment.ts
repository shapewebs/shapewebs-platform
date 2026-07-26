const organizationIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const storeIdPattern = /^[^\s\u0000-\u001f\u007f]{8,128}$/u;

export type MediaEnvironment = {
  databaseUrl: string;
  organizationId: string;
  privateStoreId: string;
};

export function getMediaEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): MediaEnvironment | null {
  const databaseUrl = environment.DATABASE_URL;
  const organizationId = environment.SHAPEWEBS_ORGANIZATION_ID;
  const privateStoreId = environment.MEDIA_PRIVATE_BLOB_STORE_ID;

  if (
    !databaseUrl ||
    !organizationId ||
    !organizationIdPattern.test(organizationId) ||
    !privateStoreId ||
    !storeIdPattern.test(privateStoreId)
  ) {
    return null;
  }

  return {
    databaseUrl,
    organizationId,
    privateStoreId,
  };
}
