import { PublicShell } from "@/components/site/public-shell";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PublicShell>{children}</PublicShell>;
}
