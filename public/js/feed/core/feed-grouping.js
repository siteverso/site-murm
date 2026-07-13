(function initializeFeedGrouping(global) {
    const contracts = global.MurmFeedContracts;
    if (!contracts) throw new Error('MurmFeedContracts must be loaded before feed grouping.');

    function getColumnDefinitions(mode = 'sex') {
        return contracts.columnGroups[mode] || contracts.columnGroups.sex;
    }

    function relevanceValue(post, code) {
        if (code === 'pulse') return Number(post?.positive || 0) - Number(post?.negative || 0);
        if (code === 'echoes') return Number(post?.shares || 0);
        if (code === 'silences') return Number(post?.negative || 0);
        return 0;
    }

    function getColumnItems({items = [], definition, mode = 'sex', getRoots, relevanceResolver = relevanceValue}) {
        const roots = typeof getRoots === 'function' ? getRoots(items) : items;
        if (mode === 'sex') return roots.filter(post => (post.sexCode || '') === definition.code);

        if (mode === 'users') {
            const latestPostByUser = new Map();
            roots.forEach(post => {
                const userKey = String(post.userId || post.author || '');
                const current = latestPostByUser.get(userKey);
                if (!current || Number(post.createdAt || 0) > Number(current.createdAt || 0)) {
                    latestPostByUser.set(userKey, post);
                }
            });
            const userMetric = post => definition.code === 'active'
                ? Number(post.userActivityCount || 0)
                : Number(post.userCreatedAt || 0);
            return [...latestPostByUser.values()].sort((left, right) => {
                const metricDifference = definition.code === 'oldest'
                    ? userMetric(left) - userMetric(right)
                    : userMetric(right) - userMetric(left);
                if (metricDifference) return metricDifference;
                return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
            });
        }

        return [...roots].sort((left, right) => {
            const scoreDifference = relevanceResolver(right, definition.code) - relevanceResolver(left, definition.code);
            if (scoreDifference) return scoreDifference;
            return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
        });
    }

    global.MurmFeedGrouping = Object.freeze({getColumnDefinitions, getColumnItems, relevanceValue});
})(window);
