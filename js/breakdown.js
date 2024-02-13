import * as lang from './lang.js';
import * as data from './data.js';

/// TODO: break down a node into smaller parts.
/// To simplify: a `Completer` only completes a node.
/// Sole purpose is to replace a (todo #node) with either (join ...) or a singular node.

export class Completer {
    // args: {prefix: string[startsWith'#'], target: string(node)}
    constructor (module, args) {
        this.module = module;
        this.prefix = args.prefix;
        this.clock = 0;  // Generator for unique node names.
        this.target = args.target;  // Name of node to be decomposed.
    }

    gensym () {
        this.clock ++;
        return `${this.prefix}/${this.clock}`;
    }

    applyRule (ruleName, inIndices, outIndices) {
        // To avoid fragmentation, one of inIndices or outIndices
        // must be all non-null.
        if (inIndices.some ((x) => x === null) &&
            outIndices.some ((x) => x === null)) {
            // Bad rule
            console.log ('inIndices should be all-non-null, or outIndices should all-non-null');
            return false;
        }

        const rule = lang.folRulesSexp.get(ruleName);
        // [0] => vars
        // [1] => ins, [2] => outs
        if (rule[1].length !== inIndices.length || rule[2].length !== outIndices.length) {
            console.log ('Rule length mismatch');
            return false;  // Length mismatch
        }

        console.log ('rule is', rule[1], rule[2]);

        const targetNode = this.module.nodes.get(this.target);

        // Tries to apply a rule to these indices.
        const inTerms = inIndices.map (
            (i) => targetNode.ins[i] ?? null,
        );
        const outTerms = outIndices.map (
            (i) => targetNode.outs[i] ?? null,
        );

        // Filter out nulls, and match.
        const pattern = [], sexp = [];
        for (var i = 0; i < inIndices.length; i++) {
            if (inTerms[i] === null) continue;
            pattern.push (rule[1][i]);
            sexp.push (inTerms[i]);
        }
        for (var i = 0; i < outIndices.length; i++) {
            if (outTerms[i] === null) continue;
            pattern.push (rule[2][i]);
            sexp.push (outTerms[i]);
        }
        const match = lang.simpleMatch (pattern, sexp);

        if (! match.success) {
            console.log ('rule mismatch', match);
            return false;  // Rule mismatch
        }

        // Check if match filled out all of the variables
        if (! (rule[0].every ((x) => match.map.has (x)))) {
            console.log ('following vars are not matched',
                         rule[0].filter ((x) => !match.map.has(x)),
                        );
        }

        // Start replacement!
        // The "nulls" are the new unproven / given rules.

        const newNodeIns = lang.replaceAll (rule[1], match.map);
        const newNodeOuts = lang.replaceAll (rule[2], match.map);
        const newNode = [
            'node',
            this.gensym (),
            newNodeIns,
            newNodeOuts,
        ];

        // Compute residual node
        // A residual node is one with inIndices

        const newOuts = [];  // TODO
        const newIns = [];  // TODO
        const removeIndices = (x) => x;

        const residueNode = [
            'node',
            this.gensym (),
            targetNode.ins.concat (newOuts),
            removeIndices (targetNode.outs, outIndices).concat (newIns),
        ];
        console.log (residueNode);
        return true;
    }
}

// Break down in this order:
// ins.FALSE, outs.TRUE
// ins.AND, outs.AND
// outs.IMPL, ins.OR
// mp (if any)

const cm = new Completer ({
    nodes: new Map([['#a',
                     {
                         ins: [['and', '_X', '_Y']],
                         outs: [['and', '_Y', '_X']],
                     }
                    ]])
}, {prefix: '#abc', target: '#a'});

console.log ('cm =', cm);

console.log ('applyRule =', cm.applyRule ('and-intro', [null, null], [0]));
