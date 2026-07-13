(function initializeFeedQuery(global) {
    const contextApi = global.MurmFeedContext;
    if (!contextApi) throw new Error('MurmFeedContext must be loaded before feed query.');

    function readFeedContext(root = document) {
        const board = root?.querySelector?.('[data-feed-board]');
        const profileFeed = root?.querySelector?.('[data-profile-feed]');
        return contextApi.createFeedContext({
            parentId: board?.dataset.parentId || null,
            viewMode: board?.dataset.viewMode || undefined,
            groupBy: board?.dataset.groupBy || undefined,
        });
    }

    function buildFeedEndpoint({context, profileUsername = '', specificId = ''} = {}) {
        const safeContext = contextApi.createFeedContext(context || {});
        const params = new URLSearchParams();

        if (specificId) params.set('specificId', String(specificId));
        else if (profileUsername) params.set('username', String(profileUsername));
        else if (safeContext.parentId !== null) params.set('parentId', String(safeContext.parentId));

        const query = params.toString();
        return query ? `/api/posts?${query}` : '/api/posts';
    }

    global.MurmFeedQuery = Object.freeze({buildFeedEndpoint, readFeedContext});
})(window);
