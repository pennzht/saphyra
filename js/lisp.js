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

// Sync with prepro.js

// Lisp preprocessor.

/** TODO - Preprocessor format
    (part1 | part2 | ... | partn) <-- ignored for now.
    => (partn (partn-1 ... (part2 part1)))
    (part1 @ part2 @ ... @ partn)
    => (part1 (part2 ... (partn-1 partn)))
    if _ exists, replaces _.

    (cond c1 a1 c2 a2 ... cn an) <-- can be if c1 a2 @ if c2 a2 @ ...
    (and c1 c2 ... cn)
    (or c1 c2 ... cn)

    Example for recursion.
    let 2xp (: [2xp x] @ if (= x 0) 1 @ * 2 @ 2xp @ - x 1) (2xp 3)

    let fact-primitive (: [fact-prim x acc] @ if (= x 0) acc @ fact-prim (- x 1) (* x acc)) @
    let fact (: [null x] [fact-prim x 1] [fact-prim]) @
    fact 5
**/

function hasUnder(sexp) {
  return sexp === '_' || isList(sexp) && sexp.some(hasUnder);
}

function replaceUnder(sexp, w) {
  if (isList(sexp)) return sexp.map((x) => replaceUnder(x, w));
  return sexp === '_' ? w : sexp;
}

function prepro(code) { return prepro_2(prepro_1(code)); }

function prepro_1(code) {
  if (isAtomic(code)) return code;
  const parts = code.map(prepro_1);

  // Handle @
  const stack = [[]];
  for (const y of parts) {
    if (y !== '@') stack[stack.length-1].push(y);
    else stack.push([]);
  }
  while(stack.length > 1) {
    const tail = stack.pop();
    const pretail = stack.pop();
    const newtail = hasUnder(pretail) ? replaceUnder(pretail, tail) : pretail.concat([tail]);
    stack.push(newtail);
  }
  return stack[0];

  // Handle cond => can replace with if
  // Handle and, or
  // return parts;
}

function prepro_2(code) {
  if (isAtomic(code)) return code;
  const parts = code.map(prepro_2);
  if (parts[0] === 'and') {
    let ans = true;
    for (let i = parts.length-1; i >= 1; i--) {
      ans = ['if', parts[i], ans, false];
    }
    return ans;
  } else if (parts[0] === 'or') {
    let ans = false;
    for (let i = parts.length-1; i >= 1; i--) {
      ans = ['if', parts[i], true, ans];
    }
    return ans;
  } else return parts;
}

// Sexp operations | Sync with sexp.js | Moved from lang.js

function parse (input) {
  input = input.replaceAll ('(', ' [ ');
  input = input.replaceAll (')', ' ] ');
  input = input.replaceAll ('[', ' [ ');
  input = input.replaceAll (']', ' ] ');
  input = input.trim();
  if (input.length === 0) return [];
  input = input.split(/[ \t\n]+/);
  input = input.map((token) => (
    token === '[' ? token :
      token === ']' ? token + ',' :
      '"' + token + '",'))
    .join(' ');
  input = '[' + input + ']';
  input = input.replaceAll (/, *\]/g, ' ]');
  return JSON.parse (input);
}

function parseOne (input) {
  return parse(input) [0];
}

function parseLenient (input) {
  try {
    return parse(input);
  } catch (e) {
    if (e instanceof SyntaxError) {
      return null;
    } else {
      throw e;
    }
  }
}

function parseOneLenient (input) {
  const ans = parseLenient(input);
  if (!ans) return null;
  return ans[0];
}

function translateLiteral(expr) {
  if (expr instanceof Array) {
    return expr.map(translateLiteral);
  } else if (typeof(expr) === 'string') {
    if (expr.match(/^[-]?[0-9]+$/)) return BigInt(expr);
    if (['true', 'false', 'null'].includes(expr)) return {'true': true, 'false': false, 'null': null}[expr];
    return expr;
  } else {
    return expr;
  }
}

function deepParse(input) { return translateLiteral(parse(input)); }

/// Performs a simple match between pattern and sexp.
/// Remember, it returns an object {success, map},
/// and in a boolean, only check for .success
function simpleMatch (pattern, sexp, vars = null) {
  const _isVar = (vars === null) ? isVar : ((v) => vars.includes(v));

  if (_isVar (pattern)) {
    return {success: true, map: new Map([[pattern, sexp]])};
  } else if (isAtom (pattern)) {
    if (eq (pattern, sexp)) {
      return {success: true, map: new Map([])};
    } else {
      return {success: false, cause: `${pattern} -> ${sexp} atom_mismatch`};
    }
  } else {
    // isList
    if (isAtom (sexp)) {
      return {success: false, cause: `${pattern} -> ${sexp} atom`};
    } else if (pattern.length !== sexp.length) {
      return {success: false, cause: `${pattern} -> ${sexp} length_mismatch`};
    } else {
      var totalMatch = {success: true, map: new Map([])};
      for (var i = 0; i < pattern.length; i++) {
        const match = simpleMatch (pattern[i], sexp[i]);
        combineMatch (totalMatch, match);
        if (! totalMatch.success) {
          return totalMatch;
        }
      }
      return totalMatch;
    }
  }
}

function combineMatch (oldMatch, newMatch) {
  if (! oldMatch.success) return;
  if (! newMatch.success) {
    oldMatch.success = false;
    oldMatch.cause = newMatch.cause;
    return;
  }
  for (const x of newMatch.map.keys ()) {
    if (oldMatch.map.has(x)) {
      if (eq(oldMatch.map.get(x), newMatch.map.get(x))) { /*good*/ }
      else {
        oldMatch.success = false;
        oldMatch.cause = `${x} -> ${oldMatch.map.get(x)}, ${newMatch.map.get(x)}`;
        return;
      }
    } else {
      oldMatch.map.set(x, newMatch.map.get(x));
    }
  }
}

function replaceAll (sexp, map) {
  if (isAtom (sexp)) {
    return map.has (sexp) ? map.get(sexp) : sexp;
  } else {
    return sexp.map ((child) => replaceAll (child, map));
  }
}

/// If two sexps are equal.
function eq (a, b) {
  return str(a) === str(b);
}

// Sexp to string.
function str (obj) {
  if (isAtomic(obj)) return `${obj}`;
  else if (isMap(obj)) return `[!map ${[...obj]}]`;
  else return '[' + obj.map (str).join(' ') + ']';
}

// Pretty-print
function pprint(obj, indent = '', hasIndent = false) {
  const ans = [];
  if (hasIndent) ans.push(indent);

  if (isList(obj)) {
    if (obj[0] === 'node') {
      ans.push('[');
      for (let i = 0; i < obj.length; i++) {
        if (i > 0) ans.push(' ');

        const term = obj[i], isSubs = (i === Subs) && isList(term) && term.length > 0;
        if (isSubs) {
          ans.push('[\n');
          for (const sub of term) {
            ans.push(pprint(sub, indent + '  ', true));
            ans.push('\n');
          }
          ans.push(indent + ']');
        } else {
          ans.push(str(term));
        }
      }
      ans.push(']');
    } else ans.push(str(obj));
  } else ans.push(str(obj));

  return ans.join('');
}

function hasMember(arr, elem) {
  return arr.some((x) => eq(x, elem));
}

function delMember(arr, elem) {
  return arr.filter((x) => !eq(x, elem));
}

function setEquals(A, B) {
  const describe = (set) => [... new Set(set.map(str))].sort();
  return eq(describe(A), describe(B));
}

function _sexpWalk(sexp, prefix, pushTo) {
  pushTo.push([[...prefix], sexp]);

  if (isList (sexp)) {
    for (let i = 0; i < sexp.length; i++) {
      prefix.push(i);
      _sexpWalk(sexp[i], prefix, pushTo);
      prefix.pop();
    }
  } else {    }
}

function sexpWalk(sexp) {
  const pushTo = [];
  const prefix = [];
  _sexpWalk (sexp, prefix, pushTo);
  return pushTo;
}

function isPrefix (prefix, path) {
  if (!(prefix.length <= path.length)) return false;

  for (let i = 0; i < prefix.length; i++) {
    if (prefix[i] !== path[i]) return false;
  }

  return true;
}

function isProperPrefix (prefix, path) { return prefix.length < path.length && isPrefix(prefix, path); }

// Returns {success: true, map: map:{_A => ..., _B => ...}}
if (false) {
  console.log (
    simpleMatch (
      parse ('[_A _B [and _A _B]]'),
      parse ('[_x:P [-> _x:P _y:P] [and _x:P [-> _x:P _y:P]]]'),
    )
  );
}
