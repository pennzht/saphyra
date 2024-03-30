// Tactics.

// `showMatchedRules` takes a `join` and a statement (e.g. an unproven statement, together with its port / block)
// and reports a few potential ways to modify the `join` to make the new module.

// `applyMatchedRule` takes a matched rule and applies it to a module, returning a new code.

// Matched rule format:
// [space, port, io, stmt, rule, map-as-list] (for block applications)
// [space, port, io, stmt, 'exact-match', other, otherIo] (for direct links)
// [space, port, io, stmt, 'add-input'] (request input from parent)
// [space, port, io, stmt, 'add-output'] (add output of proven stmt)
// [space, ----, --, ----, 'add-goal'] (add goal to prove)
// [space, ----, --, ----, 'add-goal', stmt] (add goal to prove)
// [space, port, 'in', stmt, 'impl-intro'] (apply special rule: impl-intro)

function getMatchedRules(module, trace, stmt){
    // Destruct: [...space, port, io] = trace
    // Trace is something like [#root #1 #2 #innernode in]

    const space = [...trace];
    const tail = space[space.length - 1];

    if (['in', 'out'].includes(tail)) {
        const io = space.pop();
        const port = space.pop();
        return getMatchedRulesByPort(module, space, port, io, stmt);
    } else {
        return getMatchedRulesBySpace(module, space, stmt);
    }
}

function getMatchedRulesBySpace(module, space, stmt) {
    const applicableRules = [];

    applicableRules.push([space, null, null, stmt, 'add-goal']);

    return applicableRules;
}

function getMatchedRulesByPort(module, space, port, io, stmt) {
    const applicableRules = [];

    // Check if exact match exists.

    const spaceNode = locateNode(module, space);

    // In both cases, allow beta-expansion or beta-reduction.
    applicableRules.push([
        space, port, io, stmt, 'beta-expansion-stmt',
    ]);

    if (isRedux(stmt)) {
        applicableRules.push([
            space, port, io, stmt, 'beta-reduction-stmt',
        ]);
    }

    if (io === 'in') {
        // Match exact outs.
        for (const sub of spaceNode[5]) if (sub[0] === 'node') {
            for (const out of sub[3]) {
                if (eq (out, stmt)) {
                    applicableRules.push([
                        space, port, io, stmt, 'exact-match', sub[1], 'out'
                    ]);
                }
            }
        }
        // Match parent assumptions.
        for (const assumption of spaceNode[2]) {
            if (eq (assumption, stmt)) {
                applicableRules.push([space, port, io, stmt, 'exact-match', '^a', 'out']);
            }
        }
        // Add input.
        applicableRules.push([space, port, io, stmt, 'add-input']);
        // Match impl.
        if (simpleMatch(parse('-> _A _B'), stmt).success) {
            // Can apply impl.
            applicableRules.push([space, port, 'in', stmt, 'impl-intro']);
        }
        // Match forall-intro.
        if (simpleMatch(parse('forall _P'), stmt).success) {
            applicableRules.push([space, port, 'in', stmt, 'forall-intro']);
        }
    }

    if (io === 'out') {
        // Match exact outs.
        for (const sub of spaceNode[5]) if (sub[0] === 'node') {
            for (const inn of sub[2]) {
                if (eq (inn, stmt)) {
                    applicableRules.push([
                        space, port, io, stmt, 'exact-match', sub[1], 'in'
                    ]);
                }
            }
        }
        // Match parent assumptions.
        for (const consequent of spaceNode[3]) {
            if (eq (consequent, stmt)) {
                applicableRules.push([space, port, io, stmt, 'exact-match', '^c', 'in']);
            }
        }
        // Add output.
        applicableRules.push([space, port, io, stmt, 'add-output']);
    }

    // Get FOL rules possible matches.

    for (const [ruleName, [vars, ins, outs]] of folAxiomsMap.entries()) {
        const targets = io === 'in' ? outs : ins;

        for (const pattern of targets) {
            let match = simpleMatch(pattern, stmt);
            if (match.success) {
                applicableRules.push(
                    [space, port, io, stmt, ruleName, [...match.map]],
                );
            }
        }
    }

    return applicableRules;
}

function applyMatchedRule(code, matchedRule, additionalArgs) {
    const [space, port, io, stmt, ruleName, ...args] = matchedRule;

    if (ruleName === 'exact-match') {
        // Add exact match.

        const [other, polarity] = args;

        let newLink;
        if (io === 'in') {
            newLink = ['link', other, port, stmt];
        } else {
            newLink = ['link', port, other, stmt];
        }

        return addBlocksToNode(code, space, [newLink]);
    }

    if (ruleName === 'add-goal') {
        const goal = parseOneLenient(additionalArgs.goalContent);
        if (!goal) return code; // Application failed

        const newNode = ['node', gensym('#'), [goal], [goal], ['id'], []];
        const newLink = ['link', newNode[1], '^c', goal];

        return addBlocksToNode(code, space, [newNode, newLink]);
    }

    if (ruleName === 'impl-intro') {
        const spaceIns = locateNode(code, space)[2];
        const subBlock = ['node', gensym('#'), [...spaceIns, stmt[1]], [stmt[2]], ['join'], []];
        const mainBlock = ['node', gensym('#'), spaceIns, [stmt], ['impl-intro'], [
          subBlock,
        ]];
        const newLink = ['link', mainBlock[1], port, stmt];
        return addBlocksToNode(code, space, [mainBlock, newLink]);
    }

    if (ruleName === 'forall-intro') {
        const spaceIns = locateNode(code, space)[2];
        const newVar = genVar(getFreeVars(spaceIns), typeString(stmt[1][1]));
        const subBlock = ['node', gensym('#'), spaceIns, [[stmt[1], newVar]], ['join'], []];
        const mainBlock = ['node', gensym('#'), spaceIns, [stmt], ['forall-intro'], [
          subBlock,
        ]];
        const newLink = ['link', mainBlock[1], port, stmt];
        return addBlocksToNode(code, space, [mainBlock, newLink]);
    }

    if (ruleName === 'beta-expansion-stmt') {
        // TODO.
        /*
        if (io === 'in') {
            return applyBeta(code, space, port, io, lam, arg, reduced, 'type-reduce');
        } else {
            return applyBeta(code, space, port, io, lam, arg, reduced, 'type-expand');
        }
        */
    }

    if (ruleName === 'beta-reduction-stmt') {
        const [lam, arg] = stmt;
        if (io === 'in') {
            return applyBeta(code, space, port, io, lam, arg, 'type-expand');
        } else {
            return applyBeta(code, space, port, io, lam, arg, 'type-reduce');
        }
    }

    if (ruleName === 'add-input') {
        return replaceNodeAdjustImplIntro(code, space,
            (node) => {
                const [_, label, ins, outs, justification, subs, ...__]
                    = node;
                const newNode = [
                    'node', label, ins.concat([stmt]), outs,
                    justification,
                    subs.concat([['link', '^a', port, stmt]]),
                ];
                return newNode;
            }
        );
    }

    // Default case: add a block

    const [replacementList] = args;

    const rule = folAxiomsMap.get(ruleName);
    [ruleVars, ruleIns, ruleOuts] = rule;

    const replacementMap = new Map(replacementList);
    for (const vn of ruleVars) {
        if (! replacementMap.has(vn)) {
            replacementMap.set(vn, gensym('_P'));
        }
    }

    // Compute replacements.
    [ins, outs] = replaceAll([ruleIns, ruleOuts], replacementMap);

    const newNode = ['node', gensym('#'), ins, outs, [ruleName], []];
    let link;
    if (io === 'in') {
        link = ['link', newNode[1], port, stmt];
    } else {
        link = ['link', port, newNode[1], stmt];
    }

    return addBlocksToNode(code, space, [newNode, link]);
}

function addBlocksToNode(node, path, addedBlocks) {
    if (node[0] !== 'node') {
        return node;   // No replacement
    }
    const [_, label, ins, outs, just, subs, ...__] = node;
    if (eq ([label], path)) {
        return [_, label, ins, outs, just, subs.concat(addedBlocks)];
    } else if (path[0] === label) {
        return [_, label, ins, outs, just, subs.map((n) => addBlocksToNode(n, path.slice(1), addedBlocks))];
    } else {
        return node;
    }
}

// Replaces a `join` node, adjusting all parent impl-intro's, if there exist any.
function replaceNodeAdjustImplIntro(node, path, updateFn) {
    if (node[0] !== 'node') return node;
    const [_, label, ins, outs, just, subs, ...__] = node;
    if (eq([label], path)) {
        // Found node!
        return updateFn(node);
    } else if (path[0] === label) {
        const newSubs = subs.map((s) => replaceNodeAdjustImplIntro(s, path.slice(1), updateFn));
        if (just[0] === 'impl-intro') {
            // Adjust ins/outs.
            const [sub] = newSubs;
            const subIns = sub[2], subOuts = sub[3];
            const [[_arrow, A, B]] = outs;
            const newIns = delMember(subIns, A);
            return ['node', label, newIns, outs, just, newSubs, ...__];
        } else {
            return ['node', label, ins, outs, just, newSubs, ...__];
        }
    } else return node;
}

function locateNode(node, path) {
    const [_, label, ins, outs, just, subs, ...__] = node;
    if (eq([label], path)) {
        return node;
    } else {
        for (const sub of subs) {
            if (sub[0] === 'node' && sub[1] === path[1]) {
                return locateNode(sub, path.slice(1));
            }
        }
    }
}

function applyBeta(code, space, port, io, lam, arg, generalDirection) {
    const redux = [lam, arg];
    const reduced = lambdaReduce(lam, arg);

    const addedBlocks = [];

    if (generalDirection === 'type-expand') {
        const betaBlock = ['node', gensym('#'), [], [
            ['=', redux, reduced],
        ], ['beta'], []];
        const symBlock = ['node', gensym('#'), [
            ['=', redux, reduced],
        ], [
            ['=', reduced, redux],
        ], ['=-sym'], []];
        const elimBlock = ['node', gensym('#'), [
            ['=', reduced, redux],
            reduced,
        ], [
            redux
        ], ['equiv-elim'], []];
        // Apply links

        addedBlocks.push(
            betaBlock, symBlock, elimBlock,
            ['link', betaBlock[1], symBlock[1], betaBlock[3][0]],
            ['link', symBlock[1], elimBlock[1], symBlock[3][0]],
        )

        if (io === 'in') {
            addedBlocks.push(
                ['link', elimBlock[1], port, redux]
            )
        } else {
            addedBlocks.push(
                ['link', port, elimBlock[1], reduced]
            )
        }
    } else {
        const betaBlock = ['node', gensym('#'), [], [
            ['=', redux, reduced],
        ], ['beta'], []];
        const elimBlock = ['node', gensym('#'), [
            ['=', redux, reduced],
            redux,
        ], [
            reduced,
        ], ['equiv-elim'], []];
        // Apply links

        addedBlocks.push(
            betaBlock, elimBlock,
            ['link', betaBlock[1], elimBlock[1], symBlock[3][0]],
        )

        if (io === 'in') {
            addedBlocks.push(
                ['link', elimBlock[1], port, reduced]
            )
        } else {
            addedBlocks.push(
                ['link', port, elimBlock[1], redux]
            )
        }
    }

    return addBlocksToNode(code, space, addedBlocks);
}

/// If there are any `id` blocks connected to other blocks, remove them.
/// `id` blocks are blocks of the form [node ... [X] [X] [id] []], which are
/// used as temporary helper blocks to expose a statement.
function trimId(originalCode) {
    const originalSubs = originalCode[5];
    const idBlocks = originalSubs.filter((x) => isList(x) && x[0] === 'node' && x[4] /*just*/ .includes('id'));

    let subs = originalSubs;
    for (const block of idBlocks) {
        const idn = block[1];
        const nodesTo     = subs.filter((x) => x[0] === 'link' && x[2] === idn).map((x) => x[1]);
        const nodesFrom   = subs.filter((x) => x[0] === 'link' && x[1] === idn).map((x) => x[2]);
        const linkedParts = (nodesTo.length > 0 ? 1 : 0) + (nodesFrom.length > 0 ? 1 : 0);
        if (linkedParts === 1) {
            // Remove all dependencies.
            subs = subs.filter((x) =>
                (x[0] === 'node' && x[1] !== idn) ||
                (x[0] === 'link' && x[1] !== idn && x[2] !== idn)
            );
        } else if (linkedParts === 0) {
            // pass; leave it as is for now.
        } else {
            // remove.
            const incomingNode = nodesTo[0];
            const outgoingNodes = nodesFrom;
            const stmt = block[2][0];
            subs = subs.filter((x) =>
                (x[0] === 'node' && x[1] !== idn) ||
                (x[0] === 'link' && x[1] !== idn && x[2] !== idn)
            );
            // Add new linkings
            for (const n of outgoingNodes) {
                subs.push(['link', incomingNode, n, stmt]);
            }
        }
    }

    const newCode = [...originalCode];
    newCode[5] = subs;
    return newCode;
}

if (0){
console.log(trimId(parseOne(`
  [node #r [_A] [_B] [join] [
    [link ^a #a _A]
    [node #a [_A] [_C] [xyz] []]
    [link #a #c _C]
    [node #c [_C] [_C] [id] []]
    [link #c #b _C]
    [node #b [_C] [_B] [xyz] []]
    [link #b ^c _B]
  ]]
`)))
}
