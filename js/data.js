sampleDeriv1 = `(comment - node data)
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
(derive join #ans-3 #mp #and-intro)
(derive mp #mp)
(derive and-intro #and-intro)

(comment - flow of statements between siblings)
(link #mp 0 #and-intro 0)
`;

sampleDeriv2 = `(node #1 [_B _A] [(and _B _A)])
(derive and-intro #1)

(node #2 [(and _A _B)] [_A _B])
(derive and-elim #2)

(link #1 1 #2 0)
(link #1 0 #2 1)

(node #3 [(and _A _B)] [(and _B _A)])
(derive join #3 #2 #1)
`;

sampleDeriv3 = `[comment - this proof is written purely in the <textarea> text box.]

[node #target [] [(and true [-> false false])]]

[derive join #target #sub2 #sub3 #sub1]
[node #sub1 [true [-> false false]] [(and true [-> false false])]]
[node #sub2 [] [true]]
[node #sub3 [] [(-> false false)]]
[link #sub1 0 #sub2 0]
[link #sub1 1 #sub3 0]
[derive true-intro #sub2]

[derive impl-intro #sub3 #id]
[node #id [false] [false]]
[derive id #id]

[derive and-intro #sub1]
`;

incomplete1 = `
[node #target
  [(-> _A _X) (-> _X _Y) (-> _B _Y)]
  [(-> (or _A _B) _Y)]]
`;

// Sync with programs.js

programs = [
  `sym->str (' Hello_World!)`,
  `size (' [3 4 5 a b null zzz])`,
  `joinall (' [[1 2 3] [4 5 6] [7 8 9]])`,
  `+ 3 4`,
  `= 3 3`,
  `* (+ 1 2) (- 9 3)`,
  `set 1 666 [list: 333 444 555]`,
  `' a`,
  `map: [' a] 3 [' b] 4`,
  `set [' b] [' red] [map: [' a] 3 [' b] 4]`,
  `if false 3 [if false [+ 3 1] 5]`,
  `let x 17 (+ x x)`,
  `let x 17 [let y 5 (* x y)]`,
  `let x 17 [let x (* x x) x]`,
  `(: [_ x] [+ x 5]) 7`,
  `(: [_ x] [(: [_ y] [+ x y] [x]) 13]) 12`,
  `let 2xp (: [2xp x] (if (= x 0) 1 (* 2 (2xp (- x 1))))) [2xp 3]`,
  `let rsp (: [rsp x] (if (= x 0) 7 (rsp (- x 1)))) [rsp 2]`,
  `let fact (: [fact x] (if (= x 0) 1 (* x (fact (- x 1))))) [fact 5]`,
  `let prefix-with-size (: [_ list] [joinall [list: [list: (size list)] list]]) [prefix-with-size [' (3 4 5 6 7 abc def)]]`,
  `let x (+ 2 1) [let y (* x x) (- y 1)]`,
  `(: [_ x] [+ x x] []) 3`,
  `(: [_ x y z] [* x [+ y z]]) 3 4 5`,
  `(: [self x y] (if x [self (- x 1) (+ y 1)] y)) 3 5`,
  `(: [self a b] [if (= b 0) 1 (* a [self a (- b 1)])]) 3 5`,
  `(: [^ a b acc] [if (= b 0) acc (^ a (- b 1) (* acc a))]) 3 5 1`,
  `[(: [_ a] (: [_ b] [+ a b] [a])) 3] 9`,
  `
    let fact-acc (: [fact-acc x acc]
                    (if (= x 0) acc [fact-acc (- x 1) (* x acc)]))
    [
      let fact (: [_ x] [fact-acc x 1] [fact-acc])
      [fact 5]
    ]
  `,
  `+ 3 #xyz`,
  `* 5 (+ 3 false)`,
  `and (= 3 3) (< 4 5)`,
  `if (and (= 3 3) (< 4 5)) #yes #no`,
  `
    let isprime-factor [: (isprime-factor n f)
                          (if (> (* f f) n) true
                            (if (= 0 (% n f)) false
                              (isprime-factor n (+ 1 f))))]
    (let isprime [: (_ n) (if (< n 2) false (isprime-factor n 2)) [isprime-factor]]
      [isprime 5])
  `,
  `
    let isprime-factor
      [: (isprime-factor n f) @
        if (> (* f f) n) true @
        if (= 0 @ % n f) false @
        isprime-factor n (+ 1 f)] @
    let isprime
      [: (__ n) _ [isprime-factor] @
        if (< n 2) false (isprime-factor n 2)] @
    isprime 5`,
  `+ 3 7`,
  `+ 5 @ + 5 @ + 7 9`,
  `let n 5 @ + 3 @ if (> n 3) #err/over #under`,
];

// Sync with theories.js

theories = [`
(// comments start with //)
(// format is
  (node #label [ins] [outs] [justification args.optional] (subs.optional))
)

(node #t/switch [] [(-> (and _A _B) (and _B _A))]
  [impl-intro] (
  (node #1 [(and _A _B)] [(and _B _A)] [join] (
    (node #elim [(and _A _B)] [_A _B] [and-elim])
    (node #intro [_B _A] [(and _B _A)] [and-intro])
    (link #elim out 0 #intro in 1)
    (link #elim out 1 #intro in 0)
  ))
))
`];

// Lisp prelude

lispPrelude = `
let debug [: (null val) (list: val #err/debug)] @

let => [: (null val) val] @

let not [: (null x) @ if x false true] @

let null? [: (null x) @ and (atom? x) (= x null)] @

let head [: (null cons) @ get 0 cons] @

let tail [: (null cons) @ get 1 cons] @

let all [: (null cons) _ [null? head tail] @ or (null? cons) @ and (head cons) (all @ tail cons)] @

let all-range [: (all-range n fn) @ or (= 0 n) @ and (fn (- n 1)) (all-range (- n 1) fn)] @

let map [: (map fn cons) _ [null? head tail] @ if (null? cons) null [list: (fn (head cons)) (map fn @ tail cons)]] @

let map-list [: (null fn list) _ [map] @ cons->list @ map fn @ list->cons list] @

let filter [: (filter fn cons) _ [null? head tail] @
  if (null? cons) null @
  if (fn (head cons)) (list: (head cons) (filter fn @ tail cons)) @
  filter fn @ tail cons
] @

let filter-list [: (null fn list) _ [filter] @ cons->list @ filter fn @ list->cons list] @

let foldl [: (foldl fn seed cons) _ [null? head tail] @
  if (null? cons) seed (foldl fn (fn seed (head cons)) (tail cons))
] @

let foldl-list [: (null fn seed list) _ [foldl] @ foldl fn seed @ list->cons list] @

let == [: (null x y) _ [not map-list all-range] @
  if (atom? x) [and (atom? y) (= x y)]
  [and (list? x) (list? y) (= (size x) (size y)) @
    all-range (size x) [: (null ind) _ [x y] @ = (get ind x) (get ind y)]]
] @

let data/graph [' @
  (2 3 5 7 8 9 10 11)
  ([5 11] [11 2] [11 9] [8 9] [11 10] [3 8] [3 10] [7 8] [7 11])
] @

let data/cons [list->cons @ range 0 5] @

let data/comment [' @ ========toposort========] @

let initialize-map [: (null list value) _ [map-list] @ list->map @ map-list (: [__ x] [list: x value] [value]) list] @

let bump-index [: (null map ind) @ set ind (+ 1 @ get ind map) map] @
let beat-index [: (null map ind) @ set ind (+ -1 @ get ind map) map] @

let push-index [: (null map ind new) @ set ind (list: new @ get ind map) map] @

let for [: (for cons seed fn) _ [head tail null?] @
  if (null? cons) seed @ for [tail cons] [fn seed [head cons]] fn
] @

let /comment [' @ continue from here. handling state is so hard in this language that I dont know what to do next.] @

let topo-update-state [: (null state ind) _ [=> beat-index tail] @
  let new-in [beat-index (get #in state) ind] @
  let ready [get #ready state] @
  let new-ready [if (= 0 @ get ind new-in) (list: ind ready) ready] @
  set #in new-in @ set #ready new-ready state
] @

let topo-resolve [: (topo-resolve state) _ [not null? debug head tail => foldl beat-index topo-update-state for] @
  if [not [get #ready state]]
    (get #print state) @
    let pick [head (get #ready state)] @
    let ready [tail @ get #ready state] @
    let upcoming [get pick (get #out state)] @
    let new-state [for upcoming state topo-update-state] @
    let new-state [set #ready ready new-state] @
    let new-state [set #print [list: pick @ get #print state] new-state]
    [topo-resolve new-state]
] @

let toposort-old [: (null spec) _
[initialize-map => bump-index push-index foldl-list filter-list topo-resolve]
@
  let elems [get 0 spec] @
  let links [get 1 spec] @
  let in-degree [initialize-map elems 0] @
  let out-nodes [initialize-map elems null] @
  let in-degree [foldl-list [: (__ map ind) [bump-index map (get 1 ind)] [bump-index]] in-degree links] @
  let out-nodes [foldl-list [: (__ map ind) [push-index map (get 0 ind) (get 1 ind)] [push-index]] out-nodes links] @
  let zero-nodes [list->cons @ filter-list [: (__ ind) (= 0 @ get ind in-degree) (in-degree)] elems] @
  let state [map: #in in-degree #out out-nodes #ready zero-nodes #print null] @ =>
  [topo-resolve state]
] @

let toposort-step [: (toposort-step spec) _ [=> filter-list not] @
  let nodes (get 0 spec) @
  let edges (get 1 spec) @
  let get-pre-edges (: [__ node] [filter-list _ edges] [filter-list edges] @ : [__ edge] (= (get 1 edge) node) [node]) @
  let free-nodes [filter-list _ nodes @ : (__ node) (= 0 @ size @ get-pre-edges node) (get-pre-edges)] @
  let pick [if free-nodes [get 0 free-nodes] null] @
  let new-nodes (filter-list _ nodes @ : (__ node) (!= node pick) [pick]) @
  let new-edges (filter-list _ edges @ : (__ edge) (!= pick @ get 0 edge) [pick]) @
  let new-spec (list: new-nodes new-edges) @
  list: new-nodes new-edges pick
] @

let toposort [: (toposort spec) _ [toposort-step => null?] @
  let step (toposort-step spec) @
  let nodes (get 0 step) @ let edges (get 1 step) @ let pick (get 2 step) @
  if (null? pick) null @ list: pick @ toposort @ list: nodes edges
] @

let toposort [: (__ spec) (cons->list @ toposort spec) [cons->list toposort]] @

toposort data/graph
`;
