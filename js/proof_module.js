const folRulesSexp = new Map(parse (folRules).map (
    (line) => [line[0], line.slice(1)],
));
console.log ('folRulesSexp', folRulesSexp);

// Sync with axioms.js
const folAxioms = deepParse(folRules);

/// If it is a valid derivation from [ins] to [outs] via [rule].
/// Applies to one rule only.
function isValidStep (rule, ins, outs, subs = null, order = null) {
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
function parseModule (lines) {
    const nodes = new Map();  // Map<name, {ins, outs}>
    const descs = new Map();  // Descendants: Map<name, name[]>
    const ances = new Map();  // Ancestors: Map<name, name[]>
    const derives = new Map();  // Reasons for each step
    const uplink = new Map();  // Parent (encapsulated) of each node; must be unique if it exists
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
            for (const stmt of ins.concat(outs)) {
                if (! wellTyped(stmt)) {
                    errors.push (`Statement ${str(stmt)} is not well-typed.`);
                }
            }

            nodes.set (name, {ins, outs});
        } else if (line[0] === 'derive') {
            if (line.length < 3) {
                errors.push (`Line ${str(line)} too short.`); continue;
            }
            const [_, rule, outer, ...inners] = line;
            for (const i of inners) {
                addLink (i, outer);
                if (uplink.has (i)) {
                    errors.push (`${i} has redefined outer.`);
                }
                uplink.set (i, outer);
            }
            if (derives.has(outer)) {
                errors.push (`${str(line)} is a redefinition.`); continue;
            }
            derives.set (
                outer,
                {rule, args: inners},
            );
            if (rule === 'todo') todos.push (outer);
        } else if (line[0] === 'link') {
            if (line.length !== 5) {
                errors.push (`Line ${str(line)} length error.`); continue;
            }
            addLink (/*parent*/ line[3], /*child*/ line[1]);
            // passing linking for now.
        } else {
            errors.push (`Unrecognized line ${str(line)}`);
        }
    }

    // Ref: general module structure
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
        uplink,
        order: [],  // not defined yet
    };
}

/// Performs a toposort (topological sorting) of the nodes of the module.
function toposort (module) {
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

function verifyEachStep (module) {
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
function visualize (module) {
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
function isValidDeriv (lines) {
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

/// TODO: type checking

/// TODO: add labels for **statements**, because it becomes hard if they cannot be identified and named.

function wellTyped (sexp) {
    if (isAtom(sexp)) {
        return ['true', 'false'].includes (sexp) || isVar(sexp);
    } else if (sexp.length === 3) {
        const [head, a, b] = sexp;
        return ['and', 'or', '->'].includes (head) && [a, b].every (wellTyped);
    }
    return false;
}
