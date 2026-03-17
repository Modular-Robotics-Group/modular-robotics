# Integer Linear Program for Pushing-Squares Reconfiguration

## Setup and Notation

Work on a finite bounding grid $\mathcal{C}$ — a rectangular region of integer cells large enough to contain all configurations. A buffer of $O(n)$ cells around the convex hull of $I \cup F$ suffices. Let $\vec{E}$ denote all directed side-adjacency pairs in $\mathcal{C}$, and let $N(c)$ be the four side-adjacent neighbours of cell $c$.

### Move Catalogue

Let $\mathcal{M}$ be the set of all geometrically valid moves. Each move $\mu = (c_d^\mu,\, c_a^\mu,\, A^\mu,\, B^\mu)$ encodes:

| Symbol | Role |
|:---|:---|
| $c_d^\mu$ | **Departure cell** — currently occupied by the moving module |
| $c_a^\mu$ | **Arrival cell** — must be empty |
| $A^\mu \subseteq \mathcal{C}$ | **Guide cells** — must be *occupied* (the stationary module(s)) |
| $B^\mu \subseteq \mathcal{C}$ | **Clearance cells** — must be *empty* |

Concretely:

- **Rotation** around pivot $f$: $\quad A^\mu = \{f\}$, $\quad B^\mu = \{c_\text{corner}\}$, where $c_\text{corner}$ is the corner cell of $f$ that the module passes through.
- **Slide** along guides $f_1, f_2$: $\quad A^\mu = \{f_1, f_2\}$, $\quad B^\mu = \emptyset$.

### Layer Bound

From Dumitrescu–Pach, the reconfiguration distance is at most $4n^3$ — two passes through their $< 2n^3$ algorithm, once to reduce $I$ to a straight chain and once to expand it to $F$. Set $L = 4n^3$ as the layer count. In practice a much tighter bound can be used.

### Fixed Root

Choose any $r^* \in I$ and enforce that it remains occupied throughout (constraint **R** below). If $r^* \in I \cap F$ this is natural; if $I \cap F = \emptyset$ one can use the virtual-source variant noted in Remark 1.

---

## Decision Variables

**Occupancy variables** — whether cell $c$ is occupied at layer $i$:

$$x_c^i \in \{0,1\} \qquad c \in \mathcal{C},\quad 0 \le i \le L$$

**Move variables** — whether move $\mu$ is executed at step $i$ (between layers $i$ and $i+1$):

$$y_\mu^i \in \{0,1\} \qquad \mu \in \mathcal{M},\quad 0 \le i \le L-1$$

**Flow variables** — connectivity certificate at each layer:

$$f_{cc'}^i \ge 0 \qquad (c,c') \in \vec{E},\quad 0 \le i \le L$$

---

## ILP Formulation

### Objective

Minimise the total number of moves executed across all steps:

$$\text{minimise} \quad \sum_{i=0}^{L-1} \sum_{\mu \in \mathcal{M}} y_\mu^i \tag{OBJ}$$

### Configuration Validity

**Module count** — exactly $n$ modules at every layer (analogous to T2 in Mayer–Mutzel):

$$\sum_{c \in \mathcal{C}} x_c^i = n \qquad \forall\, i \tag{N}$$

**Boundary conditions** — first and last layers fixed to $I$ and $F$ (analogous to I1, I2):

$$x_c^0 = \mathbf{1}[c \in I], \qquad x_c^L = \mathbf{1}[c \in F] \qquad \forall\, c \tag{BC}$$

### Move Encoding

**State transition** — occupancy of each cell changes only via a move departing from or arriving at it (analogous to F1):

$$x_c^{i+1} = x_c^i \;-\!\!\sum_{\substack{\mu:\, c_d^\mu = c}} y_\mu^i \;+\!\!\sum_{\substack{\mu:\, c_a^\mu = c}} y_\mu^i \qquad \forall\, c,\, i \tag{T}$$

**At most one move per step** (analogous to F2):

$$\sum_{\mu \in \mathcal{M}} y_\mu^i \le 1 \qquad \forall\, i \tag{S}$$

**Symmetry breaking** — forces moves to occur as early as possible (analogous to F3):

$$\sum_{\mu} y_\mu^{i+1} \le \sum_{\mu} y_\mu^i \qquad \forall\, i \in [0, L-2] \tag{SB}$$

### Move Feasibility

**Departure occupied** — the moving module must be present:

$$y_\mu^i \le x_{c_d^\mu}^i \qquad \forall\, \mu,\, i \tag{D}$$

**Arrival empty** — the destination cell must be free:

$$y_\mu^i \le 1 - x_{c_a^\mu}^i \qquad \forall\, \mu,\, i \tag{A}$$

**Guides occupied** — all stationary helper modules must be present:

$$y_\mu^i \le x_r^i \qquad \forall\, \mu,\; \forall\, r \in A^\mu,\; \forall\, i \tag{O}$$

**Clearances empty** — the swept corner cell (rotations only) must be free:

$$y_\mu^i \le 1 - x_r^i \qquad \forall\, \mu,\; \forall\, r \in B^\mu,\; \forall\, i \tag{E}$$

### Connectivity

**Root always occupied** — required for the single-source flow formulation:

$$x_{r^*}^i = 1 \qquad \forall\, i \tag{R}$$

**Flow conservation at non-root cells** — each occupied non-root cell absorbs exactly one unit of flow (adapted from Haase–Müller):

$$\sum_{c' \in N(c)} f_{c'c}^i \;-\; \sum_{c' \in N(c)} f_{cc'}^i = x_c^i \qquad \forall\, c \ne r^*,\; \forall\, i \tag{K1}$$

**Flow conservation at root** — the root supplies $n - 1$ units, one per non-root module:

$$\sum_{c' \in N(r^*)} f_{c'r^*}^i \;-\; \sum_{c' \in N(r^*)} f_{r^*c'}^i = x_{r^*}^i - n \qquad \forall\, i \tag{K2}$$

**Flow capacity** — flow may only pass through occupied cells:

$$0 \le f_{cc'}^i \le (n-1)\, x_c^i \qquad \forall\, (c,c') \in \vec{E},\; \forall\, i \tag{K3}$$

---

## Constraint Summary

| Label | Scope | Purpose |
|:---:|:---|:---|
| **(OBJ)** | — | Minimise total moves |
| **(N)** | Every layer | Exactly $n$ modules present |
| **(BC)** | Layers $0$ and $L$ | Fix initial and target configurations |
| **(T)** | Every cell, every step | Occupancy changes only via executed moves |
| **(S)** | Every step | At most one move per step |
| **(SB)** | Steps $0\ldots L-2$ | Pack moves into early steps (symmetry break) |
| **(D)** | Every move, every step | Departure cell must be occupied |
| **(A)** | Every move, every step | Arrival cell must be empty |
| **(O)** | Every move, every step | All guide cells must be occupied |
| **(E)** | Every move, every step | All clearance cells must be empty |
| **(R)** | Every layer | Root cell always occupied |
| **(K1)** | Non-root cells, every layer | Flow conservation — non-root sinks |
| **(K2)** | Root cell, every layer | Flow conservation — root source |
| **(K3)** | Every arc, every layer | Flow capacity bounded by occupancy |

---

## Remarks

**Remark 1 — Root-free variant.** Constraint **(R)** requires $r^* \in I \cap F$. If no common cell exists, introduce binary variables $z_c^i \in \{0,1\}$ with $\sum_c z_c^i = 1$ and $z_c^i \le x_c^i$ to select the root dynamically per layer. Replace **(K2)** with a flow-balance constraint parameterised by $z_c^i$. This produces bilinear terms that must be linearised via standard big-$M$ products, adding $O(|\mathcal{C}| \cdot L)$ auxiliary variables.

**Remark 2 — Why connectivity needs explicit encoding.** In the Mayer–Mutzel flip-distance ILP, constraints T1 and T2 guarantee that each layer encodes a valid triangulation, which is by definition connected. The analogous constraint here **(N)** — correct module count — does not imply connectivity: $n$ modules can be correctly counted while forming a disconnected subgraph. Constraints **(K1)**–**(K3)** fill this role. A feasible flow from root $r^*$ to every other occupied cell exists if and only if the occupied cells form a connected subgraph, by the max-flow min-cut theorem applied to the grid graph.

**Remark 3 — Tightening with explicit (D) and (A).** Constraint **(T)** combined with binary $x$ variables already implicitly rules out executing a move from an empty cell — doing so would force $x_c^{i+1} < 0$, which is infeasible. Nonetheless, stating **(D)** and **(A)** explicitly is important: they tighten the LP relaxation by adding valid inequalities at the move level, significantly improving the bound at the root node of the branch-and-bound tree.

**Remark 4 — Bounding $L$ in practice.** The theoretical bound $4n^3$ grows rapidly and yields an impractically large ILP for even moderate $n$. If a greedy or heuristic reconfiguration algorithm provides an upper bound $L_0$, setting $L = L_0$ is strongly preferred. Symmetry-breaking constraint **(SB)** ensures the solver does not waste layers: if the optimal solution uses $k < L$ moves, all executed moves will appear in steps $0, \ldots, k-1$.