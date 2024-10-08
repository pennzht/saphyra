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
  const ans = [];

  if (state.highlighted.size === 0) { return ans; }    // don't suggest when nothing is highlighted.

  // in each pathAndSexp, path is something like [#root #1 ^a in].
  // they should satisfy a condition that they are all subpaths of some full path, which is where we'll add new blocks.
  const labels = [...state.highlighted].map(parse).map((pair) => {
    return ({
      path: pair[0],
      sexp: pair[1],
    });
  });

  const froms = [], tos = [], nodes = [];
  for (const label of labels) {
    const tail = _last_elem(label.path);
    if (tail === 'out') froms.push(label);
    else if (tail === 'in') tos.push(label);
    else nodes.push(label);
  }

  const nodePaths = nodes.map ((n) => n.path);

  const subnode = findSubnodeFromPorts(labels.map((x) => x.path));

  // Find matching axioms.
  for(const [axiomName, [vars, assumptions, conclusions]] of folAxiomsMap.entries()) {
    /*
      Find all ways to match
        froms -> assumptions,
        tos -> conclusions,
    */

    // Allows partial matching, but avoid cases where there are more selected than required.
    if (froms.length > assumptions.length || tos.length > conclusions.length) {
      continue;
    }

    // Finds all ways to pair pattern and statement.
    console.log('=== Matches for ===', axiomName);

    const fromsMatch = tmFindMatches(assumptions, froms);
    const tosMatch = tmFindMatches(conclusions, tos);

    // For each pair, attempt to find a match for the block.
    for (const fm of fromsMatch) for (const tm of tosMatch) {
      // A list of {slot, sexpWithPath}
      const pairs = fm.concat(tm);

      const pattern = pairs.map((x) => x.slot);
      const content = pairs.map((x) => x.sexpWithPath.sexp);

      const match = simpleMatch(pattern, content);
      // Extend map by using generated statement names.
      const [matchMap, generatedSyms] = extendMatchMap(match.map, vars, [
        froms, tos, assumptions, conclusions,
      ]);

      if (match.success) {
        console.log('subnode is', findSubnodeByPath(getCurrentRootNode(), subnode),);

        const newNodeName = gensyms(
          /*avoid*/ findSubnodeByPath(getCurrentRootNode(), subnode),
          /*count*/ 1,
          /*prefix*/ '#',
          /*suffix*/ '',
        ) [0];

        const newNode = [
          'node', newNodeName, replaceAll(assumptions, matchMap),
          replaceAll(conclusions, matchMap),
          // Fixed: Justification should be a list.
          [axiomName], [] /*subs*/,
        ];

        const links = [];
        for (const matchPair of fm.concat(tm)) {
          const previousPort = [... matchPair.sexpWithPath.path];
          const outOrIn = previousPort.pop();
          const portName = previousPort.pop();
          if (outOrIn === 'out') {
            links.push(['link', portName, newNodeName, matchPair.sexpWithPath.sexp]);
          } else {
            links.push(['link', newNodeName, portName, matchPair.sexpWithPath.sexp]);
          }
        }

        const thisAns = {
          map: matchMap,
          rule: axiomName,
          ins: newNode[Ins],
          outs: newNode[Outs],
          subnode,
          addnodes: [
            newNode,
            ... links,
          ],
          labels,
          args: generatedSyms,
        };
        ans.push(thisAns);

        console.log('Match found', thisAns);
      }
    }
  }

  // Special cases

  // impl-intro
  if (tos.length === 1 && tos[0].sexp[0] === '->') {
    const newSym = '#' + Math.random();

    const [_arrow, a, b] = tos[0].sexp;

    // Construct an impl-intro node.
    const implIntroNode = [
      'node', newSym,
      froms.map((a) => a.sexp),
      tos.map((a) => a.sexp),
      ['impl-intro'],
      // Subs: [join].
      [[
        'node', '#0',
        froms.map((a) => a.sexp).concat([a]),
        [b],
        ['join'],
        [],
      ]],
    ];

    const linksIn = froms.map((a) => ['link', a.path[a.path.length-2], newSym, a.sexp]);
    const linksOut = tos.map((a) => ['link', newSym, a.path[a.path.length-2], a.sexp]);

    const thisAns = {
      rule: 'impl-intro',
      ins: [],
      outs: [tos[0].sexp],
      subnode,
      addnodes: [implIntroNode, ...linksIn, ...linksOut],
    };
    ans.push(thisAns);
  }

  // forall-intro
  if (tos.length === 1) {
    // froms, tos : {path, sexp}
    const m = simpleMatch(
      ['forall', '_P'], tos[0].sexp
    );
    if (m.success) {
      const p = m.map.get('_P');

      const joinNode = [
        'node', '#0',
        froms.map((a) => a.sexp),
        [[p, '_?P0']],
        ['join'],
        [],
      ];
      
      const lamMatch = simpleMatch([':', '_v', '_body'], p);
      if (lamMatch.success) {
        const v = lamMatch.map.get('_v');
        const [n, typ] = nameAndTypeString(v);
        // If not in assumptions ...
        const avoids = getFreeVars (froms.map ((a) => a.sexp));

        let v2 = v;
        if (avoids.includes (v)) {
          // Generate new var.
          v2 = gensyms (avoids, 1, n, ':'+typ)[0];
        } // otherwise, v2 = v.

        // Replaces out with actual variable.
        joinNode[Outs][0] = [p, v2];

        // Adds beta-replaced, then link.
        const beta = lambdaFullReduce([p, v2]);
        joinNode[Subs].push(['node', '#b', [beta], [[p, v2]], ['beta-equiv'], []]);
        joinNode[Subs].push(['link', '#b', '^c', [p, v2]]);
      }

      const innerNode = [
        'node', '#'+Math.random(),
        froms.map((a) => a.sexp),
        tos.map((a) => a.sexp),
        ['forall-intro'],
        // Subs: [join].
        [joinNode],
      ];
      const linksIn = froms.map((a) => ['link', a.path[a.path.length-2], innerNode[Label], a.sexp]);
      const linksOut = tos.map((a) => ['link', innerNode[Label], a.path[a.path.length-2], a.sexp]);
      ans.push ({
        rule: 'forall-intro',
        ins: innerNode[Ins],
        outs: innerNode[Outs],
        subnode,
        addnodes: [innerNode, ...linksIn, ...linksOut],
        args: ['_?P0'],
      });
    }
  }

  // exists-elim
  if (froms.length >= 1) {
    // froms, tos : {path, sexp}
    const m = simpleMatch(
      ['exists', '_P'], froms[0].sexp
    );
    if (m.success) {
      const p = m.map.get('_P');

      const joinNode = [
        'node', '#0',
        [[p, '_?P0']].concat(froms.slice(1).map((a) => a.sexp)),
        tos.map((a) => a.sexp),
        ['join'],
        [],
      ];
      
      const lamMatch = simpleMatch([':', '_v', '_body'], p);
      if (lamMatch.success) {
        const v = lamMatch.map.get('_v');
        const [n, typ] = nameAndTypeString(v);
        // If not in assumptions ...
        const avoids = getFreeVars (froms.map ((a) => a.sexp));

        let v2 = v;
        if (avoids.includes (v)) {
          // Generate new var.
          v2 = gensyms (avoids, 1, n, ':'+typ)[0];
        } // otherwise, v2 = v.

        // Replaces out with actual variable.
        joinNode[Ins][0] = [p, v2];

        // Adds beta-replaced, then link.
        const beta = lambdaFullReduce([p, v2]);
        joinNode[Subs].push(['node', '#b', [[p, v2]], [beta], ['beta-equiv'], []]);
        joinNode[Subs].push(['link', '^a', '#b', [p, v2]]);
      }

      const innerNode = [
        'node', '#'+Math.random(),
        froms.map((a) => a.sexp),
        tos.map((a) => a.sexp),
        ['exists-elim'],
        // Subs: [join].
        [joinNode],
      ];
      const linksIn = froms.map((a) => ['link', a.path[a.path.length-2], innerNode[Label], a.sexp]);
      const linksOut = tos.map((a) => ['link', innerNode[Label], a.path[a.path.length-2], a.sexp]);
      ans.push ({
        rule: 'exists-elim',
        ins: innerNode[Ins],
        outs: innerNode[Outs],
        subnode,
        addnodes: [innerNode, ...linksIn, ...linksOut],
        args: ['_?P0'],
      });
    }
  }

  // beta-reduction, either direction. Using "beta-equiv" as rule name to avoid conflict with "beta".
  if (froms.length + tos.length === 1) {
    let downward, stmt, parentNode, port;
    if (froms.length > 0) {
      downward = true;
      stmt = froms[0].sexp;
      const path = froms[0].path;
      parentNode = path.slice(0, path.length - 2);
      port = path[path.length - 2];
    } else {
      downward = false;
      stmt = tos[0].sexp;
      const path = tos[0].path;
      parentNode = path.slice(0, path.length - 2);
      port = path[path.length - 2];
    }

    const reduced = lambdaFullReduce(stmt);

    if (! eq (reduced, stmt)) {
      const newNode = [
        'node', '#'+Math.random(),
        /*ins*/ [downward ? stmt : reduced],
        /*outs*/ [downward ? reduced : stmt],
        /*justification*/ ['beta-equiv'],
        /*subs*/ [],
        /*additional*/ [],
      ];
      const link = [
        'link',
        downward ? port : newNode[Label],
        downward ? newNode[Label] : port,
        stmt,
      ];

      ans.push (result = {
        rule: 'beta-equiv',
        ins: newNode[Ins],
        outs: newNode[Outs],
        subnode: parentNode,
        addnodes: [newNode, link],
      });
      console.log('push result is', result);
    }
  }

  // replacing subobject (subformula)
  if (froms.length + tos.length === 1) {
    let downward, stmt, parentNode, port;
    if (froms.length > 0) {
      downward = true;
      stmt = froms[0].sexp;
      const path = froms[0].path;
      parentNode = path.slice(0, path.length - 2);
      port = path[path.length - 2];
    } else {
      downward = false;
      stmt = tos[0].sexp;
      const path = tos[0].path;
      parentNode = path.slice(0, path.length - 2);
      port = path[path.length - 2];
    }

    ans.push({
      rule: 'replace-sub',
      targetNodes: nodePaths,
      stmt,
      userInput: parse('[Statement stmt]'),
      targetPort: froms.concat(tos)[0].path,
    });
  }

  // add-join
  if (froms.length > 0 || tos.length > 0) {
    const newNodeName = gensyms(
      /*avoid*/ findSubnodeByPath(getCurrentRootNode(), subnode),
      /*count*/ 1,
      /*prefix*/ '#',
      /*suffix*/ '',
    ) [0];

    const newNode = [
      'node', newNodeName,
      /*ins*/ froms.map ((a) => a.sexp),
      /*outs*/ tos.map ((a) => a.sexp),
      ['join'], [] /*subs*/,
    ];

    const getNodeName = (path) => {
      if (['in', 'out'].includes(path[path.length - 1])) {
        return path[path.length - 2];
      } else return path[path.length - 1];
    };
    const fromLinks = froms.map ((a) => ['link', getNodeName(a.path), newNodeName, a.sexp]);
    const toLinks = tos.map ((a) => ['link', newNodeName, getNodeName(a.path), a.sexp]);

    const addnodes = [newNode, ...fromLinks, ...toLinks];

    ans.push ({
      rule: 'add-join',
      ins: froms.map((a) => a.sexp),
      outs: tos.map((a) => a.sexp),
      subnode,
      addnodes,
    });
  }

  // import-stmt: brings in a statement from an outer result
  if (froms.length > 0 && nodes.length === 1) {
    // Goes to 'subnode', and for every subnode of it,
    //     sees if the node path is between from.path[:-2] and nodes[0].path
    // And if yes, add this stmt as ^a, and add a link (in parent).

    const node = parseOne(str(getCurrentRootNode()));

    for (const from of froms) {
      const path = from.path, stmt = from.sexp;
      const targetNode = nodes[0].path;

      const theoremParentPath = path.slice(0, path.length - 2);
      const theoremIndex = path[path.length - 2];

      for (let length = theoremParentPath.length;
           length <= targetNode.length;
           length++) {
        const currentPath = targetNode.slice(0, length);
        console.log('import-stmt, at', currentPath);

        const n = findSubnodeByPath (node, currentPath);

        // If not first: add input.
        if (length > theoremParentPath.length) {
          n[Ins].push(stmt);

          // If also not last: add link
          if (length < targetNode.length) {
            n[Subs].push(['link', '^a', targetNode[length]/*next index*/, stmt]);
          }
        } else {
          // Add special link for first.
          n[Subs].push(['link', theoremIndex, targetNode[length]/*next index*/, stmt]);
        }
      }
    }

    ans.push({
      rule: 'import-stmt',
      newRoot: node,
    });
  }

  // add-node-input, add-node-output, rename-node, add-comment
  if (froms.length === 0 && tos.length === 0) {
    if (nodes.length > 0) {
      // node-only
      ans.push({
        rule: 'add-node-input',
        targetNodes: nodePaths,
        userInput: parse('[Statement stmt]'),
      });
      ans.push({
        rule: 'add-node-output',
        targetNodes: nodePaths,
        userInput: parse('[Statement stmt]'),
      });
    }

    if (nodes.length === 1) {
      ans.push({
        rule: 'rename-node',
        targetNodes: nodePaths,
        userInput: parse('[Name str]'),
      });
      ans.push({
        rule: 'rename-space',
        userInput: parse('[Name str]'),
      });
      ans.push({
        rule: 'add-comment',
        targetNodes: nodePaths,
        userInput: parse('[Name str]'),
      });
    }
  }

  // detect-accessible-stmts
  // TODO1008 - explicitly select which ones to follow.
  // Also usable: top-level axioms, (theorems).
  if (tos.length === 1) {
    const [target /* path, sexp */] = tos;
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

