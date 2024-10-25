Saphyra
=======

Beautiful mathematics at your fingertips.

Overview
---

__Saphyra__ /səˈfaɪ.ɹə/ is a proof assistant under active development, a personal project created and maintained entirely by [@pennzht](https://github.com/pennzht).

Saphyra aims to be simple and user-friendly. As of October 25, 2024, the proof repository has __67__ tautologies and __17__ natural number theorems verified. Tactics exist for each axiom, and also for rewriting equations based on proven statements.

Visit [Saphyra Web](https://mage-of-the-east.com/saphyra/js/start.html) to explore the current proof repository.

Foundations
---

Currently Saphyra is built on a foundation of higher-order logic and peano arithmetic, but it can be adjusted (in the future) to use other rulesets, such as set theory. The axioms can be found in [axioms.js](https://github.com/pennzht/saphyra/blob/main/js/axioms.js).

Each proof or collection of proofs is a __node__. A node may have inputs, outputs, and subnodes, representing a conditional truth that if all inputs hold, and if all subnodes are valid, then all outputs hold. In a sense, a node is similar to a sequent, and subnodes are other sequents which the parent node depends on. Unlike a sequent, a node's outputs are conjunctive instead of disjunctive.

The verification process is defined in [proof_module_2.js](https://github.com/pennzht/saphyra/blob/main/js/proof_module_2.js).

Interface
---

Saphyra uses a Web interface. Using the buttons “Export entire state” and “Import entire state”, one can import a proof repository, work on it, and save it. Clicking on goals (statements not yet proven) will show usable tactics on the right, where the user can provide parameters and apply them.

The menu “Step history” provides basic undo/redo support.

Nodes may be folded to unclutter the view.

Roadmap
---

Prof. Freek Wiedijk maintains a list of [100 theorems and their formalizations](https://www.cs.ru.nl/~freek/100/). This is a good measure of both the maturity of a proof assistant and the maturity of formal methods as a field.

By __December 15, 2024__, I aim to prove the following in Saphyra (2 of 100 theorems):
- Irrationality of √2
- Infinitude of primes

By __March 31, 2025__, I aim to prove the following (15 of 100 theorems, accumulated):
- Divisibility by 3 rule
- The Fundamental Theorem of Arithmetic
- The Number of Subsets of a Set
- Wilson’s Theorem
- Euler’s Generalization of Fermat’s Little Theorem
- The Denumerability of the Rational Numbers
- The Binomial Theorem
- Konigsberg Bridges Problem
- Sum of a Geometric Series
- The Cauchy-Schwarz Inequality
- The Intermediate Value Theorem
- Principle of Inclusion/Exclusion
- Schroeder-Bernstein Theorem

2024 Spring Report
---

[2024 Spring Report](./docs/2024-spring.md)

<!--

How to run
---

To verify a theory:

```
cd src
python3 general.py < ../theories/0-or-S-definitive.theory
```

To run a test verifying all given theories:

```
cd src
python3 verifyall_test.py
```

Directory structure
---

* `src/`
    - Python source (`*.py`)
        * `arith.py` — first-order Heyting arithmetic (HA), hard-coded axioms
        * `general.py` — first-order Heyting arithmetic, axioms in `arith.blue`
        * `efa.py` — elementary function arithmetic (EFA), equational, axioms in `efa.blue`
        * `arvm.py` — a simple scripting language
    - S-expression files (`*.blue`)
    - Generated test results (`*.txt`)
* `theories/`
    - Theory files (`*.theory`, `*.efa-theory`, `*.efa-tactic-theory`)
* `js/`
    - JavaScript version
        * Point your browser at `start.html` to view the demo (__WIP__)
-->

