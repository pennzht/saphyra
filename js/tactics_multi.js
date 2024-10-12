// Detect which tactics to use, when multiple ports are selected.

/*
    TODO: next step - following necessary tactics
  √ impl-intro
  √ forall-intro, exists-elim
  √ add-goal
    (variable-level changes)

    TODO: stretch step - tactic ordering ("most relevant" tactics first)
*/

/*
    what should this function return?
    answer: a list of "additions" (commands in the format "path -> block", where "block" is either a "node" or a "link")

    Sometimes this would add multiple blocks.

    Use the function `addBlocksToNode`
*/

function tacticsMultiMatchAll() {
  const root = getCurrentRootNode();
  const hls = [...state.highlighted].map(parse).map((pair) => {
    return ({
      path: pair[0],
      sexp: pair[1],
    });
  });

  const ans = [];

  if (state.highlighted.size === 0) { return ans; }    // don't suggest when nothing is highlighted.

  // Default case: apply axioms

  // Special cases

  // TACTIC impl-intro

  // TACTIC forall-intro

  // TACTIC exists-elim

  // TACTIC beta-reduction, either direction. Using "beta-equiv" as rule name to avoid conflict with "beta".

  // TACTIC replace-sub replacing subobject (subformula)

  // TACTIC add-join

  // TACTIC import-stmt: brings in a statement from an outer result

  // detect-accessible-stmts
  // Also usable: top-level axioms, (theorems).
  if (tos.length === 1) {
    const [target /* path, sexp */] = tos;

    console.log('detect-accessible-stmts', froms.map((a) => a.path));

    // TODO1009 - Disambiguate stmts with second-from-last fragment.

    // TODO1009 - "Repeated application" tactics.

    ans.push({
      rule: 'detect-accessible-stmts',
      goal: tos[0].sexp,
      usable: froms.map((a) => a.sexp),
    })
  }

  return ans;
}

/******************************
  Helper functions.
******************************/

function extendMatchMap(map, vars, avoids) {
  const syms = gensyms (avoids, vars.length, '_?P', '');
  syms.reverse();
  const generatedSyms = [];

  for (const v of vars) {
    if (! map.has(v)) {
      const sym = syms.pop();
      generatedSyms.push(sym);
      map.set(v, sym);
    }
  }

  return [map, generatedSyms];
}

// Finds the "innermost" subnode from a list of paths.
function findSubnodeFromPorts(nodesAndPorts) {
  let ans = [];

  for (const label of nodesAndPorts) {
    const trimlabel = [...label];
    if (trimlabel.length >= 2 &&
      ['in', 'out'].includes(trimlabel[trimlabel.length - 1])) {
        trimlabel.pop();
        trimlabel.pop();
      }
    // Find longer one.
    if (trimlabel.length > ans.length) ans = trimlabel;
  }

  return ans;
}

function findSubnodeByPath(node, path) {
  if (node[Label] !== path[0]) return null;

  if (path.length <= 1) return node;

  for (const sub of node[Subs]) {
    const found = findSubnodeByPath(sub, path.slice(1));
    if (found) return found;
  }
  return null;
}

// Updates a module by adding elements into a subnode.
function addToSubnode(node, path, newNodes) {
  // Debugging info
  console.log("node is", node, "path is", path);

  if (path.length <= 1) {
    if (node[Label] === path[0]) return [
      ... node.slice(0, Subs),
      node[Subs].concat(newNodes),
      ... node.slice(Subs+1),
    ];
    return node;
  } else if (node[Label] === path[0]) {
    return [
      ... node.slice(0, Subs),
      // Operate on each subnode.
      node[Subs].map((sub) => {
        if (sub[0] === 'node') return addToSubnode(sub, path.slice(1), newNodes);
        return sub;
      }),
      ... node.slice(Subs+1),
    ];
  } else {
    return node;
  }
}

// Updates a module by adding inputs/outputs to nodes.
function applyIOToSubnodes(node, targetNodes, rule, inputs, outputs, newLabel) {
  node = parseOne(str(node));    // clone

  console.log('targetNodes =', str(targetNodes));

  function walkUpdateNode(node, prefix) {
    const nodeMatches = targetNodes.some((tn) => eq(tn, prefix));
    if (nodeMatches) {
      // Update inputs and outputs
      console.log(node);
      console.log(node[Ins]);
      console.log(node[Outs]);
      node[Ins].push(...inputs);
      node[Outs].push(...outputs);
      if (newLabel) {node[Label] = newLabel;}
    }
    for (const sub of (node[Subs] || [])) {
      if (sub[0] === 'node') {
        walkUpdateNode(sub, prefix.concat(sub[Label]));
      } else {
        // Link
        for (const index of [Lfrom, Lto]) {
          if (newLabel && eq (targetNodes[0], prefix.concat([sub[index]]))) {
            sub[index] = newLabel;
          }
        }
      }
    }
  }

  walkUpdateNode(node, [node[Label]]);

  return node;
}

function applyReplaceSub (root, port, stmt, subIndex, oldSub, newSub) {
  // Construct new statement
  const parentIndex = port.slice(0, port.length - 2);
  const childIndex = port[port.length - 2];
  const childPolarity = port[port.length - 1];
  const subnode = findSubnodeByPath (
    root,
    parentIndex,
  );

  // Construct lambda expressions
  const type = typeToString(getType(oldSub));
  const newVar = gensyms (stmt, 1, '_v', ':' + type)[0];

  // Construct new nodes:
  //     1. beta expansion
  //     2. equivalence based on equality
  //     3. beta conversion

  // An abstraction as a lambda expr.
  const abstractor = [':', newVar, replaceByPath(
    stmt,
    subIndex,
    newVar,
  )];

  const newStmt = replaceByPath(
    stmt,
    subIndex,
    newSub,
  );

  // Add to subnode

  // - Construct new nodes.
  //   New nodes should be:
  //   (0) beta expansion
  //   (1) =-elim => exposes a new "=" goal.
  //   (2) beta contraction

  const [lab0] = gensyms (
    /*avoids*/ subnode,
    /*count*/ 1,
    /*prefix*/ '#',
    /*suffix*/ '',
  );

  // TODO: consider polarity. For now, only bottom-up.

  const n0 = ['node', '#0',
              [newStmt],
              [ [abstractor, newSub] ],
              ['beta-equiv'],
              [],
             ];
  const n1 = ['node', '#1',
              [ ['=', newSub, oldSub], [abstractor, newSub] ],
              [ [abstractor, oldSub] ],
              ['=-elim'],
              [],
             ];
  const n2 = ['node', '#2',
              [ [abstractor, oldSub] ],
              [stmt],
              ['beta-equiv'],
              [],
             ];
  const l1 = ['link', '#0', '#1', [abstractor, newSub] ];
  const l2 = ['link', '#1', '#2', [abstractor, oldSub] ];
  const l3 = ['link', '#2', '^c', stmt];

  const l0a = ['link', '^a', '#0', newStmt];
  const l0b = ['link', '^a', '#1', ['=', newSub, oldSub]];

  const newNode = ['node', lab0,
                   [newStmt, ['=', newSub, oldSub]],
                   [stmt],
                   ['join', 'folded'],
                   [n0, n1, n2, l1, l2, l3, l0a, l0b],
                  ];

  const newRoot = addToSubnode(
    root,
    parentIndex,
    [
      newNode,
      ['link', lab0, childIndex, stmt],
    ],
  );

  // Return new root
  return newRoot;
}

function setNodeFolded(node, path) {
  if (path.length <= 1) {
    if (node[Label] === path[0]) {
      const newNode = [...node];
      const just = newNode[Just].filter ((a) => a != 'folded');
      const previouslyFolded = newNode[Just].includes('folded');
      if (!previouslyFolded) just.push('folded');
      newNode[Just] = just;
      return newNode;
    }
    return node;
  } else if (node[Label] === path[0]) {
    return [
      ... node.slice(0, Subs),
      // Operate on each subnode.
      node[Subs].map((sub) => {
        if (sub[0] === 'node') return setNodeFolded(sub, path.slice(1), open);
        return sub;
      }),
      ... node.slice(Subs+1),
    ];
  } else {
    return node;
  }
}

function rulePriority (tac) {
  // Smaller is more important.
  const categoryPriority = new Map([
    ['replace-sub', 30],
    ['detect-accessible-stmts', 35],
    ['beta-equiv', 40],
    ['exists-elim', 50],
    ['forall-intro', 100],
    ['impl-intro', 100],
    ['import-stmt', 110],
    ['add-join', 120],
    ['add-node-input', 120],
    ['add-node-output', 120],
    ['rename-node', 150],
    ['rename-space', 150],
    ['add-comment', 200],
  ]).get(tac.rule) || 130;

  const argPriority = (tac.args || []).length;

  return categoryPriority + argPriority;
}

// Used in `detect-accessible-stmts`; no longer used as of now.
function findMatchingPaths (root, target) {
  // Finds matching paths; no recursion needed.

  let node = root;
  const parent = target.path.slice(0, target.path.length - 2);

  // For each node from (root) to (parent) inclusive,
  //     find those that do not depend on (target).

  const ans = ['ans-follows', parent];

  const accessibles = [];  // {path, sexp}

  for (let i = 1; i <= parent.length; i++) {
    const prefix = parent.slice(0, i);
    const subs = node[Subs] || [];
    const subNodes = subs.filter((a) => a[0] === 'node');
    const subLinks = subs.filter((a) => a[0] === 'link');

    const nodeList = subNodes.map((a) => a[Label]);
    nodeList.push('^a', '^c');
    const linkList = subLinks.map((a) => [a[Lfrom], a[Lto]]);

    tpResult = toposort (nodeList, linkList);

    if (tpResult.success) {
      const order = tpResult.order;
      // A helper map from elems to stmts.
      stmts = new Map(subNodes.map ((a) => [a[Label], a[Outs]]));
      stmts.set('^a', node[Ins]);
      stmts.set('^c', node[Outs]);
      // Find predecessors.
      const pred = new Map();
      for (const [fr, to] of linkList) {
        if (! pred.has(to)) { pred.set(to, []); }
        pred.get(to).push(fr);
      }
      // Go in order, find out which ones depend on parent[i].
      const isDescendant = new Map();
      for (const elem of order) {
        if (elem === parent[i]) {
          isDescendant.set(elem, true);
        } else {
          isDescendant.set(elem, (pred.get(elem) || []).some((a) => isDescendant.get(a)));
        }
        // if not descendant, push.
        if (! isDescendant.get(elem)) {
          const stmtsAtNode = stmts.get(elem) || [];
          for (const s of stmtsAtNode) ans.push ([[...prefix, elem], s]);
        }
      }
    }

    // TODO0929

    // update node
    const [child] = subs.filter ((a) => a[Label] === parent[i]);
    node = child;
  }

  return ans;
}

// Normalizes an existing node, replacing string Justifications with lists.

function normalizeNode (node) {
  const parts = [...node];

  if (parts[0] !== 'node') return node;

  if (! Array.isArray(parts[Just])) {
    parts[Just] = [parts[Just]];
  }

  parts[Subs] = parts[Subs].map (normalizeNode);

  return parts;
}

/******************************
  Itertools.
******************************/

// Returns a list of list of {slot, sexpWithPath}
function tmFindMatches(slots, statements) {
  return arrangements(slots, statements.length).map(
    (arrangement) => arrangement.map((slotStmt, ind) => ({
      slot: slotStmt,
      sexpWithPath: statements[ind],
    }))
  );
}

// Arrangements of k elements from a list.
function arrangements(list, count) {
  if (count > list.length) return [];

  const ans = [];

  _arrangements_set_ans(
    list,
    count,
    /*prefix*/ [],
    /*out*/ ans,
  );
  return ans;
}

function _arrangements_set_ans(list, count, prefix, out) {
  if (prefix.length >= count) {
    out.push(prefix.map((ind) => list[ind]));
  } else {
    for (let i = 0; i < list.length; i++) {
      if (! prefix.includes(i)) {
        // Run this.
        prefix.push(i);
        _arrangements_set_ans(list, count, prefix, out);
        prefix.pop();
      }
    }
  }
}

function _last_elem (list) {
  if (Array.isArray (list)) {
    return list[list.length - 1] ?? null;
  } else {
    return null;
  }
}

