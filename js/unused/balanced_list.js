/// A balanced-list implementation.

function sum(arr) {
  let ans = 0;
  for (const x of arr) ans += x;
  return ans;
}

function branch(... children) {
  return {type: 'branch', children, depth:  children[0].depth + 1,
  size: sum(children.map((x) => x.size))};
}

function leaf(data) {
  return {type: 'leaf', data, depth: 0, size: 1};
}

function empty() {
  return {type: 'empty', depth: -1, size: 0};
}

// Just consider balancedness, ignore order for now.
function addElem(node, data) {
  if (node.type === 'empty') {
    return leaf(data);
  } else if (node.type === 'leaf') {
    return branch(
      leaf(data), leaf(node.data)
    )
  } else {
    const children = [...node.children];
    const index = randrange(children.length);
    children[index] = addElem(children[index], data);

    if (children[index].depth >= node.depth) {
      // Needs reorganizing.
      const newChildren = [];
      for (ch of children) {
        if (ch.depth < node.depth) newChildren.push(ch);
        else newChildren.push(... ch.children);
      }

      return recombineNodes(newChildren, false);
    } else {
      // Still balanced. Good.
      return branch(...children);
    }
  }
}

// TODO - function delElem(node, data)
//     Currently deletes a _random_ node
//     After removing, try to "merge" thinner node with its neighbor.
//     If resolves in another "thin" node, keep going upwards.
function delElem(node) {
  if (node.type === 'empty') {return node}
  else if (node.type === 'leaf') {return empty()}
  else {
    const children = [...node.children];
    const index = randrange(children.length);
    children[index] = delElem(children[index]);
    const chosenChild = children[index];

    // Check rebalance
    if (chosenChild.type === 'empty') {
      const newChildren = children.filter((x) => x.type !== 'empty');
      return newChildren.length > 1 ?
        branch(...newChildren) :
        newChildren[0];
    } else if (chosenChild.depth === node.depth - 1) {
      // Still balanced, good
      return branch(...children);
    } else {
      // Chosen child is shallower, need to recombine with siblings' children
      const newChildren = [];
      for (const child of children) {
        if (child.depth === node.depth - 1) {
          newChildren.push(... child.children);
        } else {
          newChildren.push(child);
        }
      }

      // Depending on the size (3 ~ 7), set new nodes.
      return recombineNodes(newChildren, true);
    }
  }
}

function recombineNodes(nodes, preferDeep) {
  const size = nodes.length;
  const [a, b, c, d, e, f, g, h, i, ..._else] =
      [...nodes, null, null, null, null, null, null, null, null];

  if (size === 1) {
    return a;
  } else if (size === 2) {
    return branch(a, b);
  } else if (size === 3) {
    return branch(a, b, c);
  } else if (size === 4) {
    return branch(branch(a, b), branch(c, d));
  } else if (size === 5) {
    return branch(branch(a, b), branch(c, d, e));
  } else if (size === 6) {
    return branch(branch(a, b, c), branch(d, e, f));
  } else if (size === 7) {
    return branch(branch(a, b), branch(c, d), branch(e, f, g));
  } else if (size === 8) {
    return preferDeep ?
      branch(
        branch(
          branch(a, b), branch(c, d),
        ),
        branch(
          branch(e, f), branch(g, h),
        ),
      ) :
      branch(
        branch(a, b, c),
        branch(d, e, f),
        branch(g, h),
      );
  } else {
    return preferDeep ?
      branch(
        branch(
          branch(a, b), branch(c, d),
        ),
        branch(
          branch(e, f), branch(g, h, i),
        ),
      ) :
      branch(
        branch(a, b, c),
        branch(d, e, f),
        branch(g, h, i),
      );
  }
}

function joinAll(listOfLists) {
  return [].concat(...listOfLists);
}

function dispLayer(layer) {
  const children = layer.map((node) =>
    node.type === 'empty'
      ? elem('td', {}, [text('(empty)')])
      : elem('td', {colspan: node.size}, [
        node.type === 'branch' ?
        text(`\u25be ${node.depth}`) :
        text(`${node.data}`)
      ])
  );
  return elem('tr', null, children);
}

function dispTree(tree) {
  let level = [tree];
  const ans = [dispLayer(level)];
  const depth = tree.depth;

  for (let i = 0; i < depth; i++) {
    level = joinAll(level.map((node) => {
      if (node.type === 'branch') {
        return node.children;
      } else {
        return [node];
      }
    }));
    ans.push(dispLayer(level));
  }

  return elem('table', null, ans);
}

globals = {
  list: branch(
    leaf(2), leaf(3), leaf(5)
  )
};

window.onload = (e) => {
  console.log(globals.list);
  $('output').appendChild(dispTree(globals.list));
};

function randrange(n) {
  return Math.floor(Math.random() * n)
}

$('add-value').onclick = (e) => {
  const newData = parseInt($('value').value) || randrange(100);
  $('value').value = '';

  globals.list = addElem(globals.list, newData);
  $('output').innerHTML = '';
  $('output').appendChild(dispTree(globals.list));
}

$('del-value').onclick = (e) => {
  globals.list = delElem(globals.list);
  console.log(globals.list);
  $('output').innerHTML = '';
  $('output').appendChild(dispTree(globals.list));
}
