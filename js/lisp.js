// A tiny lisp for scripting purposes.
// Emulate a stack to avoid infinite loops.

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

// Stack:
// [frame ...]
// Each frame:
// {type: 'expr', form, env} - before expansion
// {type: 'fnop', args: value[], subindex} - during expansion
    // Notice! For a fnop like (+ x y), args is [+, x, y], because the function head has to be evaluated too.
// {type: 'literal', form} - after expansion
// {type: 'closure', form, env} - lambda closure, cannot expand further

function stepStack (stack) {
    const tail = stack.pop ();
    if (tail.type === 'expr') {
        // TODO - Judge type
    } else if (tail.type === 'fnop') {
        if (tail.subindex >= tail.args.length) {
            // Args finished operating; go to function
        } else {
            stack.push (tail);
            stack.push (tail.args[tail.subindex]);
        }
    } else if (tail.type === 'literal' || tail.type === 'closure') {
        // Done, go to previous one
        if (stack.length > 0) {
            const parent = stack[stack.length - 1];
            if (parent.type !== 'fnop') console.log ('Error! Incorrect parent.type', parent.type, stack);
            parent.args[parent.subindex] = tail;
            parent.subindex ++;
        } else {
            return 'done';
        }
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
