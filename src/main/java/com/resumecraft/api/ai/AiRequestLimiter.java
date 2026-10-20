package com.resumecraft.api.ai;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.function.LongSupplier;

@Component
public class AiRequestLimiter {

    private static final int MAX_REQUESTS_PER_MINUTE = 10;

    private final LongSupplier clock;
    private long currentWindow = Long.MIN_VALUE;
    private int requestsInWindow;

    @Autowired
    public AiRequestLimiter() {
        this(System::currentTimeMillis);
    }

    AiRequestLimiter(LongSupplier clock) {
        this.clock = clock;
    }

    public synchronized boolean allowRequest() {
        long window = clock.getAsLong() / 60_000;
        if (window != currentWindow) {
            currentWindow = window;
            requestsInWindow = 0;
        }
        if (requestsInWindow >= MAX_REQUESTS_PER_MINUTE) {
            return false;
        }
        requestsInWindow++;
        return true;
    }
}
