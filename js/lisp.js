// A tiny lisp for scripting purposes.
// Emulate a stack to avoid infinite loops.

// TODO - finish language implementation.

// Valid types
/*
    tagged:
    expr  fnop  macro  (error)

    native:
    bigint  atom  list  map  bool
*/

const arity = {
    // Binary
    '+': 2, '-': 2, '*': 2, '/': 2, '^': 2, '%': 2,
    '>': 2, '<': 2, '=': 2, '>=': 2, '<=': 2, '!=': 2,
    'b<<': 2, 'b>>': 2, 'b&': 2, 'b|': 2, 'b^': 2,
    // Unary
    'b~': 1, 'neg': 1,
    // List-like
    'range': 2, 'enum': 1, 'map': 2, 'filter': 2, 'foldl': 3,
    'get': 2, 'set': 3, 'joinall': 1, 'size': 1,
    'list:': 'VARIABLE',  // list constructor
    // Map-like
    'map->list': 1, 'list->map': 1,
    'map:': 'VARIABLE',  // map constructor
    // Symbols
    'sym->str': 1, 'str->sym': 1,
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
    // List-like
    'range': (a, b) => {
        const ans = [];
        for (let i = a; i < b; i++) ans.push(i);
        return ans;
    },
    'enum': (list) => {
        const ans = [];
        for (let i = 0; i < list.length; i++) ans.push ([[i, list[i]]]);
    },
    // TODO: fix all things with functions.
    'map': (f, list) => list.map(f),
    'filter': (f, list) => list.filter(f),
    'foldl': (f, seed, list) => {
        for (const y of list) seed = f(seed, y);
        return seed;
    },
    'get': (ind, list) => {
        if (list instanceof Array) {
            return list[ind];
        } else if (list instanceof Map) {
            return list.get(ind);
        }
        throw Exception (`Cannot get index of ${list}`);
    },
    'set': (ind, elem, list) => {
        if (list instanceof Array) {
            if (ind >= list.length) {
                return list.concat([elem]);
            } else {
                const ans = [...list];
                ans[ind] = elem;
                return ans;
            }
        } else if (list instanceof Map) {
            const ans = new Map(list);
            ans.set(ind, elem);
            return ans;
        }
        throw Exception (`Cannot get index of ${list}`);
    },
    'joinall': (listOfLists) => {
        const ans = [];
        for (const list of listOfLists) {
            for (const y of list) {
                ans.push (y);
            }
        }
        return ans;
    },
    'size': (list) => {
        if (list instanceof Array) {
            return list.length;
        } else if (list instanceof Map) {
            return list.size;
        }
        throw Exception (`${list} is not a collection`);
    },
    'list:': (...args) => args,
    'map->list': (m) => [...m],
    'list->map': (l) => new Map(l),
    'map:': (...args) => {
        const ans = new Map();
        for (var i = 0; i < args.length; i += 2) {
            ans.set(args[i], args[i+1]);
        }
        return ans;
    },
    'sym->str': (sym) => [...sym].map((x) => x.codePointAt(0)),
    'str->sym': (str) => str.map(String.fromCodePoint).join(''),
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
    const type = valType(frame), form = frame.form, env = frame.env, subindex = frame.subindex;
    if (type === 'expr') {
        if (! Array.isArray(form)) {
            // Atom
            if (['true', 'false'].includes(form)) {
                stack.push (form === 'true');
            } else if (form.match (/^[+-]?[0-9]+$/)) {  // Number
                stack.push (BigInt(form));
            } else if (form.startsWith ('#')) {  // Symbol
                stack.push (form);
            } else if (builtinFunctions.has (form)) {
                stack.push ({type: 'closure', form, env: new Map()});
            } else {
                // Look up in environment.
                const value = findVal (env, form);
            }
        } else if (form.length <= 0) {
            stack.push ([]);
        } else {
            const head = form[0];
            if (['if', 'let', 'letrec', 'and', 'or', "'"].includes (head)) {
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
                const answer = operators[head.form](... form.slice(1));
                stack.push (answer);
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
            if (form.length === 2) {
                stack.push ({type: 'expr', form: form[1], env});
            } else if (subindex === 1 && isResolved(valType(form[1]))) {
                // Cond
                if (form[1].form) {
                    // Evaluates to val1
                    stack.push ({type: 'expr', form: form[2], env});
                } else {
                    // Evaluates to rest
                    stack.push ({type: 'expr', form: ['if'].concat(form.slice(3)), env});
                }
            } else {
                // Unevaluated yet
                stack.push (frame);
                stack.push ({type: 'expr', form: form[1], env});
            }
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
        } else if (head === "'") {
            stack.push (form[1]);
        } else {
            throw new Exception ('Unrecognized macro.');
        }
    } else if (isResolved(type)) {
        // Done, go to previous one
        const value = frame;
        if (stack.length > 0) {
            const parent = stack[stack.length - 1];
            if (! ['fnop', 'macro'].includes(parent.type)) {
                console.log ('Error! Incorrect parent.type', parent.type, stack);
                return 'done';
            }
            parent.form[parent.subindex] = value;
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
        if (status === 'done') break;
        limit--;
    }
    console.log (JSON.stringify(stack, visualizer, 2));
    console.log ('================\n')
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
    return (typeof value === 'bigint' ? 'bigint:'+value.toString() :
            value instanceof Map ? 'map:'+JSON.stringify([...value], visualizer) :
            value);
}

function main () {
    evaluate (['+', '3', '4']);
    evaluate (['*', ['+', '1', '2'], ['-', '9', '3']]);
    evaluate (['set', '1', '666', ['list:', '333', '444', '555']]);
    evaluate (["'", 'a']);
    evaluate (['map:', ["'", 'a'], '3', ["'", 'b'], '4']);
    evaluate ([
        'set', ["'", 'b'], ["'", 'red'],
        ['map:', ["'", 'a'], '3', ["'", 'b'], '4']]);
    evaluate (['if', 'false', '3', 'false', ['+', '3', '1'], '5']);
}

// Returns the type of a value.
function valType (val) {
    if (typeof val.type === 'string') return val.type;
    if (typeof val === 'bigint') return 'bigint';
    if (typeof val === 'string') return 'atom';
    if (val instanceof Array) return 'list';
    if (val instanceof Map) return 'map';
    if (val === true || val === false) return 'bool';
    throw new Exception (`Unrecognized type ${val}`);
}

function isResolved (type) {
    return ['closure', 'bigint', 'atom', 'list', 'map', 'bool'].includes (type);
}

main ();
