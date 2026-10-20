package com.resumecraft.api.ai;

import org.springframework.stereotype.Component;

@Component
public class AiRequestLimiter {

    private static final int MAX_REQUESTS_PER_MINUTE = 10;

    private long currentWindow = System.currentTimeMillis() / 60_000;
    private int requestsInWindow;

    public synchronized boolean allowRequest() {
        long window = System.currentTimeMillis() / 60_000;
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
