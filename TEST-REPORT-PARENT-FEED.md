# Test report — contextual feed by parent murmur

- Automated tests: 150 passed, 0 failed.
- Astro SSR build: passed.
- Home and parent page share the same `FeedBoard` component.
- Contextual page: `/murmurio/[id]`.
- Feed API uses `parentId`; only descendants of the selected parent are returned.
- Existing view modes remain shared: sex columns, relevance, users, grid, deck and list.
- The author's existing `ProfileSidebar` is reused on the left.
