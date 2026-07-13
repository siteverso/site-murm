# Test report — parent context UI

## Scope

- independent view preference for Home, each profile, and each parent message;
- compact Pulse in the parent message card;
- shared top alignment and normalized first row in embedded contextual feeds;
- preservation of the shared `FeedBoard` contract.

## Results

- `npm test`: 152 passed, 0 failed, 0 skipped;
- JavaScript/MJS syntax: all checked with `node --check`, 0 errors;
- `npm run build`: Astro SSR build completed successfully.

## Notes

The old global key `murmur_feed_view` remains read only as a Home migration fallback. New values are stored by context:

- `murmur_feed_view:home`
- `murmur_feed_view:profile:<username>`
- `murmur_feed_view:message:<id>`
