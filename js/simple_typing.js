// Typing support for simply-typed lambda calculus.

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
