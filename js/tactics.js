// Tactics.

function showMatchedRules(trace, io, content){
    if (io === null) return;

    const stmt = deepParse(content)[0];

    for (const [ruleName, [vars, ins, outs]] of folAxiomsMap.entries()) {
        const targets = io === 'in' ? outs : ins;

        for (const pattern of targets) {
            let match = simpleMatch(pattern, stmt);
            if (match.success) {
                console.log(`Match found: ${str(pattern)} -> ${str(stmt)} @ rule ${ruleName}`);
                console.log(match);
            }
        }
    }

    console.log("---end---");
}
