// 2nd version of proof modules, using new tree syntax.

// Sync with axioms.js
const folAxioms = deepParse(folRules);

const folAxiomsMap = new Map(folAxioms.map (
    (line) => [line[0], line.slice(1)],  // name => [vars, ins, outs]
));

/// Verifies a node.
function verifyNode (node) {
    try {
        if (! isList(node)) {
            return ['#err/node-is-not-list', node];
        }

        // node is list.
        const head = node[0];
        if (head === 'comment') {
            return node;
        } else if (head === 'link') {
            return (node.length >= 4 &&
                isAtomic(node[1]) && isAtomic(node[2])
                ? node
                : ['#err/link-format-error', node]);
        } else if (head !== 'node') {
            return ['#err/unrecognized-head', node];
        }

        // node is 'node'.
        if (node.length < 6) {
            return ['#err/node-size-error', node];
        }

        const [_, label, ins, outs, justification, subs, ..._rest] = node;

        if (! isList(justification)) {
            return node.slice(0, 6).concat(['#err/justification-not-list']);
        }

        if (! isList(subs)) {
            return node.slice(0, 6).concat(['#err/subs-not-list']);
        }

        if (! (isAtomic (label) && isList (ins) && isList (outs)
               && isList(justification) && isList(subs))) {
            return node.slice(0, 6).concat(['#err/structure-incorrect']);
        }

        if (! label.startsWith('#')) {
            return node.slice(0, 6).concat(['#err/label-should-start-with-#']);
        }

        const subsVerified = subs.map(verifyNode);

        const nodeProper = [
            'node', label, ins, outs, justification, subsVerified,
        ];

        const [rule, ...args] = justification;

        const folRule = folAxiomsMap.get(rule) || null;
        if (folRule !== null) {
            // Rule defined
            const match = simpleMatch (folRule.slice(1), [ins, outs]);
            if (match.success) {
                return nodeProper.concat(['#good']);
            } else {
                return nodeProper.concat(['#err/no-match']);
            }
        } else if (rule === 'impl-intro') {
            // Rule: from [..., A] |- [B]
            //         to [...] |- [A -> B]
            if (outs.length !== 1) {
                return nodeProper.concat(['#err/too-long']);
            }
            const [out] = outs;
            if (subsVerified.length !== 1) {
                return nodeProper.concat(['#err/too-many-subs']);
            }
            const [sub] = subsVerified;  // Verify node.
            if (sub[0] !== 'node') {
                return nodeProper.concat(['#err/sub-not-node']);
            }
            const subIns = sub[2], subOuts = sub[3];
            const valid = out[0] === '->' &&
                eq (subIns, [...ins, out[1]]) &&
                eq (subOuts, [out[2]]);
            return nodeProper.concat([valid ? '#good' : '#err/derivation']);
        } else if (rule === 'join') {
            const nodes = subs.filter((x) => x[0] === 'node' && isAtomic(x[1]));
            const links = subs.filter((x) => x[0] === 'link');

            const nodeNames = nodes.map((x) => x[1]);
            const nodeRefs = new Map(nodes.map(
                (node) => [node[1], node]
            ));

            // Node uniqueness
            if (new Set(nodeNames).size < nodeNames.length) {
                return nodeProper.concat([
                    '#err/node-name-non-unique'
                ]);
            }

            // Get sort order
            const toposortResult = toposort(
                nodeNames.concat(['^a', '^c']),
                links.map((x) => [x[1], x[2]]),
            );

            // Get toposort
            if (!toposortResult.success) {
                return nodeProper.concat([
                    '#err/' + toposortResult.reason,
                    toposortResult.loop || toposortResult.unknownNode,
                ]);
            }
            const order = toposortResult.order;

            // Check all things in order
            const assump = new Map(), conseq = new Map();
            for (const n of order) {
                if (n === '^a') {
                    assump.set(n, []); conseq.set(n, [...ins]);
                } else if (n === '^c') {
                    assump.set(n, [...outs]); conseq.set(n, []);
                } else {
                    assump.set(n, [...(nodeRefs.get(n)[2])]);
                    conseq.set(n, [...(nodeRefs.get(n)[3])]);
                }
            }

            const failures = [];

            // Along the order, check if each block is valid.
            for (const n of order) {
                for (const l of links) {
                    const [_, a, b, stmt] = l;
                    if (b === n) {
                        // Potential origin.
                        if (hasMember(conseq.get(a), stmt)) {
                            assump.set(b,
                                delMember (assump.get(b), stmt)
                            );
                        }
                    }
                }

                if (assump.get(n).length > 0) {
                    failures.push([n, [...assump.get(n)]]);
                }
            }

            if (failures.length > 0) {
                return nodeProper.concat(['#err/unproven-assump', ...failures]);
            }

            // Success!

            return nodeProper.concat(['#good']);
        } else {
            return nodeProper.concat(['#err/no-such-rule']);
        }
    } catch (e) {
        throw e;
    }
}

/// Verifies a tree of derivations.
function verifyModule (nodes) {
    return nodes.map(verifyNode);
}
