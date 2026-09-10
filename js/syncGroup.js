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
 * Which browsers cannot join any sync group, and why -- the isolation mark's
 * rule, as a pure function beside the pairing rule it explains. ADR-0016
 * decisions 7-8, #637.
 *
 * Reads the same things `pairSynchable` does -- `synchable`, `dataset`, and the
 * dataset's own predicates -- and no DOM or module state, so what a panel shows
 * is a function of the open maps and nothing else. That is what keeps the mark
 * still while the user pans.
 *
 * It reports **isolation, never membership**: a panel with a partner is never
 * in the result, whichever group that partner is in. And it reports nothing in
 * the **empty room** -- fewer than two mapped panels -- because a lone map is
 * the most common view there is, and a badge on it would teach every user to
 * ignore the mark before it ever meant something.
 *
 * A synchable panel whose only mapped company has opted out is not marked
 * either. It *is* partnerless, but the opted-out panels' own marks already say
 * why nothing moves together, and marking both sides would say it twice.
 *
 * @param {Array} browsers
 * @returns {Map<Object, string>} the reason text, for each browser to be marked
 */
function isolationReasons(browsers) {

    const mapped = browsers.filter(browser => browser.dataset !== undefined)
    const reasons = new Map()

    if (mapped.length < 2) {
        return reasons
    }

    const synchable = mapped.filter(isSynchable)

    for (const browser of mapped) {

        if (browser.synchable === false) {
            reasons.set(browser, 'sync is disabled for this panel')
            continue
        }

        const others = synchable.filter(other => other !== browser)
        if (0 === others.length || others.some(other => browser.dataset.canSyncWith(other.dataset))) {
            continue
        }

        reasons.set(browser, partnerlessReason(browser.dataset, others.map(other => other.dataset)))
    }

    return reasons
}

/**
 * Why a synchable map pairs with none of `others`: coverage, if any of them is
 * the same assembly, and the assembly otherwise.
 *
 * Coverage is read through `missingChromosomes`, the lookup `canSyncWith`
 * decides parity with, so the names in the tooltip are exactly the ones that
 * refused the pair -- `1` and `chr1` are never reported as a difference.
 */
function partnerlessReason(dataset, others) {

    const sameAssembly = others.filter(other => dataset.isCompatible(other))

    if (sameAssembly.length > 0) {

        const lacking = union(sameAssembly.map(other => dataset.missingChromosomes(other)))
        if (lacking.length > 0) {
            return `this map has no ${firstNames(lacking)} — the other panels do`
        }

        const surplus = union(sameAssembly.map(other => other.missingChromosomes(dataset)))
        if (surplus.length > 0) {
            return `the other panels have no ${firstNames(surplus)} — this map does`
        }
    }

    const genomeIds = [...new Set(others.map(other => other.genomeId))]
    return `no other panel holds a compatible map (this is ${dataset.genomeId}; the others are ${genomeIds.join(', ')})`
}

/** Names from several lists, each once, in the order they are first met. */
function union(lists) {
    return [...new Set(lists.flat())]
}

/** The first three names, and an ellipsis when there are more. */
function firstNames(names) {
    return names.length > 3 ? `${names.slice(0, 3).join(', ')}, …` : names.join(', ')
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

export {pairSynchable, isSynchable, isolationReasons, canResolveSyncState}
