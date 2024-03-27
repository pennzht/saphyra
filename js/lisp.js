// A tiny lisp for scripting purposes. Sync with lisp.js
// Emulate a stack to avoid infinite loops.

// TODO - finish language implementation.

// Valid types
/*
    tagged:
    expr  fnop  macro  (error)

    native:
    bigint  atom  list  map  bool  null
*/

const arity = {
    // Binary
    '+': 2, '-': 2, '*': 2, '/': 2, '^': 2, '%': 2,
    '>': 2, '<': 2, '=': 2, '>=': 2, '<=': 2, '!=': 2,
    'b<<': 2, 'b>>': 2, 'b&': 2, 'b|': 2, 'b^': 2,
    // Unary
    'b~': 1, 'neg': 1,
    // List-like
    'range': 2, 'enum': 1, /* 'map': 2, 'filter': 2, 'foldl': 3, */
    'get': 2, 'set': 3, 'joinall': 1, 'size': 1, 'slice': 3,
    'list:': 'VARIABLE',  // list constructor
    // Map-like
    'map->list': 1, 'list->map': 1,
    'map:': 'VARIABLE',  // map constructor
    // Symbols
    'sym->str': 1, 'str->sym': 1,
    'atom?': 1, 'list?': 1, 'map?': 1,
    'list->cons': 1, 'cons->list': 1,
};

function numericFunction(fn) {
    return (...args) => {
        if (args.every((x) => typeof x === 'bigint')) {
            return fn(...args);
        } else {
            return '#err/needs-numeric-inputs';
        }
    };
}

function atomicFunction(fn) {
    return (...args) => {
        if (args.every(isAtomic)) {
            return fn(...args);
        } else {
            return '#err/needs-atomic-inputs';
        }
    };
}

const operators = {
    // Binary
    '+': numericFunction((a, b) => a + b),
    '-': numericFunction((a, b) => a - b),
    '*': numericFunction((a, b) => a * b),
    '/': numericFunction((a, b) => b === 0n ? '#err/div-0' : a / b),
    '%': numericFunction((a, b) => b === 0n ? '#err/mod-0' : a % b),
    '^': numericFunction((a, b) => a ** b),
    '>': atomicFunction((a, b) => a > b),
    '<': atomicFunction((a, b) => a < b),
    '=': atomicFunction((a, b) => a === b),
    '>=': atomicFunction((a, b) => a >= b),
    '<=': atomicFunction((a, b) => a <= b),
    '!=': atomicFunction((a, b) => a !== b),
    'b<<': numericFunction((a, b) => a << b),
    'b>>': numericFunction((a, b) => a >> b),
    'b&': numericFunction((a, b) => a & b),
    'b|': numericFunction((a, b) => a | b),
    'b^': numericFunction((a, b) => a ^ b),
    // Unary
    'b~': numericFunction((a) => ~a),
    'neg': numericFunction((a) => -a),
    // List-like
    'range': numericFunction((a, b) => {
        const ans = [];
        for (let i = a; i < b; i++) ans.push(i);
        return ans;
    }),
    'enum': (list) => {
        if (! isList(list)) return '#err/enum-non-list';
        const ans = [];
        for (let i = 0; i < list.length; i++) ans.push ([[i, list[i]]]);
    },
    // TODO: fix all things with functions.
    /* 'map': (f, list) => list.map(f),
    'filter': (f, list) => list.filter(f),
    'foldl': (f, seed, list) => {
        for (const y of list) seed = f(seed, y);
        return seed;
    }, */
    'get': (ind, list) => {
        if (list instanceof Array) {
            return list[ind] ?? null;
        } else if (list instanceof Map) {
            return list.get(ind) ?? null;
        } else {
            return '#err/attempted-get';
        }
    },
    'set': (ind, elem, list) => {
        if (list instanceof Array) {
            if (ind >= Number(list.length)) {
                return list.concat([elem]);
            } else if (ind < 0n) {
                return [elem].concat(list);
            } else {
                const ans = [...list];
                ans[ind] = elem;
                return ans;
            }
        } else if (list instanceof Map) {
            const ans = new Map(list);
            ans.set(ind, elem);
            return ans;
        } else {
            return '#err/attempted-set';
        }
    },
    'slice': (from, to, list) => {
        if (from instanceof BigInt && to instanceof BigInt && isList(list))
            return list.slice(Number(from), Number(to));
        else return '#err/attempted-slice';
    },
    'joinall': (listOfLists) => {
        if (! isList(listOfLists)) return '#err/attempted-joinall';
        const ans = [];
        for (const list of listOfLists) {
            if (isList(list)) for (const y of list) {
                ans.push (y);
            }
        }
        return ans;
    },
    'size': (list) => {
        if (list instanceof Array) {
            return BigInt(list.length);
        } else if (list instanceof Map) {
            return BigInt(list.size);
        } else return '#err/sizeof-non-collection';
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
    'sym->str': (sym) => [...sym].map((x) => BigInt(x.codePointAt(0))),
    'str->sym': (str) => str.map((x) => String.fromCodePoint(Number(x))).join(''),
    'list->cons': (list) => {
        if (! isList(list)) return '#err/list->cons-non-list';
        let ans = null;
        for (let i = list.length - 1; i >= 0; i--) ans = [list[i], ans];
        return ans;
    },
    'cons->list': (cons) => {
        let ans = [], head = cons;
        while(isList(head) && head.length === 2) {
            ans.push(head[0]);
            head = head[1];
        }
        return ans;
    },
    'atom?' : isAtomic,
    'list?' : isList,
    'map?' : isMap,
};

const builtinFunctions = new Set(Object.keys(operators));

// Alternate frame structure:
// [type form env subindex]
// env may be null for literals
// subindex may be null for those that won't matter

// Stack:
// [frame ...]
// Each frame:
// [expr form env -] :: before evaluation
// [fnop form env index] :: during evaluation
    // Notice! For a fnop like (+ x y), args is [+, x, y], because the function head has to be evaluated too.
// [macro form env index] - if, let, letrec, and, or
// [literal form - -] - after expansion
// [closure form env -] - lambda closure, cannot expand further
// [error reason - -] - error, stopping the evaluation
//
// General stack structure:
// [fnop/macro . fnop/macro . . . fnop/macro . <any>]

/*
Structure of a general program.
atom : atomic literals
(fn ...args) : function application
(apply fn list) : apply list
(list ...args) : list generation
(' x) : literal
([and, or] ...args) : boolean operation
(if p1 a1 p2 a2 p3 a3 ... pn an xn) : cond
(let x1 y1 x2 y2 ... xn yn body) : let
(letrec x1 f1 x2 f2 ... xn fn body) : let recursive
(: arglist body) : function with argument list
(get nth list), (set nth list obj) : list operation

Ideally built-in things: map, filter, fold(l/r)
*/

function stepStack (stack) {
    const frame = stack.pop ();
    // if (valType(frame) === null) {stack.push(frame); return;}
    const type = valType(frame);
    let form = null, env = null, subindex = null;
    if (isCompoundFrame(frame)) {
        form = frame.form; env = frame.env; subindex = frame.subindex;
    }
    // Handle each case.
    if (type === 'expr') {
        if (! isList(form)) {
            // Atom
            if (typeof form !== 'string') {
                // Literal
                stack.push (form);
            } else if (['true', 'false'].includes(form)) {
                stack.push (form === 'true');
            } else if (form.match (/^[+-]?[0-9]+$/)) {  // Number
                stack.push (BigInt(form));
            } else if (form.startsWith ('#')) {  // Symbol
                stack.push (form);
            } else if (builtinFunctions.has (form)) {
                stack.push (form);  // Built-in function.
            } else {
                // Look up in environment.
                if (! env.has(form)) {
                    stack.push(frame);
                    stack.push('#err/var-unfound');
                } else {
                    stack.push (env.get(form));
                }
            }
        } else if (form.length <= 0) {
            stack.push ([]);
        } else {
            const head = form[0];
            if (['if', 'let', "'"].includes (head)) {
                // Macro.
                stack.push ({type: 'macro', form: [... form], env, subindex: 1});
            } else if ([':'].includes(head)) {
                // Function definition.
                const [_colon, fnvars, fnbody, fncaptures] = form;
                const newEnv = new Map();
                for (const varName of (fncaptures || [])) {
                    newEnv.set(varName, env.get(varName));
                }
                stack.push ([_colon, fnvars, fnbody, newEnv]);
            } else {
                // Function application.
                stack.push ({type: 'fnop', form: [... form], env, subindex: 0});
            }
        }
    } else if (type === 'fnop') {
        if (subindex >= form.length) {
            const head = form[0];
            if (builtinFunctions.has(head)) {
                const answer = operators[head](... form.slice(1));
                if (isErr(answer)) stack.push(frame);
                stack.push (answer);
            } else if (head[0] === ':' && head.length >= 3) {
                // Custom-defined function
                const [_colon, fnvars, fnbody, fncaptures] = head;
                const env = fncaptures ? new Map(fncaptures) : new Map();
                for (var i = 0; i < fnvars.length; i++) {
                    env.set(fnvars[i], form[i]);
                }
                stack.push({type: 'expr', form: fnbody, env});
            }
        } else {
            const subform = frame.form[subindex];
            frame.form[subindex] = '.wait';
            stack.push (frame);
            stack.push ({type: 'expr', form: subform, env});
        }
    } else if (type === 'macro') {
        const head = form[0];
        if (head === 'if') {
            if (form.length !== 4) {
                stack.push(frame);
                stack.push('#err/if-length-error');
                return 'done';
            }
            if (subindex === 2) {
                // Cond
                if (form[1]) {
                    // Evaluates to val1
                    stack.push ({type: 'expr', form: form[2], env});
                } else {
                    // Evaluates to rest
                    stack.push ({type: 'expr', form: form[3], env});
                }
            } else {
                // Unevaluated yet
                stack.push (frame);
                stack.push ({type: 'expr', form: form[1], env});
            }
        } else if (head === 'let') {
            // (let x y expr)
            if (form.length !== 4) {
                stack.push(frame);
                stack.push('#err/let-length-error');
                return 'done';
            }
            const [_, x, y, expr] = form;
            if (subindex === 1) {
                // compute y first
                stack.push({type, form, env, subindex: 2});
                stack.push({type: 'expr', form: y, env, subindex: 0});
            } else if (subindex === 2) {
                // can move forward
                const nextFrame = {type: 'expr', form: expr, env: withVal(env, x, y)};
                stack.push(nextFrame);
            }
        } else if (head === "'") {
            if (form.length !== 2) {
                stack.push(frame);
                stack.push("#err/'-length-error");
                return 'done';
            }
            stack.push (form[1]);
        } else {
            stack.push(frame); stack.push("#err/unrecognized-macro");
            return 'done';
        }
    } else if (isErr(frame)) {
        stack.push(frame);
        return 'done';
    } else if (isLiteralFrame(type)) {
        // Done, go to previous one
        const value = frame;
        if (stack.length > 0) {
            const parent = stack[stack.length - 1];
            if (! ['fnop', 'macro'].includes(parent.type)) {
                throw new Error ('Error! Incorrect parent.type', parent.type, stack);
                return 'done';
            }
            parent.form[parent.subindex] = value;
            if (parent.type === 'fnop' || parent.form[0] === 'if') parent.subindex ++;
        } else {
            stack.push (frame);
            return 'done';
        }
    } else if (type === 'error') {
        return 'done';
    } else {
        throw new Error ('Error! Unrecognized frame type.');
    }
}

function evaluate (sexp, options) {
    options = options || {};
    var limit = options.limit || 2000;
    const showSteps = [true, false].includes(options.showSteps) ? options.showSteps : true;
    const stack = [{
        type: 'expr',
        form: sexp,
        env: options.env || new Map(),
    }];
    while (limit > 0) {
        const status = stepStack (stack);
        if (status === 'done') break;
        limit--;

        if (showSteps) {
            // console.log (dispStack(stack));
            // console.log (elem('hr'));
        }
    }
    return stack;
}

function isAtom (obj) { return typeof obj === 'string'; }

function isList (obj) { return obj instanceof Array; }

function isMap (obj) { return obj instanceof Map; }

function isVar (obj) { return isAtom(obj) && obj.startsWith('_'); }

function isSym (obj) { return isAtom(obj) && obj.startsWith('#'); }

function isErr (obj) { return isAtom(obj) && obj.startsWith('#err/'); }

function findVal (env, atom) { return env.get (atom); }

function isAtomic (val) {
    return ! (isList(val) || isMap(val));
}

function isCompoundFrame (val) {
    return ['macro', 'fnop', 'expr'].includes(valType(val));
}

function isLiteralFrame (val) { return ! isCompoundFrame(val); }

function isComplete (stack) {
    return stack.length === 1 && (stack[0].type || null === null);
}

function withVal (env, key, val) {
    const ans = new Map(env);
    ans.set(key, val);
    return ans;
}

// Unused.
function visualizer (key, value) {
    return (typeof value === 'bigint' ? 'bigint:'+value.toString() :
            value instanceof Map ? 'map:'+JSON.stringify([...value], visualizer) :
            value);
}

// Returns the type of a value.
function valType (val) {
    if ([true, false, null, undefined].includes(val)) {
        return 'special';
    } else if (typeof val === 'bigint') {
        return 'bigint';
    } else if (typeof val === 'string') {
        return 'atom';
    } else if (val instanceof Array) {
        return 'list';
    } else if (val instanceof Map) {
        return 'map';
    } else if (typeof val === 'object') {
        if (typeof val.type === 'string') return val.type;
    } else {
        throw new Error (`Unrecognized type ${val}: ${typeof val}`);
    }
}
