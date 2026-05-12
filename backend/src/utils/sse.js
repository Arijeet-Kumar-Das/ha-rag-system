export const createSseStream = (req, res) => {
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    let closed = false;

    const send = (event, data = {}) => {
        if (closed || res.writableEnded || res.destroyed) return;
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const heartbeat = setInterval(() => {
        send("ping", { timestamp: Date.now() });
    }, 15000);

    const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        if (!res.writableEnded && !res.destroyed) {
            res.end();
        }
    };

    req.on("close", () => {
        closed = true;
        clearInterval(heartbeat);
    });

    return {
        send,
        close,
        isClosed: () => closed || res.writableEnded || res.destroyed
    };
};
