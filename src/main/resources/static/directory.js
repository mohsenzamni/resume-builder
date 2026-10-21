import { jobRoles } from "./job-roles.js";

const searchInput = document.querySelector("#role-search");
const categorySelect = document.querySelector("#role-category");
const results = document.querySelector("#role-results");
const resultCount = document.querySelector("#role-result-count");

function createRoleCard(role) {
  const article = document.createElement("article");
  article.className = "role-card";

  const category = document.createElement("p");
  category.className = "role-category";
  category.textContent = role.category;

  const title = document.createElement("h2");
  title.textContent = role.title;

  const overview = document.createElement("p");
  overview.className = "role-overview";
  overview.textContent = role.overview;

  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Resume focus and example skills";
  details.append(summary);

  const focusHeading = document.createElement("h3");
  focusHeading.textContent = "Questions to help describe your experience";
  details.append(focusHeading);
  const focusList = document.createElement("ul");
  role.focus.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    focusList.append(listItem);
  });
  details.append(focusList);

  const keywordsHeading = document.createElement("h3");
  keywordsHeading.textContent = "Example skills and terms";
  details.append(keywordsHeading);
  const keywords = document.createElement("p");
  keywords.textContent = role.keywords.join(" · ");
  details.append(keywords);

  const link = document.createElement("a");
  link.className = "button button-primary role-link";
  link.href = `./?role=${encodeURIComponent(role.slug)}`;
  link.textContent = "Build for this role";

  article.append(category, title, overview, details, link);
  return article;
}

function renderDirectory() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const category = categorySelect.value;
  const filteredRoles = jobRoles.filter((role) => {
    const matchesCategory = !category || role.category === category;
    const searchableText = [
      role.title,
      role.category,
      role.overview,
      ...role.focus,
      ...role.keywords,
    ].join(" ").toLocaleLowerCase();
    return matchesCategory && searchableText.includes(query);
  });

  results.replaceChildren(...filteredRoles.map(createRoleCard));
  resultCount.textContent = `${filteredRoles.length} of ${jobRoles.length} role guides`;
}

const categories = [...new Set(jobRoles.map((role) => role.category))].sort();
categories.forEach((category) => {
  const option = document.createElement("option");
  option.value = category;
  option.textContent = category;
  categorySelect.append(option);
});

searchInput.addEventListener("input", renderDirectory);
categorySelect.addEventListener("change", renderDirectory);
renderDirectory();
