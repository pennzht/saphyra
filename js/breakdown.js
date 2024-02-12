import * as lang from './lang.js';
import * as data from './data.js';

/// TODO: break down a node into smaller parts.

export class Completer {
    constructor (args) {
        this.prefix = args.prefix;
        this.clock = 0;  // Generator for unique node names.
    }

    gensym () {
        this.clock ++;
        return `${this.prefix}/${this.clock}`;
    }

    tryProve (node) {
        // node: {ins, outs}
        // returns: [... commands of a subtree?]
    }
}
