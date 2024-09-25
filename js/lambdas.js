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

function isRedux(sexp) {
  return simpleMatch([[':', '_A', '_B'], '_C'], sexp).success;
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
    const ans = new Set(getFreeVars(body));  // corrected!
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

function gensyms (avoid, count = 1, prefix = '#', suffix = '') {
  const avoidSet = new Set(getAllAtoms(avoid));
  const ans = [];
  for (let i = 0; i <= avoidSet.size + count; i++) {
    const contender = `${prefix}${i}${suffix}`;
    if (! avoidSet.has(contender)) {
      ans.push(contender);
      if (ans.length >= count) return ans;
    }
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
        typeToString(getType(innerVar)),
      );
      innerExp = lambdaReplace(innerExp, innerVar, newVar);
      innerVar = newVar;  // Order corrected!
    }
    return [':', innerVar, lambdaReplace(innerExp, v, arg)];
  } else if (isList(sexp)) {
    return sexp.map((m) => lambdaReplace(m, v, arg));
  } else {
    return isVar(sexp) && eq(sexp, v) ? arg : sexp;
  }
}

function lambdaNormal(sexp, map = null, resPrefix = '_!R', countfrom = 0n) {
  const varmap = map || new Map();
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
  const [a, _a] = lambdaNormal(l1);
  const [b, _b] = lambdaNormal(l2);
  return eq(a, b);
}

// Inverse of `lambdaReduce`. Returns a collection of possible replacements.
function lambdaExtract (term) {
  const nf = lambdaNormal (term) [0];
  const maps = new Map();

  walkSexp(nf).map((x) => console.log(str(x)))
  for (const [nfo, path] of walkSexp(nf)) {
    const sub = subByPath(term, path);
    const gist = str(lambdaNormal(nfo, new Map(), '_!S')[0]);
    if (! maps.has(gist)) {
      maps.set(gist, []);
    }
    maps.get(gist).push(path);
  }

  return maps;
}

// Returns # of reductions made.
function lambdaOneStepReduce(term) {
  if (isAtomic(term)) return [term, 0];
  if (isLambda(term)) {
    const [_, v, body] = term;
    const [newBody, reductionsMade] = lambdaOneStepReduce(body);
    return [[':', v, newBody], reductionsMade];
  }

  // Application.
  const self = [...term];
  for (var i = 0; i < self.length; i++) {
    const [newTerm, reductionsMade] = lambdaOneStepReduce(self[i]);
    self[i] = newTerm;
    if (reductionsMade > 0) {
      return [self, reductionsMade];
    } else {
      // Normal case; keep reducing.
    }
  }
  // No reductions yet; check of entire term is reduction.
  if (/*isRedux*/ self.length === 2 && isLambda(self[0])) {
    const reduced = lambdaReduce(
      self[0], self[1]
    );
    return [reduced, 1];
  }

  // No reductions
  return [self, 0];
}

function lambdaFullReduce(term, stepLimit = 100) {
  let t = term, reductionsMade = 0;
  for (var i = 0; i < stepLimit; i++) {
    [t, reductionsMade] = lambdaOneStepReduce(t);
    if (reductionsMade <= 0) break;
  }
  return t;
}

if (0) {
  const start = parseOne(`[forall [[: _p:<OP> [: _n:O [-> [_p:<OP> _n:O] [_p:<OP> [S _n:O]]]]] [: _x:O [= [+ O _x:O] O]]]]`)
  console.log(lambdaFullReduce(start));
  /*
    [forall [[: _p:<OP> [: _n:O [-> [_p:<OP> _n:O] [_p:<OP> [S _n:O]]]]] [: _x:O [= [+ O _x:O] O]]]]
    [forall [: _n:O [-> [[: _x:O [= [+ O _x:O] O]] _n:O] [[: _x:O [= [+ O _x:O] O]] [S _n:O]]]]]
    [forall [: _n:O [-> [= [+ O _n:O] O] [[: _x:O [= [+ O _x:O] O]] [S _n:O]]]]]
    [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]]
    [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]]
  */

  console.log(lambdaFullReduce(parseOne(`
      [(: _x (_x _x)) (: _x (_x _x))]
    `)))
}

if (0) {
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

  console.log(walkSexp(parseOne(`(: _x (: _x [+ _x _y _z]))`), []))

  console.log(lambdaExtract(parseOne(
    `([: _x (* 2 (= _x _x))] [: _x _x])`
  )))
}

// TODO: abstractions
