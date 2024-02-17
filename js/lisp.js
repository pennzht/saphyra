// A tiny lisp for scripting purposes.
// Emulate a stack to avoid infinite loops.

// TODO - finish language implementation.

const arity = {
    // Binary
    '+': 2,
    '-': 2,
    '*': 2,
    '/': 2,
    '^': 2,
    '%': 2,
    '>': 2,
    '<': 2,
    '=': 2,
    '>=': 2,
    '<=': 2,
    '!=': 2,
    'b<<': 2,
    'b>>': 2,
    'b&': 2,
    'b|': 2,
    'b^': 2,
    // Unary
    'b~': 1,
    'neg': 1,
}

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
                frame.push ({type: 'literal', form: new BigInt(form)});
            } else if (form.startsWith ('#')) {  // Symbol
                frame.push ({type: 'literal', form});
            } else {
                // Look up in environment.
                const value = findVal (env, form);
            }
        } else if (form.length <= 0) {
            stack.push ({type: 'literal', []});
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
            // TODO: function application.
        } else {
            stack.push (frame);
            stack.push ({type: 'expr', form: form[subindex], env});
        }
    } else if (type === 'macro') {
        const head = form[0];
        // TODO - discussion by cases
    } else if (type === 'literal' || type === 'closure') {
        // Done, go to previous one
        if (stack.length > 0) {
            const parent = stack[stack.length - 1];
            if (parent.type !== 'fnop' || 'macro') {
                console.log ('Error! Incorrect parent.type', parent.type, stack);
                return 'done';
            }
            parent.args[parent.subindex] = frame;
            parent.subindex ++;
        } else {
            return 'done';
        }
    } else if (type === 'error') {
        return 'done';
    } else {
        console.log ('Error! Unrecognized frame type.');
    }
}

function evaluate (sexp) {
    const stack = [{
        type: 'expr',
        form: sexp,
        env: [],
    }];
    while (true) {
        const status = stepStack (stack);
        if (status === 'done') break;
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

function findVal (env, atom) { return env.get (atom) ?? null; }

function withVal (env, key, val) {
    const ans = new Map(env);
    ans.set(key, val);
    return ans;
}
