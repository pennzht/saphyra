// Tactics.

// Matched rule format:
// [trace, io, stmt, rule, map-as-list]

function showMatchedRules(module, trace, io, content){
    if (io === null) return;

    const stmt = deepParse(content)[0];

    const applicableRules = [];

    // Check if exact match exists.

    const targetNode = locateNode(module, trace.slice(0, trace.length-1));
    console.log(targetNode);

    if (io === 'in') {
        // Match exact outs.
        for (const sub of targetNode[5]) if (sub[0] === 'node') {
            for (const out of sub[3]) {
                if (eq (out, content)) {
                    applicableRules.push([
                        trace, io, content, sub[1], 'out'
                    ]);
                }
            }
        }
        // Match parent assumptions.
        for (const assumption of targetNode[2]) {
            if (eq (assumption, content)) {
                applicableRules.push([trace, io, content, '^a', 'out']);
            }
        }
    }

    if (io === 'out') {
        // Match exact outs.
        for (const sub of targetNode[5]) if (sub[0] === 'node') {
            for (const inn of sub[2]) {
                if (eq (inn, content)) {
                    applicableRules.push([
                        trace, io, content, sub[1], 'in'
                    ]);
                }
            }
        }
        // Match parent assumptions.
        for (const consequent of targetNode[3]) {
            if (eq (consequent, content)) {
                applicableRules.push([trace, io, content, '^c', 'in']);
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
                    [trace, io, stmt, ruleName, [...match.map]],
                );
            }
        }
    }

    console.log("---end---");
    return applicableRules;
}

function applyMatchedRule(code, matchedRule) {
    const [trace, io, content, ruleName, replacementList] = matchedRule;
    console.log('trace', trace, 'io', io, 'content', content, 'rule', ruleName, 'replacementMap', new Map(replacementList));
    console.log('code', str(code));

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
        link = ['link', newNode[1], trace[trace.length-1], content];
    } else {
        link = ['link', trace[trace.length-1], newNode[1], content];
    }
    console.log(newNode);
    console.log(link);

    return replacePathInModule(code, trace.slice(0, trace.length-1),
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
