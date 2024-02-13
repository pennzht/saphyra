// Parsing a sexp, using only square brackets

import * as data from './data.js';

export function parse (input) {
    input = input.replaceAll ('(', ' [ ');
    input = input.replaceAll (')', ' ] ');
    input = input.replaceAll ('[', ' [ ');
    input = input.replaceAll (']', ' ] ');
    input = input.trim();
    if (input.length === 0) return [];
    input = input.split(/[ \t\n]+/);
    input = input.map((token) => (
        token === '[' ? token :
            token === ']' ? token + ',' :
            '"' + token + '",'))
        .join(' ');
    input = '[' + input + ']';
    input = input.replaceAll (/, *\]/g, ' ]');
    return JSON.parse (input);
}

export function display (sexp) {
    if (typeof sexp === 'string') {
        return sexp;
    } else {
        const parts = sexp.map (display);
        return '<sexp> ' + parts.join(' ')  + '</sexp>';
    }
}

export function displayInRows (sexpList) {
    return sexpList.map ((x) => `<div>${display(x)}</div>`).join('');
}

/// Performs a simple match between pattern and sexp.
export function simpleMatch (pattern, sexp) {
    if (isVar (pattern)) {
        return {success: true, map: new Map([[pattern, sexp]])};
    } else if (isAtom (pattern)) {
        if (eq (pattern, sexp)) {
            return {success: true, map: new Map([])};
        } else {
            return {success: false, cause: `${pattern} -> ${sexp} atom_mismatch`};
        }
    } else {
        // isList
        if (isAtom (sexp)) {
            return {success: false, cause: `${pattern} -> ${sexp} atom`};
        } else if (pattern.length !== sexp.length) {
            return {success: false, cause: `${pattern} -> ${sexp} length_mismatch`};
        } else {
            var totalMatch = {success: true, map: new Map([])};
            for (var i = 0; i < pattern.length; i++) {
                const match = simpleMatch (pattern[i], sexp[i]);
                combineMatch (totalMatch, match);
                if (! totalMatch.success) {
                    return totalMatch;
                }
            }
            return totalMatch;
        }
    }
}

export function combineMatch (oldMatch, newMatch) {
    if (! oldMatch.success) return;
    if (! newMatch.success) {
        oldMatch.success = false;
        oldMatch.cause = newMatch.cause;
        return;
    }
    for (const x of newMatch.map.keys ()) {
        if (oldMatch.map.has(x)) {
            if (eq(oldMatch.map.get(x), newMatch.map.get(x))) { /*good*/ }
            else {
                oldMatch.success = false;
                oldMatch.cause = `${x} -> ${oldMatch.map.get(x)}, ${newMatch.map.get(x)}`;
                return;
            }
        } else {
            oldMatch.map.set(x, newMatch.map.get(x));
        }
    }
}

const folRulesSexp = new Map(parse (data.folRules).map (
    (line) => [line[0], line.slice(1)],
));
console.log ('folRulesSexp', folRulesSexp);

/// If it is a valid derivation from [ins] to [outs] via [rule].
/// Applies to one rule only.
export function isValidStep (rule, ins, outs, subs = null, order = null) {
    try {
        const i = ins, o = outs;
        
        const folRule = folRulesSexp.get(rule) ?? null;
        if (folRule !== null) {
            // Rule defined
            const match = simpleMatch (folRule.slice(1), [ins, outs]);
            return match.success;
        } else if (rule === 'impl-intro') {
            // Rule: from [..., A] |- [B]
            //         to [...] |- [A -> B]
            if (o.length !== 1) return false;
            const [out] = o;
            if (subs?.size !== 1) return false;
            const sub = [... subs.values ()][0];
            return out[0] === '->' &&
                eq (sub.ins, [...i, out[1]]) &&
                eq (sub.outs, [out[2]]);
        } else if (rule === 'join') {
            // TODO - use link order instead of arg order.
            const assumptions = new Map();
            const conclusions = new Map();
            const orderedSubs = order.filter ((x) => subs.has (x));
            for (const subName of orderedSubs) {
                const sub = subs.get(subName);
                // For each subnode, add its assumptions if they're not proven yet.
                for (const iElem of sub.ins) {
                    if (! conclusions.has(str(iElem))) assumptions.set(str(iElem), iElem);
                }
                // And add its conclusions.
                for (const oElem of sub.outs) {
                    conclusions.set(str(oElem), oElem);
                }
            }
            // Derivation is true only if no invalid assumptions are used,
            // and all conclusions are proven.
            const assumptionsValid = [... assumptions.values()].every (
                (a) => ins.some((b) => eq(a, b))
            );
            const conclusionsValid = outs.every ((a) => [... conclusions.values()].some (
                (b) => eq(a, b)
            ));
            return assumptionsValid && conclusionsValid;
        } else if (rule === 'todo') {
            // Permits leaving holes.
            return true;
        } else {
            return false;  // Unrecognized rule.
        }
    } catch (e) {
        return false;
    }
}

/// Parses a module.
export function parseModule (lines) {
    const nodes = new Map();  // Map<name, {ins, outs}>
    const descs = new Map();  // Descendants: Map<name, name[]>
    const ances = new Map();  // Ancestors: Map<name, name[]>
    const derives = new Map();  // Reasons for each step
    const todos = [];  // Statements not proven yet
    // Not storing links for now.

    const errors = [];  // Stores errors

    function addLink (p, c) {
        if (! descs.has(p)) descs.set(p, []);
        descs.get(p).push(c);
        if (! ances.has(c)) ances.set(c, []);
        ances.get(c).push(p);
    }

    for (const line of lines) {
        if (line.length === 0) continue;
        if (line[0] === 'comment') continue;

        if (line[0] === 'node') {
            if (line.length !== 4) {
                errors.push (`Line ${str(line)} length error.`); continue;
            }

            const [_, name, ins, outs] = line;
            if (nodes.has (name)) {
                errors.push (`Name ${name} redefined at ${str(line)}`);
            }

            nodes.set (name, {ins, outs});
        } else if (line[0] === 'derive') {
            if (line.length < 3) {
                errors.push (`Line ${str(line)} too short.`); continue;
            }
            const [_, rule, child, ...parents] = line;
            for (const p of parents) addLink (p, child);
            if (derives.has(child)) {
                errors.push (`${str(line)} is a redefinition.`); continue;
            }
            derives.set (
                child,
                {rule, args: parents},
            );
        } else if (line[0] === 'link') {
            if (line.length !== 5) {
                errors.push (`Line ${str(line)} length error.`); continue;
            }
            addLink (/*parent*/ line[3], /*child*/ line[1]);
            // passing linking for now.
        } else if (line[0] === 'todo') {
            // Something that should be proven later
            if (line.length !== 2) {
                errors.push (`Line ${str(line)} length != 2.`); continue;
            }
            const [_, name] = line;
            if (derives.has(name)) {
                errors.push (`${str(line)} is a redefinition.`); continue;
            }
            derives.set (name, {rule: 'todo', args: []});
            todos.push (name);
        }
    }

    return {
        success: errors.length === 0,
        errors,
        nodes,
        descs,
        ances,
        derives,
        // no links for now
        todos,
        source: lines,
    };
}

/// Performs a toposort (topological sorting) of the nodes of the module.
export function toposort (module) {
    const names = [... module.nodes.keys()];

    const indegree = new Map(
        names.map ((name) =>
            [name, module.ances.get(name)?.length ?? 0])
    );
    
    const starts = names.filter ((name) => indegree.get(name) === 0);
    starts.reverse();

    const order = [];

    while (order.length < names.length && starts.length > 0) {
        const next = starts.pop();
        order.push (next);
        for (const y of (module.descs.get(next) ?? [])) {
            indegree.set(y, indegree.get(y) - 1);
            if (indegree.get(y) <= 0) {
                starts.push (y);
            }
        }
    }

    module.order = order;

    if (order.length === names.length) {
        // Order successful
    } else {
        module.success = false;
        module.errors.push (`Dependency graph has at least one cycle.`);
    }

    return module;
}

export function verifyEachStep (module) {
    for (const name of module.order) {
        const node = module.nodes.get(name);
        const deriv = module.derives.get(name);
        if (deriv === undefined) {
            // Rule does not have valid derivation
            module.success = false;
            module.errors.push (`No derivation for ${name}.`); continue;
        }
        const subs = new Map(deriv.args.map ((name) => [name, module.nodes.get(name)]));
        const isMatch = isValidStep (deriv.rule, node.ins, node.outs, subs, module.order);
        if (!isMatch) {
            module.success = false;
            module.errors.push (`Derivation ${deriv.rule} failed for ${name}.`); continue;
        }
    }

    return module;
}

/// TODO - visualizes the order of a module
/// including the order of blocks, order of statements
export function visualize (module) {
    const ans = [];
    for (const nodeName of module.order) {
        ans.push ([
            nodeName,
            module.nodes.get(nodeName).ins,
            module.nodes.get(nodeName).outs,
        ]);
    }
    return ans;
}

/// If a sequence of items (in correct order) is a valid derivation.
/// Applies to a system.
export function isValidDeriv (lines) {
    const module = parseModule(lines);

    if (!module.success) {
        return module;
    }

    toposort(module);

    if (!module.success) {
        return module;
    }

    verifyEachStep (module);

    console.log(module);

    return module;
}

/// If two sexps are equal.
function eq (a, b) {
    return str(a) === str(b);
}

// Sexp to string.
export function str (obj) {
    if (isAtom(obj)) return obj;
    else return '[' + obj.map (str).join(' ') + ']';
}

function isVar (obj) { return isAtom(obj) && obj.startsWith('_'); }

function isAtom (obj) { return typeof obj === 'string'; }

function isList (obj) { return ! isAtom (obj); }

console.log (
    simpleMatch (
        parse ('[_A _B [and _A _B]]'),
        parse ('[_x:P [-> _x:P _y:P] [and _x:P [-> _x:P _y:P]]]'),
    )
);

/// TODO: type checking

/// TODO: add labels for **statements**, because it becomes hard if they cannot be identified and named.

