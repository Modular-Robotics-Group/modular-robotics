"""
connectivity_test.py

Reads a 2D pushing-squares configuration from a .scen file and solves
the flow-based connectivity ILP using PuLP.

Objective: minimise total flow (equivalent to finding a minimum spanning
arborescence rooted at r*).  If the LP is feasible the configuration is
connected; if infeasible it is not.

Usage
-----
    python connectivity_test.py <path_to_scen_file> [--root ROOT_INDEX]

The ROOT_INDEX is the 0-based index into the list of parsed modules.
Defaults to 0 (the first module in the configuration block).

Dependencies
------------
    pip install pulp
PuLP ships with the CBC solver, so no extra solver installation is needed.
"""

import argparse
import sys
from pathlib import Path

try:
    import pulp
except ImportError:
    sys.exit("PuLP is not installed. Run:  pip install pulp")


# ---------------------------------------------------------------------------
# 1.  Parser
# ---------------------------------------------------------------------------

def parse_scen(path: Path) -> list[tuple[int, int]]:
    """
    Return the list of (x, y) module positions from the third block of a
    .scen file.

    Block structure (blocks separated by blank lines):
        block 0 – name / metadata
        block 1 – colour palette
        block 2 – module configuration   <-- we want this one
        block 3+ – move sequence (ignored)

    Each configuration line has the form:
        index, colour, x, y, z
    We extract x (col 2) and y (col 3); z (col 4) is ignored.
    """
    text = path.read_text()
    blocks = [b.strip() for b in text.split("\n\n") if b.strip()]

    if len(blocks) < 3:
        sys.exit(f"Expected at least 3 blocks in {path}; found {len(blocks)}.")

    config_block = blocks[2]
    modules: list[tuple[int, int]] = []
    for line in config_block.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 5:
            sys.exit(f"Malformed config line: {line!r}")
        try:
            x, y = int(parts[2]), int(parts[3])
        except ValueError:
            sys.exit(f"Non-integer coordinate in line: {line!r}")
        modules.append((x, y))

    if not modules:
        sys.exit("No modules found in configuration block.")

    return modules


# ---------------------------------------------------------------------------
# 2.  Grid-graph helpers
# ---------------------------------------------------------------------------

DIRECTIONS = [(1, 0), (-1, 0), (0, 1), (0, -1)]


def side_adjacent(c1: tuple[int, int], c2: tuple[int, int]) -> bool:
    return abs(c1[0] - c2[0]) + abs(c1[1] - c2[1]) == 1


def build_directed_edges(
    occupied: set[tuple[int, int]],
) -> list[tuple[tuple[int, int], tuple[int, int]]]:
    """
    All directed edges (u -> v) where both u and v are occupied
    and v is a side-adjacent neighbour of u.
    """
    edges = []
    for u in occupied:
        x, y = u
        for dx, dy in DIRECTIONS:
            v = (x + dx, y + dy)
            if v in occupied:
                edges.append((u, v))
    return edges


# ---------------------------------------------------------------------------
# 3.  ILP build and solve
# ---------------------------------------------------------------------------

def build_and_solve(
    modules: list[tuple[int, int]],
    root_idx: int = 0,
) -> None:

    occupied = set(modules)
    n = len(occupied)

    if n == 0:
        print("No modules – trivially connected.")
        return
    if n == 1:
        print("Single module – trivially connected.")
        return

    # ---- pick root -------------------------------------------------------
    if root_idx >= len(modules):
        sys.exit(f"Root index {root_idx} out of range (0..{len(modules)-1}).")
    root = modules[root_idx]
    print(f"Root module: index {root_idx}  position {root}")
    print(f"Total modules: {n}")

    # ---- directed edges in the grid graph --------------------------------
    dir_edges = build_directed_edges(occupied)
    print(f"Directed edges (between occupied cells): {len(dir_edges)}")

    # ---- PuLP model ------------------------------------------------------
    prob = pulp.LpProblem("ConnectivityTest", pulp.LpMinimize)

    # Flow variables f[(u,v)] >= 0 for every directed edge (u,v)
    f = {
        (u, v): pulp.LpVariable(
            f"f_{u[0]}_{u[1]}__{v[0]}_{v[1]}", lowBound=0
        )
        for u, v in dir_edges
    }

    # ---- objective: minimise total flow ----------------------------------
    # A minimum-flow feasible solution corresponds to a spanning arborescence
    # (flow tree) rooted at r*.  This is a useful sanity-check metric.
    prob += pulp.lpSum(f.values()), "TotalFlow"

    # ---- flow-capacity constraints  (K3) ---------------------------------
    # Flow on edge (u->v) is bounded by n-1 (at most n-1 units traverse
    # any single edge in a spanning arborescence).
    for (u, v), fvar in f.items():
        prob += fvar <= (n - 1), f"cap_{u[0]}_{u[1]}__{v[0]}_{v[1]}"

    # ---- flow conservation at non-root cells  (K1) -----------------------
    # Every occupied non-root cell c is a sink for exactly 1 unit of flow:
    #   in-flow(c) - out-flow(c) = 1
    for c in occupied:
        if c == root:
            continue
        in_flow  = pulp.lpSum(f[(u, c)] for (u, v) in dir_edges if v == c)
        out_flow = pulp.lpSum(f[(c, v)] for (u, v) in dir_edges if u == c)
        prob += (
            in_flow - out_flow == 1,
            f"cons_{c[0]}_{c[1]}",
        )

    # ---- flow conservation at root  (K2) ---------------------------------
    # Root supplies n-1 units total (one per non-root module):
    #   out-flow(r*) - in-flow(r*) = n-1
    in_root  = pulp.lpSum(f[(u, root)] for (u, v) in dir_edges if v == root)
    out_root = pulp.lpSum(f[(root, v)] for (u, v) in dir_edges if u == root)
    prob += (out_root - in_root == n - 1, "cons_root")

    # ---- solve -----------------------------------------------------------
    solver = pulp.PULP_CBC_CMD(msg=False)
    status = prob.solve(solver)

    # ---- report ----------------------------------------------------------
    print()
    print(f"Solver status : {pulp.LpStatus[prob.status]}")

    if prob.status == pulp.constants.LpStatusOptimal:
        total_flow = pulp.value(prob.objective)
        print(f"Total flow    : {total_flow:.1f}  (minimum = n-1 = {n-1})")
        print()
        print("RESULT: Configuration is CONNECTED.")
        print()
        print("Non-zero flow edges (spanning arborescence):")
        for (u, v), fvar in sorted(f.items()):
            val = pulp.value(fvar)
            if val is not None and val > 1e-6:
                print(f"  {u} -> {v}  : {val:.2f}")
    elif prob.status == pulp.constants.LpStatusInfeasible:
        print()
        print("RESULT: Configuration is DISCONNECTED "
              "(flow constraints have no feasible solution).")
    else:
        print("Solver did not find an optimal solution. "
              f"Raw status code: {prob.status}")


# ---------------------------------------------------------------------------
# 4.  Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Test connectivity of a pushing-squares configuration "
                    "from a .scen file using a flow-based ILP (PuLP/CBC)."
    )
    parser.add_argument(
        "scen_file",
        type=Path,
        help="Path to the .scen file.",
    )
    parser.add_argument(
        "--root",
        type=int,
        default=0,
        metavar="ROOT_INDEX",
        help="0-based index of the module to use as the flow root (default: 0).",
    )
    args = parser.parse_args()

    if not args.scen_file.exists():
        sys.exit(f"File not found: {args.scen_file}")

    modules = parse_scen(args.scen_file)
    build_and_solve(modules, root_idx=args.root)


if __name__ == "__main__":
    main()
