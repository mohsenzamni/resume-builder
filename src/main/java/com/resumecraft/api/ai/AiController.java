package com.resumecraft.api.ai;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/ai")
public class AiController {

    private static final int MAX_TEXT_LENGTH = 3000;
    private static final int MAX_ROLE_LENGTH = 120;

    private final OpenAiCompatibleWritingService writingService;
    private final AiRequestLimiter requestLimiter;

    public AiController(OpenAiCompatibleWritingService writingService, AiRequestLimiter requestLimiter) {
        this.writingService = writingService;
        this.requestLimiter = requestLimiter;
    }

    @GetMapping("/status")
    public AiStatus status() {
        return new AiStatus(writingService.isAvailable());
    }

    @PostMapping("/rewrite")
    public RewriteResponse rewrite(@RequestBody RewriteRequest request) {
        if (request == null || request.text() == null || request.text().isBlank()
                || request.text().length() > MAX_TEXT_LENGTH
                || request.role() != null && request.role().length() > MAX_ROLE_LENGTH
                || !("SUMMARY".equals(request.kind()) || "EXPERIENCE".equals(request.kind()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid rewrite request");
        }

        if (writingService.isAvailable() && !requestLimiter.allowRequest()) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "AI request limit reached");
        }
        return new RewriteResponse(writingService.rewrite(request));
    }

    public record AiStatus(boolean available) {
    }

    public record RewriteRequest(String kind, String text, String role) {
    }

    public record RewriteResponse(String suggestion) {
    }
}
