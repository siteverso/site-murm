(function initializeFeedContracts(global) {
    const utils = global.MurmAppUtils;
    if (!utils) throw new Error('MurmAppUtils must be loaded before feed contracts.');

    const contracts = Object.freeze({
        batchSize: 20,
        defaultContext: Object.freeze({
            parentId: null,
            viewMode: 'columns',
            groupBy: 'sex',
        }),
        columnGroups: Object.freeze({
            sex: Object.freeze(utils.getSexColumnDefinitions()),
            age: Object.freeze(utils.getAgeColumnDefinitions()),
            relevance: Object.freeze(utils.getRelevanceColumnDefinitions()),
            users: Object.freeze(utils.getUserColumnDefinitions()),
        }),
        viewModes: Object.freeze(['columns', 'deck', 'grid', 'list']),
        groupModes: Object.freeze(['sex', 'age', 'users', 'none']),
    });

    global.MurmFeedContracts = contracts;
})(window);
