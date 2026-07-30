import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes } from "react";

export type SiteLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    href: string;
  };

export function SiteLink(props: SiteLinkProps) {
  return <Link prefetch={false} {...props} />;
}
