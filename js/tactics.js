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
        const subBlock = ['node', gensym('#'), [stmt[1]], [stmt[2]], ['join'], []];
        const mainBlock = ['node', gensym('#'), [], [stmt], ['impl-intro'], [
          subBlock,
        ]];
        const newLink = ['link', mainBlock[1], port, stmt];
        return addBlocksToNode(code, space, [mainBlock, newLink]);
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
