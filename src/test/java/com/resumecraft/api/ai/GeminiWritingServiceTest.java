package com.resumecraft.api.ai;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GeminiWritingServiceTest {

    @Test
    void sendsOnlyRequestedTextAndParsesTheProviderSuggestion() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicReference<String> requestBody = new AtomicReference<>();
        AtomicReference<String> apiKey = new AtomicReference<>();
        AtomicReference<String> requestPath = new AtomicReference<>();
        server.createContext("/", exchange -> {
            requestPath.set(exchange.getRequestURI().getPath());
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            apiKey.set(exchange.getRequestHeaders().getFirst("x-goog-api-key"));
            byte[] response = """
                    {"candidates":[{"content":{"parts":[{"text":"A clearer summary."}]}}]}
                    """.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();

        try {
            String baseUrl = "http://127.0.0.1:" + server.getAddress().getPort() + "/v1beta/";
            GeminiWritingService service = new GeminiWritingService("test-key", "test-model", baseUrl);
            String suggestion = service.rewrite(
                    new AiController.RewriteRequest("SUMMARY", "Designed mobile workflows.", "Product Designer"));

            assertEquals("A clearer summary.", suggestion);
            assertEquals("/v1beta/models/test-model:generateContent", requestPath.get());
            assertEquals("test-key", apiKey.get());
            assertTrue(requestBody.get().contains("Designed mobile workflows."));
            assertTrue(requestBody.get().contains("Product Designer"));
            assertTrue(!requestBody.get().contains("Private Name"));
        } finally {
            server.stop(0);
        }
    }
}
