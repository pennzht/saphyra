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
  ['and', 50],
  ['or', 40],
  ['->', 30],
  // To simplify: DO NOT implement 'where' notation for now.
  //  ['where', 27],        // [term] where [var] = [term]
  [':', 25],            // [var] => [term]
  ['forall', 20],       // forall [var] => [term], forall [lambda]
  ['exists', 20],       // exists [var] => [term], forall [lambda]
]);

// Fn application is '@', and always requires parens (except when var)

function _normalize_symbol (symbol) {
  const found = {'=>': ':', '∀': 'forall', '∃': 'exists'}[symbol];
  return found ? found : symbol;
}

function get_associativity (operator) {
  if (['^', 'forall', 'exists', ':', '->'].includes(operator)) return 'R';
  return 'L';
}

function infix_parse (string) {
  // TODO0923
  const rawParse = parse(string);

  // Normalize each symbol, recursively.

  // Parse each subobject

  // Compose result object
}

function infix_format (expr) {
  return _infix_format_p (expr, /*parent*/ '()', /*prefix*/ null);
}

function _infix_format_p (expr, parent, prefix) {
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

      return elem('span', {class: 'atom' + subclass, 'data-sexp': str(obj), 'data-relpos': str(pf)}, [
        text(varBody),
        subclass === '' ? elem('sup', {class: 'type-notice'}, [text(varType)]) : elem('span'),
      ]);
    }

    const ans = elem('span', {class: 'atom nonvar'}, [text(expr)]);
    ans.dataset.sexp = str(obj);
    ans.dataset.relpos = str(pf);

    return ans;
  } else {
    // Special formatting for 'forall', 'exists', ':'

    let match = simpleMatch(['_head', '_a', '_b'], obj);
    if (match.success) {
      const [head, a, b] = obj;

      if (isAtomic(head) && head !== ':') {
        return elem('span', {'data-sexp': str(obj), 'data-relpos': str(pf)}, [
          _infix_format_p(a, head, [...pf, 1]),
          _infix_format_p(head, head, [...pf, 0]),
          _infix_format_p(b, head, [...pf, 2]),
        ])
      } else if (head === ':') {
        return elem('span', {'data-sexp': str(obj), 'data-relpos': str(pf)}, [
          _infix_format_p(a, head, [...pf, 1]),
          _infix_format_p('\u21a6', head, [...pf, 0]),
          _infix_format_p(b, head, [...pf, 2]),
        ])
      }
    }

    match = simpleMatch(['forall', [':', '_v', '_body']], obj);
    if (match.success) {
      const v = match.map.get('_v'), body = match.map.get('_body');

      return elem('span', {'data-sexp': str(obj), 'data-relpos': str(pf)}, [
        text('∀'),
        _infix_format_p(v, 'forall', [...pf, 1, 1]),
        _infix_format_p(body, 'forall', [...pf, 1, 2]),
      ])
    }

    match = simpleMatch(['exists', [':', '_v', '_body']], obj);
    if (match.success) {
      const v = match.map.get('_v'), body = match.map.get('_body');

      return elem('span', {'data-sexp': str(obj), 'data-relpos': str(pf)}, [
        text('∃'),
        _infix_format_p(v, 'exists', [...pf, 1, 1]),
        _infix_format_p(body, 'exists', [...pf, 1, 2]),
      ])
    }

    // Default: function application
    
    const subobjs = [];
    for (let i = 0; i < obj.length; i++) {
      subobj = _infix_format_p(obj[i], '@', [...pf, i]);
      subobjs.push(subobj);
    }

    return elem('sexp', {'data-sexp': str(obj), 'data-relpos': str(pf)}, subobjs);
  }
}
