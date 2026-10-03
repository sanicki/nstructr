"""The browser tests' checks. Each test still prints what it saw (for a person to read), and now also says what it
wanted: a check that fails is marked ✗, and the test exits with an error when any did, so CI can fail on it.
    from check import check, near, has
    check('label', actual, wanted)              # wanted: a value (==) or a function of the actual value -> bool
    check('label', x, near(3, 0.5))             # a number within 0.5 of 3
    check('label', xs, has('Ready… Begin.'))    # contains it
A test that raises (a timeout, a failed click) already exits with an error."""
import atexit, os, sys

FAILED = []

def check(label, actual, wanted, note=''):
    try:
        ok = bool(wanted(actual)) if callable(wanted) else actual == wanted
    except Exception as e:                                          # a predicate that can't read the value: a failure
        ok, note = False, f'{note} ({e})'.strip()
    want = note or getattr(wanted, 'describe', None) or (wanted if not callable(wanted) else 'as described')
    print(('  ' if ok else '✗ ') + f'{label:<26}', actual, '<-', want)
    if not ok: FAILED.append(label)
    return ok

def near(value, tol):
    f = lambda x: abs(x - value) <= tol
    f.describe = f'{value} ± {tol}'; return f
def below(value):
    f = lambda x: x < value
    f.describe = f'under {value}'; return f
def at_least(value):
    f = lambda x: x >= value
    f.describe = f'{value} or more'; return f
def has(*items):
    f = lambda x: all(i in x for i in items)
    f.describe = 'contains ' + ', '.join(map(repr, items)); return f
def all_true(x): return all(x)
all_true.describe = 'all True'

@atexit.register
def _report():
    sys.stdout.flush()
    if FAILED:
        print(f'\nFAILED {len(FAILED)}: ' + ', '.join(FAILED)); sys.stdout.flush()
        os._exit(1)
