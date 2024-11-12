// Higher-order logic + Peano arithmetic.
// The below complex rules are not included here, but checked individually.
//     impl-intro, forall-intro, exists-elim, beta-reduction

allRules = `
(and-intro
  [_A:P _B:P]
  [_A:P _B:P] [(and _A:P _B:P)])

(and-elim
  [_A:P _B:P]
  [(and _A:P _B:P)] [_A:P _B:P])

(or-intro-1
  [_A:P _B:P]
  [_A:P] [(or _A:P _B:P)])

(or-intro-2
  [_A:P _B:P]
  [_B:P] [(or _A:P _B:P)])

(or-elim
  [_A:P _B:P _C:P]
  [(or _A:P _B:P) (-> _A:P _C:P) (-> _B:P _C:P)]
  [_C:P])

(false-elim
  [_A:P]
  [false] [_A:P])

(true-intro
  []
  [] [true])

(mp
  [_A:P _B:P]
  [_A:P (-> _A:P _B:P)] [_B:P])

(tnd
  [_A:P]
  [] [(or _A:P (-> _A:P false))])

(id
  [_A:P]
  [_A:P] [_A:P])

(equiv-intro
  [_A:P _B:P]
  [(-> _A:P _B:P) (-> _B:P _A:P)] [(= _A:P _B:P)])

(equiv-elim
  [_A:P _B:P]
  [(= _A:P _B:P) _A:P] [_B:P])

(forall-elim
  [_P _x]
  [(forall _P)] [(_P _x)])

(exists-intro
  [_P _x]
  [(_P _x)] [(exists _P)])

(=-intro
  [_a]
  [] [(= _a _a)])

(=-sym
  [_a _b]
  [(= _a _b)] [(= _b _a)])

(=-elim
  [_P _a _b]
  [(= _a _b) (_P _a)] [(_P _b)])

(peano-0
  [_a:O _b:O]
  [(= (S _a:O) (S _b:O))] [(= _a:O _b:O)])

(peano-1
  [_a:O]
  [] [(-> (= O (S _a:O)) false)])

(peano-2
  [_P:<OP>]
  [(_P:<OP> O)
   (forall ([: _p:<OP> [: _n:O (-> (_p:<OP> _n:O) (_p:<OP> (S _n:O)))]] _P:<OP>))]
  [(forall _P:<OP>)])

(+-O [_a:O     ] [] [(= (+ _a:O O) _a:O)])

(+-S [_a:O _b:O] [] [(= (+ _a:O (S _b:O)) (S (+ _a:O _b:O)))])

(*-O [_a:O     ] [] [(= (* _a:O O) O)])

(*-S [_a:O _b:O] [] [(= (* _a:O (S _b:O)) (+ _a:O (* _a:O _b:O)))])

(^-O [_a:O     ] [] [(= (^ _a:O O) (S O))])

(^-S [_a:O _b:O] [] [(= (^ _a:O (S _b:O)) (* _a:O (^ _a:O _b:O)))])

(exists1-O
  [_P]
  []
  [[=
    (exists1 _P)
    ((: _P0:<OP> (exists [: _v0:O (forall [: _v:O [= (= _v0:O _v:O) (_P0:<OP> _v:O)]])])) _P)
  ]]
)

(exists1-P
  [_P]
  []
  [[=
    (exists1 _P)
    ((: _P0:<PP> (exists [: _v0:P (forall [: _v:P [= (= _v0:P _v:P) (_P0:<PP> _v:P)]])])) _P)
  ]]
)
`;

// TODO - fix "exists1" typing issue. _v0 and _v need types, and we need better type inference.

/* ================================================================
    The following temporary axioms are removed.
    They were used for an outdated `tauto` tactic.
================================================================ */

_removedAxioms = `
(and-negate-1
  [_A:P _B:P]
  [(-> _A:P false)]
  [(-> (and _A:P _B:P) false)])

(and-negate-2
  [_A:P _B:P]
  [(-> _B:P false)]
  [(-> (and _A:P _B:P) false)])

(or-negate
  [_A:P _B:P]
  [(-> _A:P false) (-> _B:P false)]
  [(-> (or _A:P _B:P) false)])

(ex-falso
  [_A:P _B:P]
  [(-> _A:P false)]
  [(-> _A:P _B:P)])

(veritas-aeterna
  [_A:P _B:P]
  [_B:P]
  [(-> _A:P _B:P)])

(impl-negate
  [_A:P _B:P]
  [_A:P (-> _B:P false)]
  [(-> (-> _A:P _B:P) false)])
`;
