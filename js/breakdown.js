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
        const rule = lang.folRulesSexp.get(ruleName);
        // [0] => vars
        // [1] => ins, [2] => outs
        if (rule[1].length !== inIndices.length || rule[2].length !== outIndices.length) {
            return false;  // Length mismatch
        }

        console.log ('rule is', rule[1], rule[2]);

        // Tries to apply a rule to these indices.
        const inTerms = inIndices.map (
            (i) => this.module.nodes.get(this.target).ins[i] ?? null,
        );
        const outTerms = outIndices.map (
            (i) => this.module.nodes.get(this.target).outs[i] ?? null,
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
        console.log ('patterns', pattern, sexp);
        console.log ('match', lang.simpleMatch (pattern, sexp));
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

cm.applyRule ('and-intro', [null, null], [0]);
