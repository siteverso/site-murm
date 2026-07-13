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

    function resolveAge(post) {
        const directAge = Number(post?.userAge ?? post?.age);
        if (Number.isFinite(directAge) && directAge >= 0) return directAge;

        const birthValue = post?.userBirthDate || post?.birthDate;
        if (!birthValue) return null;
        const birthDate = new Date(birthValue);
        if (Number.isNaN(birthDate.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const beforeBirthday = today.getMonth() < birthDate.getMonth()
            || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
        if (beforeBirthday) age -= 1;
        return age >= 0 ? age : null;
    }

    function getLatestPostByUser(roots) {
        const latestPostByUser = new Map();
        roots.forEach(post => {
            const userKey = String(post.userId || post.author || '');
            const current = latestPostByUser.get(userKey);
            if (!current || new Date(post.createdAt || 0).getTime() > new Date(current.createdAt || 0).getTime()) {
                latestPostByUser.set(userKey, post);
            }
        });
        return [...latestPostByUser.values()];
    }

    function splitUsersIntoExclusiveGroups(roots) {
        const users = getLatestPostByUser(roots);
        if (!users.length) return {oldest: [], newest: [], active: []};

        const activeCount = Math.max(1, Math.floor(users.length / 3));
        const active = [...users]
            .sort((left, right) => Number(right.userActivityCount || 0) - Number(left.userActivityCount || 0))
            .slice(0, activeCount);
        const activeIds = new Set(active.map(post => String(post.userId || post.author || '')));
        const remaining = users
            .filter(post => !activeIds.has(String(post.userId || post.author || '')))
            .sort((left, right) => Number(left.userCreatedAt || 0) - Number(right.userCreatedAt || 0));
        const oldestCount = Math.ceil(remaining.length / 2);
        return {
            oldest: remaining.slice(0, oldestCount),
            newest: remaining.slice(oldestCount).reverse(),
            active,
        };
    }

    function getColumnItems({items = [], definition, mode = 'sex', getRoots, relevanceResolver = relevanceValue}) {
        const roots = typeof getRoots === 'function' ? getRoots(items) : items;
        if (mode === 'sex') return roots.filter(post => (post.sexCode || '') === definition.code);

        if (mode === 'age') {
            return roots.filter(post => {
                const age = resolveAge(post);
                if (age === null) return false;
                if (definition.code === 'to25') return age <= 25;
                if (definition.code === 'to50') return age >= 26 && age <= 50;
                if (definition.code === 'to75') return age >= 51 && age <= 75;
                if (definition.code === 'over75') return age > 75;
                return false;
            });
        }

        if (mode === 'users') {
            const groups = splitUsersIntoExclusiveGroups(roots);
            return groups[definition.code] || [];
        }

        return [...roots].sort((left, right) => {
            const scoreDifference = relevanceResolver(right, definition.code) - relevanceResolver(left, definition.code);
            if (scoreDifference) return scoreDifference;
            return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
        });
    }

    global.MurmFeedGrouping = Object.freeze({getColumnDefinitions, getColumnItems, relevanceValue});
})(window);
