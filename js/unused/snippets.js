
  /*
    $('input').value = emptyNode;
    $('input').value = sampleTreeDeriv9;
    executeInput(e);
    executeLisp(e);
  const evaluation = evaluateSingleStmtWithValue(
    parseOne(`(-> (and _A _B) _C)`),
    new Map([[`_A`, +1], [`_B`, -1], [`_C`, -1]]),
  );
  currentCode = autoCompleteNode(
    parse(`_A (-> _B false) (-> _C false)`),
    parse(`(-> (and _A _B) _C)`),
    evaluation.nodes,
  ).node;

  currentCode = tryProveTautology(parseOne(`
    [-> _A
      [-> (-> _A _B)
        [-> (-> _A _C)
          [-> (-> _B _D)
            [-> (-> _C _D)
              _D
            ]
          ]
        ]
      ]
    ]
  `));

  currentCode = tryProveTautology(parseOne(
    `(and (and _A:P _B:P) (-> _A:P false))`
  ));

  currentCode = tryProveTautology(parseOne(`
    (-> _M (-> _N (and _M (or _Q _N))))
  `));
  */


  /*
  function executeInput (e) {
      const inValue = $('input').value;
      try {
          currentCode = parseOne(inValue);  // Everything is root.
          execute(currentCode);
      } catch (ex) {
          console.log('Something wrong.', ex.stack, ex.message);
      }
  }

  function executeLisp(e) {
      const inValue = $('lisp-input').value;

      try {
          $('display-0').innerHTML = '';
          $('error-0').innerHTML = '';
          const code = prepro (deepParse (inValue));
        const evaluated = evaluate(code, {limit: 100000});
          $('display-0').appendChild(dispStack(evaluated));
      } catch (err) {
          $('error-0').appendChild(
              elem('div', {style: 'color:#f00024;'}, [
                  text(err.message),
                  elem('br'),
                  text(err.stack),
              ])
          );
      }
  }
  */
