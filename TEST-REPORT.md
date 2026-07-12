# Test report

## Direct privacy controls

Implemented and validated:

- Archive conversation for the current user.
- Remove conversation only from the current user's inbox.
- Block and unblock another user.
- Backend block enforcement before sending a direct.
- Report conversation by sending a direct to `@murmurinho`.
- Incremental Oracle patch for conversation state and block relationships.

## Validation

- `npm run build`: passed.
- `node --test tests/direct-report.test.mjs tests/direct-privacy-controls.test.mjs`: 5 passed, 0 failed.

The complete legacy test suite still contains failures that were already present outside this change set; the targeted privacy tests and production build pass.
