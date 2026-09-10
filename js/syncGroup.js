/**
 * Has this browser opted out of syncing, and does it have a dataset to sync?
 *
 * The single statement of the `synchable` rule. It was written out three times
 * until #562 -- here, in `HICBrowser.syncState`, and in
 * `StateManager.canBeSynched` -- and its readers now share this one expression
 * rather than each restating it. The third reader, `canBeSynched`, went with
 * the `config.synchState` rung it was the only production caller of (#566);
 * `HICBrowser.syncState` and `pairSynchable` below are what is left.
 *
 * @param {Object} browser
 * @returns {boolean}
 */
function isSynchable(browser) {
    return browser.synchable !== false && browser.dataset !== undefined
}

/**
 * The sync-group pairing rule, as a pure function over a list of browsers.
 *
 * See decision 6 of `docs/adr/0004-browser-registry-per-container.md`: keeping
 * the rule independent of the registry is what lets a cross-registry sync group
 * later be one call over a concatenated array.
 *
 * A browser joins the group only if it has not opted out (`synchable === false`)
 * and has a dataset to sync. Two such browsers pair when `Dataset.canSyncWith`
 * says their maps can follow each other -- same assembly and two-way chromosome
 * parity (ADR-0016 decisions 2-4). Not `isCompatible`: that is the control-map
 * question, and it pairs a subset map with a whole-genome one.
 *
 * Each surviving combination is tested once rather than in both orders. That
 * relies on `canSyncWith` being symmetric, which it is by construction: parity
 * is checked in both directions. It is an equivalence relation besides, so the
 * pairs this returns are the complete graphs of disjoint groups -- a partition.
 *
 * @param {Array} browsers
 * @returns {Array<Array>} each compatible pair once, as `[a, b]`
 */
function pairSynchable(browsers) {

    const synchableBrowsers = browsers.filter(isSynchable)

    const pairs = []
    for (let i = 0; i < synchableBrowsers.length; i++) {
        for (let j = i + 1; j < synchableBrowsers.length; j++) {
            const [a, b] = [synchableBrowsers[i], synchableBrowsers[j]]
            if (a !== b && a.dataset.canSyncWith(b.dataset)) {
                pairs.push([a, b])
            }
        }
    }

    return pairs
}

/**
 * Can this genome place both chromosomes a sync state names?
 *
 * A defensive assert since #632, not a decision. Pairing now requires two-way
 * chromosome parity (`Dataset.canSyncWith`, ADR-0016), and every state a peer
 * publishes names chromosomes from the peer's own table, so a paired browser can
 * place it by construction. Unreachable, then -- and kept, for two reasons: it
 * is the guard #605 added against a real TypeError, and an unreachable guard
 * that fires is the cheapest detector of a bug in the pairing rule. That is why
 * `HICBrowser.syncState` answers it with `console.error` rather than a message
 * to the host: the user cannot cause it, so only we can.
 *
 * Asked of the **genome** because the genome is what `State.sync` consumes: it
 * dereferences `genome.getChromosome(name).index`, and a name it cannot resolve
 * is the TypeError #605 is about. Not the dataset's `getChrIndexFromName` --
 * the expression `canBeSynched` carried until #566 deleted it -- which is an
 * exact, case-sensitive scan and so *stricter* than the lookup it would be
 * guarding: the genome aliases `1` to `chr1` and `MT` to `chrM`, and matches
 * case-insensitively. Guarding with the stricter expression would refuse peer
 * states that sync correctly today, trading a rare throw for a routine false
 * negative. What this admits is exactly what `State.sync` can use -- and it is
 * the same lookup `canSyncWith` decides parity with, which is what makes this
 * unreachable rather than merely unlikely.
 *
 * It was reachable until #632, because pairing asked `Dataset.isCompatible`,
 * which short-circuits to `true` on a known genome-id pair without comparing
 * chromosomes at all: a subset `.hic` labelled `hg38` paired with a whole-genome
 * one and was then published names it did not have.
 *
 * @param {Object} genome - the receiving browser's genome
 * @param {Object} syncState - as `State.getSyncState` publishes it
 * @returns {boolean}
 */
function canResolveSyncState(genome, syncState) {
    const resolves = name => 'string' === typeof name && undefined !== genome?.getChromosome(name)
    return resolves(syncState.chr1Name) && resolves(syncState.chr2Name)
}

export {pairSynchable, isSynchable, canResolveSyncState}
