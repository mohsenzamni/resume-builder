# ResumeCraft

A lightweight, English-language, left-to-right resume builder backed by a Spring Boot application. Edit your details with a live preview, save a draft locally in your browser, and use your browser's print dialog to save a PDF.

The editor includes optional experience, education, projects, certifications, languages, and skills sections; each repeatable section supports editing, removal, reordering, live preview, and local draft saving. Choose from five original layouts—Classic, Modern, Minimal, Executive, and Compact—and print on US Letter or A4 paper. An on-device quality checklist offers general reminders without scoring a resume or making hiring predictions.

The role directory currently contains 12 original, curated role guides with searchable prompts and example skills. They are starting points—not job-market research or requirements. You can export a local JSON backup or import a ResumeCraft JSON export.

Browse the template gallery at `/templates.html` to search, filter by design category, compare previews, and apply a template. Gallery previews use the current browser draft, or clearly labeled sample content when the draft is empty. Template metadata is registered in `src/main/resources/static/templates.js`; add an entry there and matching `data-template` styles in `styles.css`. The gallery and editor share the renderer in `resume-preview.js`, and PDF output continues to use browser print.

## Run locally

Requirements: Java 17+ and Maven.

Run `mvn spring-boot:run` (or `npm start`) from the project directory, then open [http://localhost:8080](http://localhost:8080). The versioned health endpoint is available at [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health).

## Architecture

- `src/main/java/com/resumecraft`: Spring Boot application and versioned API.
- `src/main/resources/static`: browser-based editor and resume preview, served from the same origin.
- `src/test/java`: backend API tests.
- The browser remains the source of truth for resume drafts; the application does not persist or sync resume contents on the server. Only text explicitly selected for an AI request, plus the professional title for context, is sent to the configured provider after confirmation.
- Add domain, application, and persistence layers when a validated feature—such as opt-in cloud sync—needs them. Keep resume-data handling explicit and access-controlled before introducing server-side storage.
- Resume drafts remain local. JSON export/import supports backups without introducing accounts or cloud storage.
- Optional AI writing assistance uses an OpenAI-compatible chat-completions API, including OpenAI's API and LiteLLM. It sends only the selected summary or experience description and the professional title after the user confirms. Suggestions are never applied automatically; users must review them for accuracy.
- AI is disabled unless `AI_API_KEY` is configured on the server. The key is never sent to the browser. Configure `AI_BASE_URL` and `AI_MODEL` for your provider or LiteLLM deployment. The current in-memory request limit is per application process; production deployments should also configure provider quotas and edge-level rate limiting.
- Defer accounts, cloud sync, and payments until those product requirements are validated. Role guidance and AI assistance remain product hypotheses until tested with users.

Drafts, including the selected template, are saved in the current browser's local storage; clearing browser data removes them. Select **Download PDF**, choose US Letter or A4, and choose **Save as PDF** in the print dialog. Long entries flow across pages while individual resume entries are kept together when possible.

## Test

Run `mvn test` for backend tests and `npm test` for draft normalization, editor, import/export, AI interaction, and role-directory tests.

### Optional AI setup

Set `AI_API_KEY` in the server environment to enable AI writing suggestions. The default endpoint is OpenAI's API (`https://api.openai.com/v1/`) with the `gpt-4o-mini` model. `AI_BASE_URL` and `AI_MODEL` can be configured for any compatible provider.

For a LiteLLM proxy, point `AI_BASE_URL` at its OpenAI-compatible `/v1/` endpoint, set `AI_API_KEY` to the key accepted by that proxy, and set `AI_MODEL` to a configured model or deployment alias. Use HTTPS for hosted endpoints; a local development proxy can use its local HTTP URL. A ChatGPT subscription does not include OpenAI API access; API usage requires a separately configured API key and may be billed separately.

Without a key, the editor and role directory continue to work with AI controls disabled. When a user chooses an AI action, the selected text and professional title are sent to the configured provider; other resume fields are not included. The user must confirm each request and review the returned suggestion before applying it.