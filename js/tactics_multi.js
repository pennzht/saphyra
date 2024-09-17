// Detect which tactics to use, when multiple ports are selected.

/*
    TODO: next step - following necessary tactics
  √ impl-intro
    forall-intro, exists-elim
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

        /*console.log(
          'debugging', axiomName,
          'current root =', pprint(getCurrentRootNode()),
          'subnode =', str(subnode),
          'subnode content =', pprint(findSubnodeByPath(getCurrentRootNode(), subnode)),
          'newnodename =', newNodeName,
        );*/

        const newNode = [
          'node', newNodeName, replaceAll(assumptions, matchMap),
          replaceAll(conclusions, matchMap),
          axiomName, [] /*subs*/,
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
      const innerNode = [
        'node', '#'+Math.random(),
        froms.map((a) => a.sexp),
        tos.map((a) => a.sexp),
        ['forall-intro'],
        // Subs: [join].
        [[
          'node', '#0',
          froms.map((a) => a.sexp),
          [[p, '_?P0']],
          ['join'],
          [],
        ]],
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

  // exists-elim TODO-0917

  // beta-reduction, either direction
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
        /*justification*/ ['beta'],
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
        rule: 'beta',
        ins: newNode[Ins],
        outs: newNode[Outs],
        subnode: parentNode,
        addnodes: [newNode, link],
      });
      console.log('push result is', result);
    }
  }

  // add-node-input, add-node-output
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
    }
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

