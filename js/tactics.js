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

function applyMatchedRule(
    // These parameters are to _locate_ the statement.
    trace, io, content,
    // These parameters decide which rule to use.
    rule, map,
) {
    // TODO - apply matched rule (to parent `join`).
}
