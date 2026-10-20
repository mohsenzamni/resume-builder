# ResumeCraft

A lightweight, English-language, left-to-right resume builder backed by a Spring Boot application. Edit your details with a live preview, save a draft locally in your browser, and use your browser's print dialog to save a PDF.

## Run locally

Requirements: Java 17+ and Maven.

Run `mvn spring-boot:run` (or `npm start`) from the project directory, then open [http://localhost:8080](http://localhost:8080). The versioned health endpoint is available at [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health).

## Architecture

- `src/main/java/com/resumecraft`: Spring Boot application and versioned API.
- `src/main/resources/static`: browser-based editor and resume preview, served from the same origin.
- `src/test/java`: backend API tests.
- The browser remains the source of truth for resume drafts. Resume contents are not sent to the backend; no database, account, or cross-origin setup is needed for the initial experience.
- Add domain, application, and persistence layers when a validated feature—such as opt-in cloud sync—needs them. Keep resume-data handling explicit and access-controlled before introducing server-side storage.
- Defer authentication, AI-provider integration, and payments until those product requirements are validated.

Drafts are saved in the current browser's local storage; clearing browser data removes them. Select **Download PDF** and choose **Save as PDF** in the print dialog.

## Test

Run `mvn test` for backend tests and `npm test` for browser draft-normalization tests.