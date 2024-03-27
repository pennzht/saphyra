folRules = `
(and-intro
  [_A _B]
  [_A _B] [(and _A _B)])

(and-elim
  [_A _B]
  [(and _A _B)] [_A _B])

(or-intro-1
  [_A _B]
  [_A] [(or _A _B)])

(or-intro-2
  [_A _B]
  [_B] [(or _A _B)])

(or-elim
  [_A _B _C]
  [(or _A _B) (-> _A _C) (-> _B _C)]
  [_C])

(false-elim
  [_A]
  [false] [_A])

(true-intro
  []
  [] [true])

(mp
  [_A _B]
  [_A (-> _A _B)] [_B])

(tnd
  [_A]
  [] [(or _A (-> _A false))])

(id
  [_A]
  [_A] [_A])
`;

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
