package com.resumecraft.api.ai;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "resumecraft.ai.gemini.api-key=")
@AutoConfigureMockMvc
class AiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void reportsAiUnavailableWhenProviderKeyIsMissing() throws Exception {
        mockMvc.perform(get("/api/v1/ai/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false));
    }

    @Test
    void rejectsUnsupportedOrOversizedRewriteRequests() throws Exception {
        mockMvc.perform(post("/api/v1/ai/rewrite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"PERSONAL_INFO\",\"text\":\"Rewrite this\"}"))
                .andExpect(status().isBadRequest());

        String oversizedText = "x".repeat(3001);
        mockMvc.perform(post("/api/v1/ai/rewrite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"SUMMARY\",\"text\":\"" + oversizedText + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void doesNotCallProviderWhenAiIsNotConfigured() throws Exception {
        mockMvc.perform(post("/api/v1/ai/rewrite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"SUMMARY\",\"text\":\"Experienced designer\"}"))
                .andExpect(status().isServiceUnavailable());
    }
}
