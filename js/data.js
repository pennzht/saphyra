export const folRules = `
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

export const sampleDeriv1 = `(comment - node data)
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

export const sampleDeriv2 = `(node #1 [_B _A] [(and _B _A)])
(derive and-intro #1)

(node #2 [(and _A _B)] [_A _B])
(derive and-elim #2)

(node #3 [(and _A _B)] [(and _B _A)])
(derive join #3 #2 #1)

(node #4 [] [(-> (and _A _B) (and _B _A))])
(derive impl-intro #4 #3)
`;

export const sampleDeriv3 = `[comment - this proof is written purely in the <textarea> text box.]

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

export const incomplete1 = `
[node #target
  [(-> _A _X) (-> _X _Y) (-> _B _Y)]
  [(-> (or _A _B) _Y)]]
`;
