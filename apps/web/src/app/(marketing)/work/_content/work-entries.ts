export type WorkEntry = {
  slug: string;
  client: string;
  title: string;
  year: string;
  summary: string;
  lead: string;
  challenge: string;
  approach: string;
  services: string[];
};

export const workEntries: WorkEntry[] = [
  {
    slug: "lattice-living",
    client: "Lattice Living",
    title: "Editorial portfolio for a modern interior brand",
    year: "2026",
    summary:
      "A concept direction for presenting interior projects with more atmosphere, stronger sequencing, and clearer conversion points.",
    lead:
      "This project direction explores how Shapewebs can frame premium visual work without losing clarity around services and contact.",
    challenge:
      "The brand needed a website that felt editorial and refined while still guiding visitors toward a practical next step.",
    approach:
      "The concept balances spacious typography, tightly edited messaging, and a project-first content rhythm so the brand feels premium without becoming vague.",
    services: ["Creative direction", "Portfolio UX", "Copy structure"],
  },
  {
    slug: "northline-studio",
    client: "Northline Studio",
    title: "Case-study focused site for a design-forward consultant",
    year: "2026",
    summary:
      "A consulting site concept that uses project stories, service framing, and contact touchpoints to convert attention into inquiries.",
    lead:
      "This entry shows how Shapewebs can turn a solo studio website into a more persuasive portfolio and inquiry engine.",
    challenge:
      "The consultant had strong work but needed a clearer narrative around outcomes, process, and the type of clients they wanted to attract.",
    approach:
      "The structure prioritizes compact case studies, directional messaging, and repeated invitation points so the site can sell confidence without overselling.",
    services: ["Information architecture", "Case study system", "Lead capture"],
  },
];

export function getWorkEntryBySlug(slug: string) {
  return workEntries.find((entry) => entry.slug === slug);
}
