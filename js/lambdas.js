// Anything match- and lambda-related.

// TODO:
// * lambda expressions
// * alpha-conversion
// * beta-reduction
// * beta(!)-expansion

// Borrow from lambdas.py

function isLambda(sexp) {
    return simpleMatch([':', '_A', '_B'], sexp).success && isVar(sexp[1]);
}

function walkSexp(sexp, prefixQ) {
    const prefix = prefixQ || [];
    if (isLambda(sexp)) {
        return [[sexp, prefix], ...walkSexp(sexp[2], prefix.concat([2]))];
    } else if (isList(sexp)) {
        const ans = [[sexp, prefix]];
        for (let i = 0; i < sexp.length; i++) {
            ans.push(... walkSexp(sexp[i], prefix.concat([i])));
        }
        return ans;
    } else {
        return [[sexp, prefix]];
    }
}

function subByPath(sexp, path) {
    if (eq([], path)) return sexp;
    return subByPath(sexp[path[0]], path.slice(1));
}

function replaceByPath(sexp, path, target) {
    if (eq([], path)) return target;

    const ans = [...sexp];
    ans[path[0]] = replaceByPath(ans[path[0]], path.slice(1), target);
    return ans;
}

function getAllAtoms(sexp) {
    if (isAtomic(sexp)) return [sexp];

    const ans = [];
    for (const sub of sexp) ans.push(...getAllAtoms(sub));
    return ans;
}

function getAllVars(sexp) {
    return getAllAtoms(sexp).filter(isVar);
}

function getFreeVars(sexp) {
    if (isLambda(sexp)) {
        const [_, varName, body] = sexp;
        const ans = new Set(getAllVars(body));
        ans.delete(varName);
        return [...ans];
    } else if (isList(sexp)) {
        const ans = [];
        for (const sub of sexp) ans.push(...getFreeVars(sub));
        return ans;
    } else if (isVar(sexp)) {
        return [sexp];
    } else {
        return [];
    }
}

function genVar(avoid, ts) {
    for (let i = 0; i <= avoid.length; i++) {
        const contender = `_v${i}:${ts}`;
        if (! avoid.includes(contender)) return contender;
    }
}

if (false) {
  console.log(getAllVars(parseOne(`
      (forall (: _x:O [= _x:O (+ O _x:O)]))
    `)));
  console.log(getFreeVars(parseOne(`
      (forall (: _x:O [= _x:O (+ O _x:O)]))
    `)));
  console.log(getFreeVars(parseOne(`
      (forall (: _x:O [= _x:O (+ _y:O _x:O)]))
    `)));
  console.log(genVar(['_v0:O', '_v1:O', '_v5:O'], 'O'));
}

// Next: def lambda_b_reduce ...
