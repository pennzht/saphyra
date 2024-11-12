/**
   Infix notation.
   ref: simple_typing.js, nodeviz.js::"Special formatting"
**/

PRECE = new Map([
  ['()', 9999999999999999],
  ['S', 100],
  ['^', 90],
  ['*', 80],
  ['+', 70],
  ['=', 60],
  ['not', 55],
  ['and', 50],
  ['or', 40],
  ['->', 30],
  // To simplify: DO NOT implement 'where' notation for now.
  //  ['where', 27],        // [term] where [var] = [term]
  [':', 20],            // [var] => [term]
  ['forall', 20],       // forall [var] => [term], forall [lambda]
  ['exists', 20],       // exists [var] => [term], forall [lambda]
  ['exists1', 20],
]);

function _normalizeSymbol (symbol) {
  if (isList(symbol)) return symbol;
  const found = {'=>': ':', '\u21a6': ':', '∀': 'forall', '∃': 'exists', '∃!': 'exists1'}[symbol];
  if (found) return found;

  if (symbol.startsWith('_') && ! symbol.includes(':')) {
    // Heuristically determine type.

    const vpart = symbol.slice(1);
    if (vpart.match(/^[A-Za-z][A-Za-z]/)) {
      return symbol + ':<OP>';    // Word, word => predicate
    } else if (vpart.match(/^[A-Z]/)) {
      return symbol + ':P';       // A, B => proposition
    } else {
      return symbol + ':O';       // a, b => object
    }
  } else return symbol;
}

function getAssociativity (operator) {
  if (['^', 'forall', 'exists', ':', '->', 'S', 'not'].includes(operator)) return 'R';
  return 'L';
}

function infixParse (string) {
  const rawParse = parse(string);
  const processed = _infixProcess(rawParse);
  return _infixParse(processed);
}

function _infixProcess (obj) {
  if (! isList(obj)) return obj;

  // Normalize each symbol, recursively.
  obj = obj.map (_normalizeSymbol);

  // Parse each subobject
  obj = obj.map (_infixProcess);

  return obj;
}

function _infixParse (obj) {
  // Parse each subobject, then build sexp.
  if (! isList(obj)) return obj;

  // Is this a fn-app (@)?
  if (obj[1] === '@') {
    // An application
    return [obj[0], ... obj.slice(2)].map(_infixParse);
  }

  // Single length
  if (obj.length === 1) {
    return _infixParse(obj[0]);
  }

  // Empty list
  if (obj.length <= 0) return [];

  // What's the lowest operator?

  let minPrec = 1e99;
  let minPrecIndices = [];
  let assoc = 'L';

  for (let i = 0; i < obj.length; i++) {
    const sub = obj[i];
    const prec = PRECE.get(sub);
    if (!prec) continue;

    if (prec < minPrec) {
      minPrecIndices = [i];
      minPrec = prec;
      assoc = getAssociativity(sub);
    } else if (prec <= minPrec) {
      minPrecIndices.push(i);
    }
  }

  if (minPrecIndices.length === 0) {
    // No operator found.
    return obj.map(_infixParse);
  } else {
    const splitAt = assoc === 'R' ? minPrecIndices[0] : minPrecIndices.pop();

    if (splitAt === 0) {
      // Unary
      return [obj[0], _infixParse(obj.slice(1))];
    } else {
      // Binary
      return [obj[splitAt], _infixParse(obj.slice(0, splitAt)), _infixParse(obj.slice(splitAt + 1/*, end*/))];
    }
  }
}

function infixFormat (expr, wrap=false) {
  const inner = _infixFormatP (expr, /*parent*/ '()', /*prefix*/ null, /*whichsub*/ null);
  if (wrap) {
    return elem('div', {'style': 'display:inline-block; border:1px solid #77777777; padding: 0.25em; margin: 0.25em;'}, [inner]);
  } else return inner;
}

/** Converted from `dispSexp`. **/
function _infixFormatP (obj, parent, prefix, whichSub /*L, R, null*/) {
  // prefix represents the relative position of a subexpression in the statement.

  const pf = isList(prefix) ? prefix : [];

  if (! isList(obj)) {
    if (isVar(obj)) {
      let varBody = obj.slice(1), varType = '';
      // Possible typed structure.
      const colon = obj.lastIndexOf(':');
      if (colon > 0) {
        varBody = obj.slice(1, colon), varType = obj.slice(colon + 1);
      }

      // Determines the style of the variable.
      const subclass = (
        varType === 'O' ? ' variable' :
          varType === 'P' ? ' statement' :
          varType === '<OP>' ? ' predicate' :
          ''
      );

      return elem('span', {class: 'atom infix' + subclass, 'data-sexp': str(obj), 'data-relpos': str(pf)}, [
        text(varBody),
        subclass === '' ? elem('sup', {class: 'type-notice'}, [text(varType)]) : elem('span'),
      ]);
    }

    const ans = elem('span', {class: 'atom infix nonvar'}, [text(obj)]);
    ans.dataset.sexp = str(obj);
    ans.dataset.relpos = str(pf);

    return ans;
  } else {
    // Special formatting for 'forall', 'exists', ':'

    // Should I add parens?
    const head = PRECE.has(obj[0]) ? obj[0] : '@';
    const needParens = (
      parent === '@' || head === '@' ||
        PRECE.get(parent) > PRECE.get(head) ||
        ((PRECE.get(parent) === PRECE.get(head)) && (whichSub !== getAssociativity(parent)))
    ) && (parent !== '()');

    let match = simpleMatch(['_head', '_a', '_b'], obj);
    if (match.success) {
      const [head, a, b] = obj;

      if (isAtomic(head) && head !== ':') {
        return elem('span', {'data-sexp': str(obj), 'data-relpos': str(pf)}, [
          needParens ? text('(') : text(''),
          _infixFormatP(a, head, [...pf, 1], 'L'),
          text(' '),
          _infixFormatP(head, head, [...pf, 0]),
          text(' '),
          _infixFormatP(b, head, [...pf, 2], 'R'),
          needParens ? text(')') : text(''),
        ])
      } else if (head === ':') {
        return elem('span', {'data-sexp': str(obj), 'data-relpos': str(pf)}, [
          needParens ? text('(') : text(''),
          _infixFormatP(a, head, [...pf, 1], 'L'),
          _infixFormatP(' \u21a6 ', head, [...pf, 0]),
          _infixFormatP(b, head, [...pf, 2], 'R'),
          needParens ? text(')') : text(''),
        ])
      }
    }

    match = simpleMatch(['forall', '_lambda'], obj);
    if (match.success) {
      const lam = match.map.get('_lambda');

      return elem('span', {'data-sexp': str(obj), 'data-relpos': str(pf)}, [
        needParens ? text('(') : text(''),
        text('∀ '),
        _infixFormatP(lam, 'forall', [...pf, 1], 'R'),
        needParens ? text(')') : text(''),
      ])
    }

    match = simpleMatch(['exists', '_lambda'], obj);
    if (match.success) {
      const lam = match.map.get('_lambda');

      return elem('span', {'data-sexp': str(obj), 'data-relpos': str(pf)}, [
        needParens ? text('(') : text(''),
        text('∃ '),
        _infixFormatP(lam, 'exists', [...pf, 1], 'R'),
        needParens ? text(')') : text(''),
      ])
    }

    match = simpleMatch(['exists1', '_lambda'], obj);
    if (match.success) {
      const lam = match.map.get('_lambda');

      return elem('span', {'data-sexp': str(obj), 'data-relpos': str(pf)}, [
        needParens ? text('(') : text(''),
        text('∃! '),
        _infixFormatP(lam, 'exists', [...pf, 1], 'R'),
        needParens ? text(')') : text(''),
      ])
    }

    match = simpleMatch(['_unary', '_arg'], obj);
    if (match.success && ['S', 'not'].includes(match.map.get('_unary'))) {
      // Unary operator
      return elem('span', {'data-sexp': str(obj), 'data-relpos': str(pf)}, [
        needParens ? text('(') : text(''),
        text(match.map.get('_unary')),
        _infixFormatP(match.map.get('_arg'), obj[0], [...pf, 1], 'R'),
        needParens ? text(')') : text(''),
      ])
    }

    // Default: function application
    
    const subobjs = [];
    for (let i = 0; i < obj.length; i++) {
      subobj = _infixFormatP(obj[i], '@', [...pf, i], null);

      if (i > 0) {
        if (i === 1) {
          subobjs.push(text(' @ '));
        } else {
          subobjs.push(text(' '));
        }
      }

      subobjs.push(subobj);
    }

    return elem('span', {'data-sexp': str(obj), 'data-relpos': str(pf)}, [
      needParens ? text('(') : text(''),
      ...subobjs,
      needParens ? text(')') : text(''),
    ]);
  }
}
