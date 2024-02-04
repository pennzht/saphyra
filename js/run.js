$ = (x) => document.getElementById(x);

$('input').oninput = execute;

window.onload = (e) => {
    /* example input */
    $('input').value =
`(comment - node data)
(node #ans
  []
  [(-> (-> (and _A _B) _C)
       (-> _A (-> _B _C)))])

(node #ans-1
  [(-> (and _A _B) _C)]
  [(-> _A (-> _B _C))])

(node #ans-2
  [(-> (and _A _B) _C) _A]
  [(-> _B _C)])

(node #ans-3
  [(-> (and _A _B) _C) _A _B]
  [_C])

(node #and-intro
  [_A _B] [(and _A _B)])

(node #mp
  [(and _A _B) (-> (and _A _B) _C)] [_C])

(comment - subgraph links, ignoring atomic nodes)
(derive impl-intro #ans #ans-1)
(derive impl-intro #ans-1 #ans-2)
(derive impl-intro #ans-2 #ans-3)
(derive join #ans-3 #and-intro #mp)
(derive mp #mp)
(derive and-intro #and-intro)

(comment - flow of statements between siblings)
(link #mp 0 #and-intro 0)
`;
    execute(e);
}

function execute (e) {
    inValue = $('input').value;
    console.log (ans = parseSexp (inValue));
    $('display').innerHTML = display (ans);
    $('output').innerText = ans.map (
        (row) => row.length === 4 && isValidStepInAnyRule (row[2], row[3]),
    );
}
