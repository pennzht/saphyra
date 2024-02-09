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

// Stack:
// [frame ...]
// Each frame:
// {type: 'expr', form, env} - before expansion
// {type: 'fnop', args: value[], subindex} - during expansion
    // Notice! For a fnop like (+ x y), args is [+, x, y], because the function head has to be evaluated too.
// {type: 'macro', args: value[], subindex} - if, let, letrec
// {type: 'literal', form} - after expansion
// {type: 'closure', form, env} - lambda closure, cannot expand further

function stepStack (stack) {
    const frame = stack.pop ();
    if (frame.type === 'expr') {
        if (frame.form.length <= 0) {
            frame.push ({type: 'literal', []});
        } else if (frame.form.length === 4 && frame.form[0] === 'if') {
            frame.push ({type: 'macro', args: frame.form, 1});
        } else {
            // TODO ...
        }
    } else if (frame.type === 'fnop') {
        if (frame.subindex >= frame.args.length) {
            // Args finished operating; go to function
        } else {
            stack.push (frame);
            stack.push (frame.args[frame.subindex]);
        }
    } else if (frame.type === 'macro') {
        // TODO - handle macros
    } else if (frame.type === 'literal' || frame.type === 'closure') {
        // Done, go to previous one
        if (stack.length > 0) {
            const parent = stack[stack.length - 1];
            if (parent.type !== 'fnop') console.log ('Error! Incorrect parent.type', parent.type, stack);
            parent.args[parent.subindex] = frame;
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
