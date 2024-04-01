// Visualization utilities. Browser-only.

// import * as lang from './lang.js';

const $ = (x) => document.getElementById(x);
// const elem = (x) => document.createElement(x);

// Sync with visual.js (with dispCons removed)

// Visualization of data structures.

function text(t) {
  return document.createTextNode(t);
}

function elem(tag, attrs=null, children=null) {
  const e = document.createElement(tag);
  if (typeof attrs === 'object' && attrs) {
    for (const k of (Object.keys(attrs) || [])) {
      e.setAttribute(k, attrs[k]);
    }
  }
  for (const child of (children || [])) {
      if (child instanceof Node) {
        e.appendChild(child);
      } else if (typeof child === 'string') {
        e.appendChild(text(child));
      }
  }
  return e;
}

function dispStack (stack) {
  return elem('div', [], stack.map(dispFrame));
}

function dispFrame(frame) {
  var ans;
  if (isCompoundFrame(frame)) {
    ans = elem('div', {class: 'frame'}, [frame.type, ' ',  dispSexp(frame.form), ' ', dispMap(frame.env), ' ', dispNum(frame.subindex)]);
  } else {
    ans = dispSexp(frame);
  }
  return ans;
}

function dispNum(number) {
  if ((number ?? 'x') === 'x') return elem('span', {class: 'null'}, ['—']);
  return elem('span', {class: 'index'}, [number.toString()]);
}

function dispSexp(obj) {
  const type = valType(obj);
  /*
  if (obj instanceof Cons) {
    return dispCons(obj);
  }
  */
  if (type === 'special') {
      return elem('span', {class: obj === null ? 'null' : 'bool'}, [`${obj}`]);
  }
  if (type === 'bigint') return elem('span', {class: 'number'}, [obj.toString()]);
  if (type === 'atom') return elem('span', {class: 'atom'}, [obj]);
  if (type === 'list') return elem('div', {class: 'list'}, obj.map(dispSexp));
  if (type === 'cons' && obj.kind === 'list') return elem('div', {class: 'list'}, obj.obj.map(dispSexp));
  if (type === 'map') return dispMap(obj);
  if (isCompoundFrame(obj)) return dispFrame(obj);
}

function dispMap(map) {
  if (! (map instanceof Map)) return dispSexp(map);
  if (map.size === 0) return elem('span', {class: 'null'}, ['empty']);
  return elem('table', {class: 'map'}, [...map.entries()].map(
    (entr) => elem('tr', {}, [elem('td', {}, [text(`${entr[0]}`)]),     elem('td', {}, [dispSexp(entr[1])])])
  ));
}

// Displays for modules (tree format).

function dispModule(module) {
  return elem('div', [], module.map(dispNode));
}

HIDE_EMPTY_NODES = true;

function dispNode(node) {
  const head = node[0];
  if (head === 'node') {
    const [_, label, ins, outs, justification, subsVerified, ...conclusion] = node;

    // Hide empty nodes.
    if (HIDE_EMPTY_NODES && justification[0] !== 'join' && subsVerified.length === 0) {
      return elem('span');
    }

    // Default case.
    return elem('node', {
      'data-trace': label,
    }, [
      text('node '), elem('span', {class: 'active'}, [text(label)]),
      dispConclusion(conclusion),
      elem('div', {class: 'stmt-group', 'data-trace': 'in'}, ins.map(dispStmt)),
      text('→'),
      elem('div', {class: 'stmt-group', 'data-trace': 'out'}, outs.map(dispStmt)),
      dispSexp(justification),
      ... subsVerified.map(dispNode),
    ]);
  } else if (head === 'link') {
    const [_, a, b, stmt] = node;
    return elem('div', [], [
      text('link '), dispStmt(stmt), text('('), text(a), text(' → '), text(b), text(')'),
    ]);
  } else if (isErr(head)) {
    return dispSexp(node);
  } else if (head === 'stmt') {
    // Active, referrable statement.
    const [_, content, n, io, comment, ...justification] = node;
    return elem('div', {class: 'stmt port active', 'data-trace': `${n} ${io}`, 'data-sexp': str(content)}, [
      text(comment), dispStmt(content),
      text(justification.length > 0 ? str(justification[0]) : ''),
    ]);
  } else if (head === 'comment') {
    return elem('div', {class: 'comment'}, [
      text(node.slice(1).map(str).join(' ')),
    ]);
  }
}

function dispStmt(obj) {
  if (! isList(obj)) {
    if (isVar(obj)) {
      let varBody = obj.slice(1), varType = '';
      // Possible typed structure.
      const colon = obj.lastIndexOf(':');
      if (colon > 0) {
        varBody = obj.slice(1, colon), varType = obj.slice(colon + 1);
      }

      return elem('span', {class: 'atom', 'data-sexp': str(obj)}, [
        text(varBody),
        elem('sup', {class: 'type-notice'}, [text(varType)])
      ]);
    }

    return dispSexp(obj);
  } else {
    let match = simpleMatch(['_head', '_a', '_b'], obj);
    if (match.success) {
      const [head, a, b] = obj;

      if (isAtomic(head) && head !== ':') {
        return elem('div', {class: 'list', 'data-sexp': str(obj)}, [
          dispStmt(a),
          text(head),
          dispStmt(b),
        ])
      } else if (head === ':') {
        return elem('div', {class: 'list', 'data-sexp': str(obj)}, [
          dispStmt(a),
          text('\u21a6'),
          dispStmt(b),
        ])
      }
    }

    match = simpleMatch(['forall', [':', '_v', '_body']], obj);
    if (match.success) {
      const v = match.map.get('_v'), body = match.map.get('_body');

      return elem('div', {class: 'list', 'data-sexp': str(obj)}, [
        text('∀'),
        dispStmt(v),
        dispStmt(body),
      ])
    }

    match = simpleMatch([[':', '_v', '_body'], '_arg'], obj);
    if (match.success) {
      const v = match.map.get('_v'),
        body = match.map.get('_body'),
        arg = match.map.get('_arg');

      return elem('div', {class: 'list', 'data-sexp': str(obj)}, [
        dispStmt(body),
        text('where'),
        dispStmt(v),
        text('='),
        dispStmt(arg),
      ]);
    }

    return elem('div', {class: 'list', 'data-sexp': str(obj)}, obj.map(dispStmt));
  }
}

function dispConclusion(conclusion) {
  if (conclusion[0] === '#good') {
    return elem('span', {style: 'color:#00ab32;'}, [text('\u2713')]);  // check mark.
  } else {
    return elem('sexp', [], [
      elem('span', {style: 'color:red;'}, [text('\u2717')]),  // cross.
      dispConclusionError(conclusion),
    ]);
  }
}

function dispConclusionError(conclusion) {
  if (conclusion[0] === '#err/unproven-assump') {
    return elem('div', [], [
      elem('div', [], [text('Not yet proven:')]),
      ... conclusion.slice(1).map((item) => elem('div', [], [
        dispSexp(item[0]),
        text(':'),
        ... item[1].map(dispStmt),
      ])),
    ]);
  } else {
    return dispSexp(conclusion);
  }
}
