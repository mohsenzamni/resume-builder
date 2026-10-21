package com.resumecraft.api.ai;

import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiRequestLimiterTest {

    @Test
    void capsRequestsPerMinuteAndResetsForTheNextWindow() {
        AtomicLong clock = new AtomicLong(120_000);
        AiRequestLimiter limiter = new AiRequestLimiter(clock::get);

        for (int request = 0; request < 10; request++) {
            assertTrue(limiter.allowRequest());
        }
        assertFalse(limiter.allowRequest());

        clock.addAndGet(60_000);
        assertTrue(limiter.allowRequest());
    }
}
