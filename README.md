Saphyra
=======

Beautiful mathematics at your fingertips.

Overview
---

Saphyra /səˈfaɪ.ɹə/ is a proof assistant under development.

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

Web version
---

[Saphyra Web](https://mage-of-the-east.com/saphyra/js/start.html)
