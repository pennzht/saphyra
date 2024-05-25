// Detect which tactics to use, when multiple ports are selected.

function tacticsMultiMatchAll() {
  const ans = [];

  const labels = [...state.highlighted].map(parse).map((pair) => {
    return ({
      path: pair[0],
      sexp: pair[1],
    });
  });
  const froms = labels.filter((a) => str(a.path).endsWith(' out]'));
  const tos = labels.filter((a) => str(a.path).endsWith(' in]'));

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
      if (match.success) {
        const thisAns = {
          map: match.map,
          rule: axiomName,
          ins: replaceAll(assumptions, match.map),
          outs: replaceAll(conclusions, match.map),
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
