export const templates = [
  {
    id: "classic",
    name: "Classic",
    description: "Recommended starting point: a conventional, single-column layout with clear sections.",
    categories: ["Professional", "Entry-Level", "Academic", "ATS-Conscious"],
    tags: ["recommended", "traditional", "single column"],
    default: true,
    recommended: 1,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Contemporary typography with a restrained teal accent.",
    categories: ["Modern", "Professional", "Creative"],
    tags: ["contemporary", "serif", "visual hierarchy"],
    recommended: 2,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "A simple, low-distraction design with clean typography.",
    categories: ["Minimal", "Professional", "Entry-Level"],
    tags: ["ATS-conscious", "simple", "single column"],
    recommended: 3,
  },
  {
    id: "executive",
    name: "Executive",
    description: "A refined centered profile and formal section styling.",
    categories: ["Executive", "Professional"],
    tags: ["leadership", "formal", "serif"],
    recommended: 4,
  },
  {
    id: "compact",
    name: "Compact",
    description: "Tighter spacing for experienced candidates with more to share.",
    categories: ["Professional", "Executive"],
    tags: ["space efficient", "experienced", "dense"],
    recommended: 5,
  },
];

export const templateCategories = [...new Set(templates.flatMap(({ categories }) => categories))];

export const TEMPLATES = templates.map(({ id }) => id);
