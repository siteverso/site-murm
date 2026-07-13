const DEFAULT_REPLY_MAX_DEPTH = 10;

function parseReplyMaxDepth(value: unknown): number {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 50 ? parsed : DEFAULT_REPLY_MAX_DEPTH;
}

export const REPLY_MAX_DEPTH = parseReplyMaxDepth(import.meta.env.PUBLIC_MURMUR_REPLY_MAX_DEPTH);
