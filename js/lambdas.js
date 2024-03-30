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

function lambdaReduce (lam, arg) {
    if (! isLambda(lam)) {
        return null;
    }
    const [_, v, body] = lam;
    return lambdaReplace (body, v, arg);
}

function lambdaReplace (sexp, v, arg) {
    if (isLambda (sexp)) {
        // Lambda. Beware variable capture.
        let innerVar = sexp[1], innerExp = sexp[2];
        if (eq(innerVar, v)) return sexp;  // Variable shadowing.
        if (getFreeVars(arg).includes(innerVar)) {
            // Replace.
            const newVar = genVar(
                getFreeVars(arg).concat(getAllVars(sexp)),
                typeString(innerVar),
            );
            innerVar = newVar;
            innerExp = lambdaReplace(innerExp, innerVar, newVar);
        }
        return [':', innerVar, lambdaReplace(innerExp, v, arg)];
    } else if (isList(sexp)) {
        return sexp.map((m) => lambdaReplace(m, v, arg));
    } else {
        return isVar(sexp) && eq(sexp, v) ? arg : sexp;
    }
}

function lambdaNormal(sexp, varmap, resPrefix = '_!R', countfrom = 0n) {
    if (isLambda(sexp)) {
        const [_, v, body] = sexp;
        const rname = resPrefix + str(countfrom);
        const subvarmap = new Map([... varmap]);
        subvarmap.set(v, rname);
        const [sub, tail] = lambdaNormal(body, subvarmap, resPrefix, countfrom + 1n);
        return [[':', rname, sub], tail];
    } else if (isList(sexp)) {
        const ans = [];
        let cf = countfrom, resub;
        for (const sub of sexp) {
            [resub, cf] = lambdaNormal(sub, varmap, resPrefix, cf);
            ans.push(resub);
        }
        return [ans, cf];
    } else {
        return [varmap.get(sexp) || sexp, countfrom];
    }
}

function lambdaEq(l1, l2) {
    const [a, _a] = lambdaNormal(l1, new Map());
    const [b, _b] = lambdaNormal(l2, new Map());
    return eq(a, b);
}

if (1) {
console.log(str(lambdaReplace(
    parseOne(`(: _x:O (: _y:O [+ _x:O _z:O]))`),
    '_z:O',
    '3',
)))

console.log(str(lambdaNormal(
    parseOne(`(: _x (: _x [+ _x _y _z]))`), new Map(),
)))

console.log(lambdaEq(
  parseOne(`(: _x (: _x [+ _x _y _z]))`),
  parseOne(`(: _x (: _u [+ _u _y _z]))`),
))

console.log(lambdaEq(
  parseOne(`(: _x (: _x [+ _x _y _z]))`),
  parseOne(`(: _x (: _u [+ _u _y _x]))`),
))
}

// TODO: abstractions
