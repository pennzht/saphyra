// Tactics.

// `showMatchedRules` takes a `join` and a statement (e.g. an unproven statement, together with its port / block)
// and reports a few potential ways to modify the `join` to make the new module.

// `applyMatchedRule` takes a matched rule and applies it to a module, returning a new code.

// Matched rule format:
// [space, port, io, stmt, rule, map-as-list] (for block applications)
// [space, port, io, stmt, 'exact-match', other, otherIo] (for direct links)
// [space, port, io, stmt, 'request-input'] (request input from parent)
// [space, port, io, stmt, 'add-output'] (add output of proven stmt)
// [space, port, --, stmt, 'add-goal'], (add goal to prove)

function getMatchedRules(module, trace, stmt){
    // Destruct: [...space, port, io] = trace
    const space = [...trace];
    const io = space.pop();
    if (! ['in', 'out'].includes(io)) return;
    const port = space.pop();

    const applicableRules = [];

    // Check if exact match exists.

    const spaceNode = locateNode(module, space);
    console.log(spaceNode);

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
    }

    // Get FOL rules possible matches.

    for (const [ruleName, [vars, ins, outs]] of folAxiomsMap.entries()) {
        const targets = io === 'in' ? outs : ins;

        for (const pattern of targets) {
            let match = simpleMatch(pattern, stmt);
            if (match.success) {
                console.log(`Match found: ${str(pattern)} -> ${str(stmt)} @ rule ${ruleName}`);
                console.log(match.map);
                applicableRules.push(
                    [space, port, io, stmt, ruleName, [...match.map]],
                );
            }
        }
    }

    console.log("---end---");
    return applicableRules;
}

function applyMatchedRule(code, matchedRule) {
    const [space, port, io, content, ruleName, ...args] = matchedRule;

    if (ruleName === 'exact-match') {
        // Add exact match.

        const [other, polarity] = args;

        let newLink;
        if (io === 'in') {
            newLink = ['link', other, port, content];
        } else {
            newLink = ['link', port, other, content];
        }

        return replacePathInModule(code, space,
            (node) => node.concat([newLink]),
        );
    }

    const [replacementList] = args;

    console.log(
      'space', space, 'port', port, 'io', io, 'content', content,
      'ruleName', ruleName, 'replacements', str(replacementList),
    );

    const rule = folAxiomsMap.get(ruleName);
    [ruleVars, ruleIns, ruleOuts] = rule;
    console.log('vars', ruleVars, 'ins', ruleIns, 'outs', ruleOuts);

    const replacementMap = new Map(replacementList);
    for (const vn of ruleVars) {
        if (! replacementMap.has(vn)) {
            replacementMap.set(vn, gensym('_P'));
        }
    }

    // Compute replacements.
    [ins, outs] = replaceAll([ruleIns, ruleOuts], replacementMap);
    console.log(str(ins));
    console.log(str(outs));

    const newNode = ['node', gensym('#gen/'), ins, outs, [ruleName], []];
    let link;
    if (io === 'in') {
        link = ['link', newNode[1], port, content];
    } else {
        link = ['link', port, newNode[1], content];
    }
    console.log(newNode);
    console.log(link);

    return replacePathInModule(code, space,
        (node) => node.concat([newNode, link]),
    );
}

function replacePathInModule(code, path, updateFn) {
    if (path.length === 0) {
        return updateFn(code);
    }

    return code.map((node) => replacePathInNode(node, path, updateFn));
}

function replacePathInNode(node, path, updateFn) {
    if (node[0] === 'node' && node[1] === path[0]) {
        return [
            ... node.slice(0, 5),
            replacePathInModule(node[5], path.slice(1), updateFn),
        ];
    }
    return node;
}

function locateNode(module, path) {
    for (const node of module) {
        if (node[0] === 'node' && node[1] === path[0]) {
            if (path.length === 1) return node;
            return locateNode(node[5], path.slice(1));
        }
    }
}
