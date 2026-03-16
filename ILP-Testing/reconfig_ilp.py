#!/usr/bin/env python3
"""
reconfig_ilp.py  --  Minimum-step reconfiguration ILP for pushing squares

Reads an initial configuration (block 2) and a target configuration (block 3)
from a .scen file, builds the full reconfiguration ILP, and solves it with
PuLP / CBC.

.scen block format (blocks separated by blank lines)
-----------------------------------------------------
  block 0 : name / description        (ignored)
  block 1 : colour palette            (ignored)
  block 2 : initial configuration     ← used
  block 3 : target  configuration     ← used
  block 4+: move annotations etc.     (ignored)

Each configuration line has the form:
  index, colour, x, y, z

Only x (col 2) and y (col 3) are used; z is ignored.

ILP variables
-------------
  x[ci, i]  ∈ {0,1}   cell cells[ci] is occupied at layer i
  y[mi, i]  ∈ {0,1}   move moves[mi] is executed at step i
                       (step i transforms layer i → layer i+1)
  f[ai, i]  ≥ 0       flow on directed arc arcs[ai] at layer i

Constraints
-----------
  (BC)  x[c, 0] = I[c],  x[c, L] = F[c]          boundary conditions
  (N)   Σ_c x[c, i] = n                           module count
  (R)   x[root, i] = 1  ∀ i                       root always occupied
  (T)   x[c,i+1] = x[c,i] - Σ_{μ:c_d=c} y[μ,i]
                         + Σ_{μ:c_a=c} y[μ,i]      state transition
  (S)   Σ_μ y[μ, i] ≤ 1                            at most one move/step
  (SB)  Σ_μ y[μ,i+1] ≤ Σ_μ y[μ,i]                symmetry break
  (D)   y[μ,i] ≤ x[c_d, i]                         departure occupied
  (A)   y[μ,i] ≤ 1 − x[c_a, i]                     arrival empty
  (O)   y[μ,i] ≤ x[g, i]   ∀ g ∈ guides(μ)         guides occupied
  (E)   y[μ,i] ≤ 1−x[b,i]  ∀ b ∈ clearances(μ)    clearances empty
  (K1)  in(c,i) − out(c,i) = x[c,i]   c ≠ root     flow sink (non-root)
  (K2)  out(root,i) − in(root,i) = n−1              flow source (root)
  (K3)  f[ai,i] ≤ (n−1)·x[u,i]  for arc (u,v)      capacity / occupancy

(K1)–(K3) together certify that the configuration at each layer is
connected: a feasible flow exists iff the occupied cells form a
connected subgraph rooted at `root`.

The root is chosen as the lexicographically smallest cell common to both
initial and target.  If no common cell exists, the smallest cell of the
initial config is used, with a warning that the ILP may be infeasible
(R conflicts with BC at layer L).

Objective
---------
  minimise  Σ_{μ,i} y[μ,i]

Usage
-----
  python reconfig_ilp.py <scen_file> [options]

  --max-steps L   maximum number of moves to allow   (default: 20)
  --buffer    B   grid buffer around bounding box    (default: 3)
  --relax         solve LP relaxation (fast, non-integer)
  --time-limit T  solver time limit in seconds       (default: 300)

Dependencies
------------
  pip install pulp          (ships with the CBC solver)
"""

import argparse
import sys
from collections import defaultdict, namedtuple
from pathlib import Path

try:
    import pulp
except ImportError:
    sys.exit("PuLP not installed.  Run:  pip install pulp")

# ─────────────────────────────────────────────────────────────────────────────
# Data type
# ─────────────────────────────────────────────────────────────────────────────

Move = namedtuple("Move", ["c_d", "c_a", "guides", "clearances"])
# c_d        : (x, y)   departure cell (must be occupied before the move)
# c_a        : (x, y)   arrival cell   (must be empty   before the move)
# guides     : frozenset of (x,y)  — cells that must be occupied (stationary helpers)
# clearances : frozenset of (x,y)  — cells that must be empty (swept corner for rotations)

_DIRS = ((1, 0), (-1, 0), (0, 1), (0, -1))

# ─────────────────────────────────────────────────────────────────────────────
# 1.  .scen parser
# ─────────────────────────────────────────────────────────────────────────────

def _parse_block(block: str) -> list:
    """Return list of (x, y) from one configuration block."""
    cells = []
    for line in block.splitlines():
        line = line.strip()
        if not line or line.startswith("*"):
            continue
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 5:
            continue
        try:
            cells.append((int(parts[2]), int(parts[3])))
        except ValueError:
            continue
    return cells


def parse_scen(path: Path):
    """Parse initial and target configurations from a .scen file."""
    text   = path.read_text()
    blocks = [b.strip() for b in text.split("\n\n") if b.strip()]

    if len(blocks) < 4:
        sys.exit(
            f"Expected ≥ 4 blocks (meta / colours / initial / target); "
            f"found {len(blocks)} in {path}."
        )

    initial = _parse_block(blocks[2])
    target  = _parse_block(blocks[3])

    if not initial:
        sys.exit("Initial configuration block is empty.")
    if not target:
        sys.exit("Target configuration block is empty.")
    if len(initial) != len(target):
        sys.exit(
            f"Module count mismatch: initial has {len(initial)}, "
            f"target has {len(target)}."
        )
    return initial, target

# ─────────────────────────────────────────────────────────────────────────────
# 2.  Bounding grid
# ─────────────────────────────────────────────────────────────────────────────

def make_grid(initial: list, target: list, buffer: int) -> frozenset:
    """
    Return the set of integer grid cells covering the bounding box of
    initial ∪ target, padded by `buffer` cells on every side.

    The buffer gives intermediate configurations room to manoeuvre.
    Increase it if the ILP returns INFEASIBLE unexpectedly.
    """
    all_pts = initial + target
    x0 = min(p[0] for p in all_pts) - buffer
    x1 = max(p[0] for p in all_pts) + buffer
    y0 = min(p[1] for p in all_pts) - buffer
    y1 = max(p[1] for p in all_pts) + buffer
    return frozenset(
        (x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)
    )

# ─────────────────────────────────────────────────────────────────────────────
# 3.  Move catalogue
# ─────────────────────────────────────────────────────────────────────────────

def generate_moves(grid: frozenset) -> list:
    """
    Enumerate every valid rotation and slide move whose cells all lie within
    `grid`.

    Rotations
    ---------
    Module c_d rotates 90° CW or CCW around a side-adjacent pivot f.
    Let (dx, dy) = c_d − f (unit vector from f toward c_d).

      CW  rotation:  c_a = f + ( dy, −dx),  corner = f + (dx+dy,  dy−dx)
      CCW rotation:  c_a = f + (−dy,  dx),  corner = f + (dx−dy,  dy+dx)

    guides     = {f}       (pivot must be occupied and stationary)
    clearances = {corner}  (swept corner cell must be empty)

    Slides
    ------
    Module c_d slides one step in direction (sdx, sdy) along two
    side-adjacent guide cells f1 and f2:
      f1 = c_d + (pdx, pdy)              perpendicular to slide
      f2 = c_d + (pdx+sdx, pdy+sdy)     one step ahead of f1

    where (pdx, pdy) ∈ {(−sdy, sdx), (sdy, −sdx)} gives the two
    possible guide orientations.

    guides     = {f1, f2}  (both must be occupied)
    clearances = {}        (no additional clearance beyond c_a)
    """
    moves = []
    seen  = set()

    def register(c_d, c_a, guides, clearances):
        if c_a not in grid:
            return
        if any(g not in grid for g in guides):
            return
        if any(b not in grid for b in clearances):
            return
        key = (c_d, c_a, guides, clearances)
        if key not in seen:
            seen.add(key)
            moves.append(Move(c_d, c_a, guides, clearances))

    for c_d in grid:
        x, y = c_d

        # ── Rotations ────────────────────────────────────────────────────────
        for dx, dy in _DIRS:
            # pivot f = c_d − (dx, dy)
            fx, fy = x - dx, y - dy

            # CW
            register(
                c_d,
                c_a=(fx + dy,           fy - dx),
                guides=frozenset([(fx, fy)]),
                clearances=frozenset([(fx + dx + dy, fy + dy - dx)]),
            )
            # CCW
            register(
                c_d,
                c_a=(fx - dy,           fy + dx),
                guides=frozenset([(fx, fy)]),
                clearances=frozenset([(fx + dx - dy, fy + dy + dx)]),
            )

        # ── Slides ───────────────────────────────────────────────────────────
        for sdx, sdy in _DIRS:
            c_a = (x + sdx, y + sdy)
            for pdx, pdy in ((-sdy, sdx), (sdy, -sdx)):   # two perp. orientations
                f1 = (x + pdx,          y + pdy)
                f2 = (x + pdx + sdx,    y + pdy + sdy)
                register(
                    c_d,
                    c_a=c_a,
                    guides=frozenset([f1, f2]),
                    clearances=frozenset(),
                )

    return moves

# ─────────────────────────────────────────────────────────────────────────────
# 4.  ILP construction and solve
# ─────────────────────────────────────────────────────────────────────────────

def build_and_solve(
    initial:    list,
    target:     list,
    grid:       frozenset,
    L:          int,
    relax:      bool,
    time_limit: int,
) -> None:

    n     = len(initial)
    I_set = set(initial)
    F_set = set(target)
    cells = sorted(grid)              # fixed ordering for variable indexing
    ci_map = {c: ci for ci, c in enumerate(cells)}

    # ── Root selection ────────────────────────────────────────────────────────
    # A fixed root enables single-source flow-based connectivity certificates.
    # We prefer a cell in I ∩ F so that constraint R (root always occupied)
    # never conflicts with the boundary conditions at layers 0 and L.
    common = I_set & F_set
    if common:
        root = min(common)
    else:
        root = min(I_set)
        print(
            "[WARN] Initial and target share no common cell.\n"
            f"       Using root={root} which is absent from target.\n"
            "       Constraint (R) will conflict with (BC) at layer L.\n"
            "       The ILP is likely infeasible as-is.  Consider using\n"
            "       configurations that share at least one occupied cell."
        )

    # ── Moves and arc structures ──────────────────────────────────────────────
    moves = generate_moves(grid)

    arcs = [
        (u, (u[0] + dx, u[1] + dy))
        for u in grid
        for dx, dy in _DIRS
        if (u[0] + dx, u[1] + dy) in grid
    ]
    in_arcs  = defaultdict(list)   # cell → arc indices arriving   at cell
    out_arcs = defaultdict(list)   # cell → arc indices departing from cell
    for ai, (u, v) in enumerate(arcs):
        out_arcs[u].append(ai)
        in_arcs[v].append(ai)

    dep_of = defaultdict(list)     # cell → move indices where cell is c_d
    arr_of = defaultdict(list)     # cell → move indices where cell is c_a
    for mi, mv in enumerate(moves):
        dep_of[mv.c_d].append(mi)
        arr_of[mv.c_a].append(mi)

    # ── Problem-size report ───────────────────────────────────────────────────
    n_x = len(cells) * (L + 1)
    n_y = len(moves) * L
    n_f = len(arcs)  * (L + 1)
    print(f"Modules    : {n}")
    print(f"Grid       : {len(cells)} cells   "
          f"x=[{min(c[0] for c in cells)}, {max(c[0] for c in cells)}]  "
          f"y=[{min(c[1] for c in cells)}, {max(c[1] for c in cells)}]")
    print(f"Moves      : {len(moves)}")
    print(f"Flow arcs  : {len(arcs)}")
    print(f"Layers     : {L + 1}  (steps 0 .. {L - 1})")
    print(f"Root       : {root}")
    print(f"Variables  : x={n_x}  y={n_y}  f={n_f}  total={n_x + n_y + n_f:,}")
    if n_x + n_y + n_f > 50_000:
        print(
            "[WARN] Large problem (> 50 k variables). CBC may be slow.\n"
            "       Reduce --max-steps or --buffer, or start with a smaller instance."
        )
    print()

    # ── Variable creation ─────────────────────────────────────────────────────
    vtype = pulp.LpContinuous if relax else pulp.LpBinary

    # x[ci][i]  occupancy of cells[ci] at layer i
    x = [
        [pulp.LpVariable(f"x_{ci}_{i}", lowBound=0, upBound=1, cat=vtype)
         for i in range(L + 1)]
        for ci in range(len(cells))
    ]

    # y[mi][i]  move moves[mi] executed at step i  (i ∈ 0 .. L−1)
    y = [
        [pulp.LpVariable(f"y_{mi}_{i}", lowBound=0, upBound=1, cat=vtype)
         for i in range(L)]
        for mi in range(len(moves))
    ]

    # f[ai][i]  flow on arcs[ai] at layer i
    f = [
        [pulp.LpVariable(f"f_{ai}_{i}", lowBound=0)
         for i in range(L + 1)]
        for ai in range(len(arcs))
    ]

    # ── Problem object ────────────────────────────────────────────────────────
    prob = pulp.LpProblem("PushingSquaresReconfig", pulp.LpMinimize)

    # Objective: minimise total executed moves
    prob += (
        pulp.lpSum(y[mi][i]
                   for mi in range(len(moves))
                   for i  in range(L)),
        "OBJ",
    )

    # ── (BC) Boundary conditions ──────────────────────────────────────────────
    for ci, c in enumerate(cells):
        prob += (x[ci][0] == (1 if c in I_set else 0), f"BC0_{ci}")
        prob += (x[ci][L] == (1 if c in F_set else 0), f"BCL_{ci}")

    # ── Layer-indexed constraints (apply at every layer i = 0 .. L) ───────────
    ri = ci_map[root]

    for i in range(L + 1):

        # (N) Exactly n modules
        prob += (
            pulp.lpSum(x[ci][i] for ci in range(len(cells))) == n,
            f"N_{i}",
        )

        # (R) Root cell always occupied
        prob += (x[ri][i] == 1, f"R_{i}")

        # (K2) Root supplies n−1 flow units (one per non-root occupied cell)
        out_r = pulp.lpSum(f[ai][i] for ai in out_arcs[root])
        in_r  = pulp.lpSum(f[ai][i] for ai in  in_arcs[root])
        prob += (out_r - in_r == n - 1, f"K2_{i}")

        # (K1) Every non-root cell is a flow sink when occupied, zero otherwise
        #      in(c) − out(c) = x[c,i]
        #      Combined with (K3) this forces all flow = 0 through empty cells.
        for ci, c in enumerate(cells):
            if c == root:
                continue
            in_c  = pulp.lpSum(f[ai][i] for ai in  in_arcs[c])
            out_c = pulp.lpSum(f[ai][i] for ai in out_arcs[c])
            prob += (in_c - out_c == x[ci][i], f"K1_{ci}_{i}")

        # (K3) Flow capacity: no flow may leave an empty cell
        for ci, c in enumerate(cells):
            for ai in out_arcs[c]:
                prob += (f[ai][i] <= (n - 1) * x[ci][i], f"K3_{ai}_{i}")

    # ── Step-indexed constraints (between layer i and layer i+1) ─────────────
    for i in range(L):

        # (S) At most one move per step
        prob += (
            pulp.lpSum(y[mi][i] for mi in range(len(moves))) <= 1,
            f"S_{i}",
        )

        # (SB) Symmetry break: pack moves into early steps
        if i < L - 1:
            prob += (
                pulp.lpSum(y[mi][i + 1] for mi in range(len(moves))) <=
                pulp.lpSum(y[mi][i]     for mi in range(len(moves))),
                f"SB_{i}",
            )

        # (T) State transition via executed moves
        for ci, c in enumerate(cells):
            departs = pulp.lpSum(y[mi][i] for mi in dep_of[c])
            arrives = pulp.lpSum(y[mi][i] for mi in arr_of[c])
            prob += (
                x[ci][i + 1] == x[ci][i] - departs + arrives,
                f"T_{ci}_{i}",
            )

        # Per-move feasibility constraints
        for mi, mv in enumerate(moves):

            # (D) Departure cell must be occupied
            prob += (y[mi][i] <= x[ci_map[mv.c_d]][i], f"D_{mi}_{i}")

            # (A) Arrival cell must be empty
            prob += (y[mi][i] <= 1 - x[ci_map[mv.c_a]][i], f"A_{mi}_{i}")

            # (O) Every guide cell must be occupied
            for g in mv.guides:
                prob += (y[mi][i] <= x[ci_map[g]][i],
                         f"O_{mi}_{ci_map[g]}_{i}")

            # (E) Every clearance cell must be empty (rotation corner)
            for b in mv.clearances:
                prob += (y[mi][i] <= 1 - x[ci_map[b]][i],
                         f"E_{mi}_{ci_map[b]}_{i}")

    # ── Solve ─────────────────────────────────────────────────────────────────
    solver = pulp.PULP_CBC_CMD(msg=True, timeLimit=time_limit)
    prob.solve(solver)

    # ── Report ────────────────────────────────────────────────────────────────
    print(f"\nSolver status : {pulp.LpStatus[prob.status]}")

    if prob.status == pulp.constants.LpStatusOptimal:
        obj_val = int(round(pulp.value(prob.objective)))
        print(f"Optimal moves : {obj_val}")
        print()
        print("Move sequence:")
        step = 0
        for i in range(L):
            for mi, mv in enumerate(moves):
                val = pulp.value(y[mi][i])
                if val is not None and val > 0.5:
                    kind = "ROT" if len(mv.guides) == 1 else "SLD"
                    print(
                        f"  Step {step:>3d}  [layer {i:>3d}]  {kind}  "
                        f"{mv.c_d} → {mv.c_a}  "
                        f"guides={set(mv.guides)}  "
                        f"clearances={set(mv.clearances)}"
                    )
                    step += 1

        if step == 0:
            print("  (no moves needed — initial equals target)")

    elif prob.status == pulp.constants.LpStatusInfeasible:
        print(
            f"\nINFEASIBLE: no valid reconfiguration found within {L} steps "
            f"on the current grid.\n"
            "Suggestions:\n"
            "  • Increase --max-steps\n"
            "  • Increase --buffer (more room for intermediate configurations)\n"
            "  • Verify both configurations are connected\n"
            "  • Verify initial and target share at least one cell (for root compatibility)"
        )

    else:
        best = pulp.value(prob.objective)
        print(
            f"\nSolver terminated without a proven optimum "
            f"(status: {pulp.LpStatus[prob.status]}).\n"
            f"Best objective bound found: {best}"
        )

# ─────────────────────────────────────────────────────────────────────────────
# 5.  Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(
        description="Minimum-step pushing-squares reconfiguration ILP (PuLP / CBC).",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    ap.add_argument(
        "scen_file", type=Path,
        help=".scen file with initial config (block 2) and target config (block 3).",
    )
    ap.add_argument(
        "--max-steps", type=int, default=20, metavar="L",
        help="Maximum number of moves (= number of layers − 1).",
    )
    ap.add_argument(
        "--buffer", type=int, default=3, metavar="B",
        help="Grid buffer (cells) around the bounding box of initial ∪ target.",
    )
    ap.add_argument(
        "--relax", action="store_true",
        help="Solve the LP relaxation (continuous variables — much faster, non-integer).",
    )
    ap.add_argument(
        "--time-limit", type=int, default=300, metavar="T",
        help="Solver time limit in seconds.",
    )
    args = ap.parse_args()

    if not args.scen_file.exists():
        sys.exit(f"File not found: {args.scen_file}")

    initial, target = parse_scen(args.scen_file)

    if set(initial) == set(target):
        print("Initial and target configurations are identical — 0 moves needed.")
        return

    grid = make_grid(initial, target, args.buffer)

    preview = lambda lst: str(sorted(lst)[:4]) + ("…" if len(lst) > 4 else "")
    print(f"Initial : {len(initial)} modules  {preview(initial)}")
    print(f"Target  : {len(target)}  modules  {preview(target)}")
    print()

    build_and_solve(
        initial, target, grid,
        L=args.max_steps,
        relax=args.relax,
        time_limit=args.time_limit,
    )


if __name__ == "__main__":
    main()
