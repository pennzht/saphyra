// Tactics.

// Matched rule format:
// [trace, io, stmt, rule, map-as-list]

function showMatchedRules(trace, io, content){
    if (io === null) return;

    const stmt = deepParse(content)[0];

    const applicableRules = [];

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
    const [trace, io, content, rule, replacementMap] = matchedRule;
    console.log('trace', trace, 'io', io, 'content', content, 'rule', rule, 'replacementMap', new Map(replacementMap));
    console.log('code', str(code));

    // TODO - return a replaced rule.
}
