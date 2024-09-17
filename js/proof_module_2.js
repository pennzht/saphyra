// Verifies a tree module, adding necessary information.

/** Structure of a tree module:
    [node #label [... input statements] [... output statements] justification [... subnodes and links]]
        a proof node; given input statements are true, proves that the output statements are true.
        may include subnodes as part of the proof.
        justification is a list such as [and-intro] or [impl-intro]
        when justification = [join], it represents a space containing smaller nodes,
        combining their assumptions and conclusions into a large node.
    [link #from-node #to-node statement]
        indicates that a given statement is an output of #from-node and
        an input of #to-node.

    To fix existing code: Justification can be an array or a simple string.
**/

[Label, Ins, Outs, Just, Subs, AdditionalInfo] = [1, 2, 3, 4, 5, 6];
[Lfrom, Lto, Lstmt] = [1, 2, 3];

// Additional info should be one of: #good, #err/..., #incom (at least one sub incomplete; otherwise good.)

// Sync with axioms.js
folAxioms = parse(folRules);   // Avoiding deepParse for now.

folAxiomsMap = new Map(folAxioms.map (
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

        const nodeProper = [
            'node', label, ins, outs, justification, subs,
        ];

        const justNormalized = isList(justification) ? justification : [justification];

        /* if (! isList(justification)) {
            return nodeProper.concat(['#err/justification-not-list']);
        } */

        if (! isList(subs)) {
            return nodeProper.concat(['#err/subs-not-list']);
        }

        if (! (isAtomic (label) && isList (ins) && isList (outs)
               /* && isList(justification) */ && isList(subs))) {
            return nodeProper.concat(['#err/structure-incorrect']);
        }

        if (! label.startsWith('#')) {
            return nodeProper.concat(['#err/label-should-start-with-#']);
        }

        const subsVerified = subs.map(verifyNode);
        nodeProper[Subs] = subsVerified;

        // Check if all subs are good.
        const subsGood = ((subsVerified || [])
                          .filter ((n) => n[0] === 'node')
                          .every ((n) => n[AdditionalInfo].startsWith('#good')) );

        // If all subs are good, then this could be good; otherwise incomplete.
        const good = subsGood ? '#good' : '#incom';

        if (node[Label] === '##test-me') {
            console.log('Current node is', node, 'subsVerified is', subsVerified, 'subsGood is', subsGood);
            console.log(pprint(node));
        }

        const [rule, ...args] = justNormalized;

        const folRule = folAxiomsMap.get(rule) || null;
        if (folRule !== null) {
            // Rule defined
            const match = simpleMatch (folRule.slice(1), [ins, outs]);
            if (match.success) {
                return nodeProper.concat([good]);
            } else {
                return nodeProper.concat(['#err/no-match']);
            }
        } else if (rule === 'impl-intro') {
            // Rule: from [..., A] |- [B]
            //         to [...] |- [A -> B]
            // Allowing reorders.
            // General rule:
            // sub-ins = union(ins, A)
            // sub-outs = [B]
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
            const subIns = sub[Ins], subOuts = sub[Outs];
            const [_arrow, A, B] = out;
            const valid = _arrow === '->' && eq([B], subOuts) &&
                setEquals(subIns, [...ins, A]);
            return nodeProper.concat([valid ? good : '#err/derivation']);
        } else if (rule === 'forall-intro') {
            // Rule: from [...] |- [(P _var)] where _var not in ...
            //         to [...] |- [(forall P)]
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
            const subIns = sub[Ins], subOuts = sub[Outs];
            const validIns = setEquals(subIns, ins);
            const outsMatch = simpleMatch(
                [['_P', '_var'], ['forall', '_P']],
                [subOuts[0], out],
            );
            const validOuts = outsMatch.success && isVar(outsMatch.map.get('_var'))
                && ! getFreeVars(subIns).includes(outsMatch.map.get('_var'));

            const valid = validIns && validOuts;
            return nodeProper.concat([valid ? good : '#err/derivation']);
        } else if (rule === 'exists-elim') {
            // Rule: from [(P _var), ...] |- [result] where _var not in ..., result
            //         to [(exists P), ...] |- [result]
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
            const subIns = sub[Ins], subOuts = sub[Outs];

            const validOuts = setEquals(subOuts, outs);
            const validIns = setEquals(subIns.slice(1), ins.slice(1));
            const insMatch = simpleMatch(
                [['_P', '_var'], ['exists', '_P']],
                [subIns[0], ins[0]],
            );
            const freeVar = insMatch.success && isVar(insMatch.map.get('_var'))
                  && ! getFreeVars(subIns.slice(1)).includes(insMatch.map.get('_var'))
                  && ! getFreeVars(subOuts).includes(insMatch.map.get('_var'));

            const valid = validIns && validOuts && freeVar;
            return nodeProper.concat([valid ? good : '#err/derivation']);
        } else if (rule === 'beta') {
            // Beta __equivalence__
            if (outs.length !== 1) {
                return nodeProper.concat(['#err/incorrect-outs']);
            }
            const [out] = outs;
            const matching = simpleMatch(
                ['=', '_lhs', '_rhs'],
                out,
            );
            if (! matching.success) {
                return nodeProper.concat(['#err/format']);
            }

            const valid = lambdaEq(
              matching.map.get('_lhs'),
              matching.map.get('_rhs'),
            )

            return nodeProper.concat([valid ? good : '#err/beta']);

            /* Old version: one-step expansion.
            // Beta expansion/contraction
            if (outs.length !== 1) {
                return nodeProper.concat(['#err/incorrect-outs']);
            }
            const [out] = outs;
            const matching = simpleMatch(
                ['=', [[':', '_invar', '_body'], '_value'],
                      '_rhs'],
                out,
            );
            if (! matching.success) {
                return nodeProper.concat(['#err/format']);
            }

            const val = (x) => matching.map.get(x);

            if (! isVar(val('_invar'))) {
                return nodeProper.concat(['#err/not-variable']);
            }

            const valid = eq(
                val('_rhs'),
                lambdaReplace(val('_body'), val('_invar'), val('_value')),
            );

            return nodeProper.concat([valid ? good : '#err/beta']);
            */
        } else if (rule === 'join') {
            const nodes = subsVerified.filter((x) => x[0] === 'node' && isAtomic(x[Label]));
            const links = subsVerified.filter((x) => x[0] === 'link');

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
                ['^a'].concat(nodeNames).concat(['^c']),
                links.map((x) => [x[Lfrom], x[Lto]]),
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

            const outSubs = [];

            // First, add comments.
            for (const y of subsVerified.filter((x) => x[0] === 'comment')) {
                outSubs.push(y);
            }

            // Along the order, check if each block is valid,
            // constructing an order of links and blocks.
            for (const n of order) {
                // Check pre-stmts.
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

                // Display any unproven stmts.
                if (assump.get(n).length > 0) {
                    failures.push([n, [...assump.get(n)]]);
                    // Push them to display too
                    outSubs.push(...assump.get(n).map((st) => ['stmt', st, n, 'in', 'unproven']));
                }

                // Display the block itself.
                if (! n.startsWith('^')) {
                    // Actual block
                    outSubs.push(nodeRefs.get(n));
                }

                if (n === '^a') {
                    for (const st of ins) {
                        outSubs.push(['stmt', st, n, 'out', 'given']);
                    }
                } else if (n.startsWith('#')) {
                    for (const st of (nodeRefs.get(n)[Outs])) {
                        const provenStatement = ['stmt', st, n, 'out', 'proven'];
                        if (nodeRefs.get(n)[Subs].length <= 0) {
                            // No subs; allow hiding.
                            provenStatement.push(nodeRefs.get(n)[Just]); // justification
                        }
                        outSubs.push(provenStatement);
                    }
                }
            }

            // Use redefined subs for nodes.
            nodeProper[Subs] = outSubs;

            if (failures.length > 0) {
                return nodeProper.concat(['#err/unproven-assump', ...failures]);
            }

            // Success!

            return nodeProper.concat([good]);
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

if (0){
console.log (verifyNode(
  parseOne(
    `
[node #b [_A]
[[= ((: _y _m) _x) _m]] [beta] []
]
    `
  )
));
}
