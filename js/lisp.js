// A tiny lisp for scripting purposes.
// Emulate a stack to avoid infinite loops.

// TODO - finish language implementation.

const arity = {
    // Binary
    '+': 2, '-': 2, '*': 2, '/': 2, '^': 2, '%': 2,
    '>': 2, '<': 2, '=': 2, '>=': 2, '<=': 2, '!=': 2,
    'b<<': 2, 'b>>': 2, 'b&': 2, 'b|': 2, 'b^': 2,
    // Unary
    'b~': 1, 'neg': 1,
    // List-like
    'range': 2, 'enum': 1, 'map': 2, 'filter': 2, 'foldl': 3, 'foldr': 3,
    'get': 2, 'set': 3, 'joinall': 2, 'size': 1,
    'list:': 'VARIABLE',  // list constructor
    // Map-like
    'map->list': 1, 'list->map': 1,
    'map:': 'VARIABLE',  // map constructor
};

const operators = {
    // Binary
    '+': ((a, b) => a + b),
    '-': ((a, b) => a - b),
    '*': ((a, b) => a * b),
    '/': ((a, b) => a / b),
    '^': ((a, b) => a ** b),
    '%': ((a, b) => a % b),
    '>': ((a, b) => a > b),
    '<': ((a, b) => a < b),
    '=': ((a, b) => a == b),
    '>=': ((a, b) => a >= b),
    '<=': ((a, b) => a <= b),
    '!=': ((a, b) => a != b),
    'b<<': ((a, b) => a << b),
    'b>>': ((a, b) => a >> b),
    'b&': ((a, b) => a & b),
    'b|': ((a, b) => a | b),
    'b^': ((a, b) => a ^ b),
    // Unary
    'b~': ((a) => ~a),
    'neg': ((a) => -a),
};

const builtinFunctions = new Set(Object.keys(operators));

// Stack:
// [frame ...]
// Each frame:
// {type: 'expr', form, env} - before expansion
// {type: 'fnop', form: value[], env, subindex} - during expansion
    // Notice! For a fnop like (+ x y), args is [+, x, y], because the function head has to be evaluated too.
// {type: 'macro', form: value[], env, subindex} - if, let, letrec, and, or
// {type: 'literal', form} - after expansion
// {type: 'closure', form, env} - lambda closure, cannot expand further
// {type: 'error', form, env, reason} - error, stopping the evaluation
//
// General stack structure:
// [fnop/macro . fnop/macro . . . fnop/macro . expr/literal/closure/error/fnop/macro]

function stepStack (stack) {
    const frame = stack.pop ();
    const type = frame.type, form = frame.form, env = frame.env, subindex = frame.subindex;
    if (type === 'expr') {
        if (! isList(form)) {
            // Atom
            if (form.match (/^[+-]?[0-9]+$/)) {  // Number
                stack.push ({type: 'literal', form: BigInt(form)});
            } else if (form.startsWith ('#')) {  // Symbol
                stack.push ({type: 'literal', form});
            } else if (builtinFunctions.has (form)) {
                stack.push ({type: 'closure', form, env: new Map()});
            } else {
                // Look up in environment.
                const value = findVal (env, form);
            }
        } else if (form.length <= 0) {
            stack.push ({type: 'literal', form: []});
        } else {
            const head = form[0];
            if (['if', 'let', 'letrec', 'and', 'or'].includes (head)) {
                // Macro.
                stack.push ({type: 'macro', form, env, subindex: 1});
            } else if ([':'].includes(head)) {
                // Function definition.
                stack.push ({type: 'closure', form, env});
            } else {
                // Function application.
                stack.push ({type: 'fnop', form, env, subindex: 0});
            }
        }
    } else if (type === 'fnop') {
        if (subindex >= form.length) {
            const head = form[0];
            if (head.type === 'closure' && builtinFunctions.has(head.form)) {
                const answer = operators[head.form](... (form.slice(1).map((x) => x.form)));
                stack.push ({type: 'literal', form: answer});
            }
        } else {
            stack.push (frame);
            stack.push ({type: 'expr', form: form[subindex], env});
        }
    } else if (type === 'macro') {
        const head = form[0];
        if (head === 'if') {
            // TODO - general cond situation
            // (if cond1 val1 cond2 val2 ... condN valN valEnd)
        } else if (head === 'let') {
            // TODO
            // (let x1 y1 x2 y2 x3 y3 ... xN yN expr)
        } else if (head === 'letrec') {
            // TODO
            // (letrec x1 y1 x2 y2 x3 y3 ... xN yN expr)
        } else if (head === 'and') {
            // TODO
            // (and a1 a2 a3 ... aN)
        } else if (head === 'or') {
            // TODO
            // (or a1 a2 a3 ... aN)
        } else {
            throw new Exception ('Unrecognized macro.');
        }
    } else if (type === 'literal' || type === 'closure') {
        // Done, go to previous one
        if (stack.length > 0) {
            const parent = stack[stack.length - 1];
            if (! ['fnop', 'macro'].includes(parent.type)) {
                console.log ('Error! Incorrect parent.type', parent.type, stack);
                return 'done';
            }
            parent.form[parent.subindex] = frame;
            if (parent.type === 'fnop') parent.subindex ++;
        } else {
            stack.push (frame);
            return 'done';
        }
    } else if (type === 'error') {
        return 'done';
    } else {
        console.log ('Error! Unrecognized frame type.');
    }
}

function evaluate (sexp, limit=1000) {
    const stack = [{
        type: 'expr',
        form: sexp,
        env: new Map(),
    }];
    while (limit > 0) {
        const status = stepStack (stack);
        console.log (JSON.stringify(stack, visualizer, 2));
        console.log ('================\n')
        if (status === 'done') break;
        limit--;
    }
    return stack;
}

function isComplete (stack) {
    return stack.length === 1 && (stack[0].type === 'literal'
                                  || stack[0].type === 'closure');
}

function isVar (obj) { return isAtom(obj) && obj.startsWith('_'); }

function isAtom (obj) { return typeof obj === 'string'; }

function isList (obj) { return ! isAtom (obj); }

function findVal (env, atom) { return env.get (atom); }

function withVal (env, key, val) {
    const ans = new Map(env);
    ans.set(key, val);
    return ans;
}

function visualizer (key, value) {
    return typeof value === 'bigint' ? 'bigint:'+value.toString() : value;
}

function main () {
    evaluate (['+', '3', '4']);
    evaluate (['*', ['+', '1', '2'], ['-', '9', '3']]);
}

main ();
