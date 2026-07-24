import type { AnchorHTMLAttributes } from "react";

export type SiteLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export function SiteLink(props: SiteLinkProps) {
  return <a {...props} />;
}
