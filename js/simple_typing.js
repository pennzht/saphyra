// Typing support for simply-typed lambda calculus.

builtinSymbols = new Map([
  ['and', '<PPP>'],
  ['or', '<PPP>'],
  ['->', '<PPP>'],
  ['false', 'P'],
  ['true', 'P'],
  [false, 'P'],
  [true, 'P'],
  ['forall', '<<OP>P>'],
  ['exists', '<<OP>P>'],
  ['O', 'O'],
  ['S', '<OO>'],
  ['+', '<OOO>'],
  ['*', '<OOO>'],
  ['^', '<OOO>'],
])
// = is polymorphic; needs by-case judgment.

function typeString (atom) {
    if (! isAtomic(atom)) return null;
    if (builtinSymbols.has(atom)) return builtinSymbols.get(atom);

    const colonLocation = atom.lastIndexOf(':');
    if (colonLocation < 0) return null;

    return atom.slice(colonLocation+1);
}

function typeSignature (atom) {
    const ts = typeString(atom);
    if (!ts) return ts;

    const stack = [[]];
    for (const char of [...ts]) {
        if (char === '<') {
            stack.push([]);
        } else if (char === '>') {
            const last = stack.pop();
            if (stack.length <= 0) {
                return null;
            } else {
                stack[stack.length-1].push(last);
            }
        } else {
            stack[stack.length-1].push(char);
        }
    }

    while(stack.length > 1) {
        const last = stack.pop();
        stack[stack.length-1].push(last);
    }
    return stack[0][0];
}

// TODO - use actual type checking.
function wellTyped (sexp) {
    if (isAtom(sexp)) {
        return ['true', 'false'].includes (sexp) || isVar(sexp);
    } else if (sexp.length === 3) {
        const [head, a, b] = sexp;
        return ['and', 'or', '->'].includes (head) && [a, b].every (wellTyped);
    }
    return false;
}
