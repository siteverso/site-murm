const DEFAULT_TEXT_LIMIT = 256;

function parseTextLimit(value: unknown): number {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_TEXT_LIMIT;
}

export const TEXT_LIMIT = parseTextLimit(import.meta.env.PUBLIC_MURMUR_TEXT_LIMIT);
