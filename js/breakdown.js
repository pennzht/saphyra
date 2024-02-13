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

}

// Break down in this order:
// ins.FALSE, outs.TRUE
// ins.AND, outs.AND
// outs.IMPL, ins.OR
// mp (if any)
