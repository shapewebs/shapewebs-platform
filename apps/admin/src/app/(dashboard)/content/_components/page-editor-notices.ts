export const pageEditorNotices: Record<string, string> = {
  conflict:
    "This page changed after you opened it. Your submission was not applied; review the latest version and try again.",
  content: "The structured content does not match the supported block schema.",
  duplicate: "This exact save command was already completed.",
  json: "The content JSON is not valid JSON.",
  saved: "Draft saved.",
  published: "Page published and revalidation requested.",
  "published-revalidation-pending":
    "Page published. Public cache revalidation could not be confirmed and needs an operational retry.",
  "in-review": "Page submitted for review.",
  setup: "The Neon content repository is unavailable.",
  slug_conflict:
    "That slug is already used by another page in this locale. Choose a unique slug.",
  validation: "One or more editor fields are invalid.",
};
