/// A balanced-list implementation.

window.onload = main;
$('add-value').onclick = updateTree;

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

// Just consider balancedness, ignore order for now.
function addElem(node, data) {
  if (node.type === 'leaf') {
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

      // Is this a good branch?
      if (newChildren.length <= 3) {
        return branch(...newChildren);
      } else {
        // Split branch.
        return branch(
          branch(newChildren[0], newChildren[1]),
          branch(newChildren[2], newChildren[3]),
        );
      }
    } else {
      // Still balanced. Good.
      return branch(...children);
    }
  }
}

function joinAll(listOfLists) {
  return [].concat(...listOfLists);
}

function dispLayer(layer) {
  const children = layer.map((node) =>
    elem('td', {colspan: node.size}, [
      node.type === 'branch' ?
      `\u25be ${node.depth}` :
      `${node.data}`
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

function main() {
  console.log(globals.list);
  $('output').appendChild(dispTree(globals.list));
}

function randrange(n) {
  return Math.floor(Math.random() * n)
}

function updateTree() {
  const newData = parseInt($('value').value) || randrange(100);
  $('value').value = '';

  globals.list = addElem(globals.list, newData);
  $('output').innerHTML = '';
  $('output').appendChild(dispTree(globals.list));
}
