(function initializeFeedContext(global) {
    const contracts = global.MurmFeedContracts;
    if (!contracts) throw new Error('MurmFeedContracts must be loaded before feed context.');

    function normalizeParentId(value) {
        if (value === null || value === undefined || value === '') return null;
        const parsed = Number(value);
        return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
    }

    function createFeedContext(input = {}) {
        const defaults = contracts.defaultContext;
        const viewMode = contracts.viewModes.includes(input.viewMode) ? input.viewMode : defaults.viewMode;
        const groupBy = contracts.groupModes.includes(input.groupBy) ? input.groupBy : defaults.groupBy;
        return Object.freeze({
            parentId: normalizeParentId(input.parentId),
            viewMode,
            groupBy,
        });
    }

    global.MurmFeedContext = Object.freeze({createFeedContext, normalizeParentId});
})(window);
