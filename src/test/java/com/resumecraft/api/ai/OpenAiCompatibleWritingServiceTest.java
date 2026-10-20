package com.resumecraft.api.ai;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OpenAiCompatibleWritingServiceTest {

    @Test
    void sendsOnlyRequestedTextAndParsesTheProviderSuggestion() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicReference<String> requestBody = new AtomicReference<>();
        AtomicReference<String> authorization = new AtomicReference<>();
        AtomicReference<String> requestPath = new AtomicReference<>();
        server.createContext("/", exchange -> {
            requestPath.set(exchange.getRequestURI().getPath());
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            byte[] response = """
                    {"choices":[{"message":{"content":"A clearer summary."}}]}
                    """.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();

        try {
            String baseUrl = "http://127.0.0.1:" + server.getAddress().getPort() + "/v1beta/";
            OpenAiCompatibleWritingService service =
                    new OpenAiCompatibleWritingService("test-key", URI.create(baseUrl), "test-model");
            String suggestion = service.rewrite(
                    new AiController.RewriteRequest("SUMMARY", "Designed mobile workflows.", "Product Designer"));

            assertEquals("A clearer summary.", suggestion);
            assertEquals("/v1beta/chat/completions", requestPath.get());
            assertTrue(authorization.get().startsWith("Bearer "));
            assertTrue(requestBody.get().contains("Designed mobile workflows."));
            assertTrue(requestBody.get().contains("Product Designer"));
            assertTrue(requestBody.get().contains("test-model"));
            assertTrue(!requestBody.get().contains("Private Name"));
        } finally {
            server.stop(0);
        }
    }
}
