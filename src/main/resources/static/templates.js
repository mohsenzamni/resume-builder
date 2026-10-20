export const templates = [
  {
    id: "classic",
    name: "Classic",
    description: "A familiar, balanced layout for a wide range of roles.",
    categories: ["Professional", "Entry-Level", "Academic"],
    tags: ["traditional", "single column", "clear sections"],
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
    tags: ["ats-friendly", "simple", "single column"],
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

export const templateCategories = [
  "Professional",
  "Modern",
  "Minimal",
  "Creative",
  "Executive",
  "Academic",
  "Entry-Level",
];

export const TEMPLATES = templates.map(({ id }) => id);
