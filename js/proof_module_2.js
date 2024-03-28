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

        const nodeProper = [
            'node', label, ins, outs, justification,
            subs.map(verifyNode),
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
            if (subs.length !== 1) {
                return nodeProper.concat(['#err/too-many-subs']);
            }
            const [sub] = subs.map(verifyNode);  // Verify node.
            if (sub[0] !== 'node') {
                return nodeProper.concat(['#err/sub-not-node']);
            }
            const subIns = sub[2], subOuts = sub[3];
            const valid = out[0] === '->' &&
                eq (subIns, [...ins, out[1]]) &&
                eq (subOuts, [out[2]]);
            return nodeProper.concat([valid ? '#good' : '#err/derivation']);
        } else if (rule === 'join') {
            // TODO: verify, with TOPOSORT.
            // TODO: assign order to nodes.
            const subsVerified = subs.map(verifyNode);
            return nodeProper.concat(['#todo']);
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
