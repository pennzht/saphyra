// Detect which tactics to use, when multiple ports are selected.

/*
    TODO: next step - following necessary tactics
    impl-intro
    forall-intro, exists-elim
    (variable-level changes)

    TODO: stretch step - tactic ordering ("most relevant" tactics first)
*/

/*
    TODO: what should this function return?
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
  const froms = labels.filter((a) => str(a.path).endsWith(' out]'));
  const tos = labels.filter((a) => str(a.path).endsWith(' in]'));

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
      const matchMap = extendMatchMap(match.map, vars, [
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
        };
        ans.push(thisAns);

        console.log('Match found', thisAns);
      }
    }
  }

  return ans;
}

/******************************
  Helper functions.
******************************/

function extendMatchMap(map, vars, avoids) {
  const syms = gensyms (avoids, vars.length, '_P', ':P');
  syms.reverse();

  for (const v of vars) {
    if (! map.has(v)) {
      const sym = syms.pop();
      map.set(v, sym);
    }
  }

  return map;
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
  if (path.length <= 1) {
    if (node[Label] === path[0]) return node;
    return null;  // Not found
  } else {
    const matchedSubs = node[Subs].filter(
      (s) => s[0] == 'node' && s[Label] === path[0]
    );
    if (matchedSubs.length > 0) {
      return findSubnodeByPath(matchedSubs[0], path.slice(1));
    } else return null;
  }
}

// Updates a module by adding elements into a subnode.
function addToSubnode(node, path, newNodes) {
  if (path.length <= 1) {
    if (node[Label] === path[0]) return [
      ... node.slice(0, Subs),
      node[Subs].concat(newNodes),
      ... node.slice(Subs+1),
    ];
    return node;
  } else {
    return [
      ... node.slice(0, Subs),
      // Operate on each subnode.
      node[Subs].map((sub) => {
        if (sub[0] === 'node' && sub[Label] === path[0]) return addToSubnode(sub, path.slice(1), newNodes);
        return sub;
      }),
      ... node.slice(Subs+1),
    ];
  }
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
