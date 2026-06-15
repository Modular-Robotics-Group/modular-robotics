import copy
import json
import math
import argparse


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def load_scen_file(filepath):
    """Parses a .scen file into metadata lines, a modules dict, and a movements list."""
    METADATA_CONST = []
    modules_dict = {}
    movements_array = []
    current_step = []

    with open(filepath, 'r') as f:
        lines = f.readlines()

    blockNum = 0
    for line in lines:
        if line == '\n':
            blockNum += 1

        raw_line = line.rstrip('\n')
        stripped = raw_line.strip()

        if blockNum < 3:  # not in the movement block
            if not stripped:
                continue

        if blockNum == 0:
            METADATA_CONST.append(stripped)
            continue

        if blockNum == 1:
            METADATA_CONST.append(stripped)
            continue

        if blockNum == 2:
            parts = [p.strip() for p in stripped.split(',')]
            if len(parts) >= 5:
                try:
                    mod_id = parts[0]
                    gid, x, y, z = int(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])
                    modules_dict[mod_id] = {"gid": gid, "x": x, "y": y, "z": z}
                    continue
                except ValueError:
                    pass

        if blockNum > 2:
            movements_array.append(raw_line)
            continue

    if current_step:
        movements_array.append('\n'.join(current_step))

    return METADATA_CONST, modules_dict, movements_array


def parse_groups(metadata):
    """
    Extract group definitions from metadata lines (Block 1 entries).

    Metadata layout after load_scen_file:
      index 0 : name
      index 1 : description
      index 2 : module type  (e.g. "CUBE")
      index 3+ : group lines  e.g. "1, 255, 0, 0, 100"

    Returns:
      {
        group_id (int): {"r": int, "g": int, "b": int, "size": int},
        ...
      }
    """
    groups = {}
    # First three entries are name / description / module-type
    for line in metadata[3:]:
        # Strip inline comments
        line = line.split('//')[0].strip()
        parts = [p.strip() for p in line.split(',')]
        if len(parts) >= 5:
            try:
                gid  = int(parts[0])
                r    = int(parts[1])
                g    = int(parts[2])
                b    = int(parts[3])
                size = int(parts[4])
                groups[gid] = {"r": r, "g": g, "b": b, "size": size}
            except ValueError:
                pass
    return groups


# ---------------------------------------------------------------------------
# Position computation
# ---------------------------------------------------------------------------

def compute_final_positions(modules_dict, movements_array):
    """Applies every move in movements_array to modules_dict and returns final positions."""
    final_positions = copy.deepcopy(modules_dict)
    for step_block in movements_array:
        lines = step_block.strip().split('\n')
        for line in lines:
            clean_line = line.lstrip('* ')
            parts = [p.strip() for p in clean_line.split(',')]
            if len(parts) >= 5:
                mod_id = parts[0]
                dx, dy, dz = float(parts[2]), float(parts[3]), float(parts[4])
                if mod_id in final_positions:
                    final_positions[mod_id]['x'] += dx
                    final_positions[mod_id]['y'] += dy
                    final_positions[mod_id]['z'] += dz
    return final_positions


# ---------------------------------------------------------------------------
# ID matching / relabelling
# ---------------------------------------------------------------------------

def match_and_relabel_ids(computed_final_dict, initial_file_path, reference_file_path):
    """
    Matches computed final positions against the initial positions of the reference
    file and returns:
      relabelled_modules : { ref_id : {gid, x, y, z}  }   (initial coords, new id)
      id_map             : { old_id : new_id }
    """
    _, ref_modules,  _ = load_scen_file(reference_file_path)
    _, init_modules, _ = load_scen_file(initial_file_path)

    relabelled_modules = {}
    id_map = {}

    for ref_id, ref_data in ref_modules.items():
        match_found = False
        for comp_id, comp_data in computed_final_dict.items():
            if (comp_data['x'] == ref_data['x'] and
                    comp_data['y'] == ref_data['y'] and
                    comp_data['z'] == ref_data['z']):
                relabelled_modules[ref_id] = init_modules[comp_id]
                id_map[comp_id] = ref_id
                match_found = True
                break

        if not match_found:
            print(f"Warning: No module found at position "
                  f"({ref_data['x']}, {ref_data['y']}, {ref_data['z']}) "
                  f"to match Reference ID {ref_id}")

    return relabelled_modules, id_map


# ---------------------------------------------------------------------------
# JSON export
# ---------------------------------------------------------------------------

def rgb_to_int(r, g, b):
    """Pack R,G,B bytes into a single integer (same convention as WebVis JSON)."""
    return (r << 16) | (g << 8) | b


def export_final_state_to_json(scen_filepath, output_json_path):
    """
    Reads a .scen file, applies all moves to find the final positions of every
    module, then writes a JSON file that conforms to the WebVis format.

    Args:
        scen_filepath   : path to the combined .scen file
        output_json_path: destination path for the output .json file

    Returns:
        The Python dict that was serialised to JSON (useful for inspection /
        further processing without re-parsing the file).
    """
    metadata, initial_modules, movements = load_scen_file(scen_filepath)
    groups = parse_groups(metadata)

    # Derive top-level fields from metadata
    name        = metadata[0] if len(metadata) > 0 else "Exported Configuration"
    description = metadata[1] if len(metadata) > 1 else ""
    module_type = metadata[2] if len(metadata) > 2 else "CUBE"

    # Compute where every module ends up
    final_positions = compute_final_positions(initial_modules, movements)

    # Build the bounding box so we can choose a sensible axisSize
    all_coords = [(int(d['x']), int(d['y']), int(d['z']))
                  for d in final_positions.values()]

    if all_coords:
        min_x = min(c[0] for c in all_coords)
        min_y = min(c[1] for c in all_coords)
        min_z = min(c[2] for c in all_coords)
        max_x = max(c[0] for c in all_coords)
        max_y = max(c[1] for c in all_coords)
        max_z = max(c[2] for c in all_coords)
        span  = max(max_x - min_x, max_y - min_y, max_z - min_z)
    else:
        span = 0

    # axisSize: smallest power of two that comfortably fits the configuration,
    # with a minimum of 5 and a small padding margin.
    PADDING    = 5
    axis_size  = max(5, span + PADDING * 2)

    # Build the modules array
    webvis_modules = []
    for mod_id, data in final_positions.items():
        gid   = data['gid']
        group = groups.get(gid, {"r": 255, "g": 255, "b": 255})  # default white
        color = rgb_to_int(group['r'], group['g'], group['b'])

        webvis_modules.append({
            "position": [int(data['x']), int(data['y']), int(data['z'])],
            "static":   False,
            "properties": {
                "colorProperty": {
                    "color": color
                }
            }
        })

    # Assemble the full JSON object
    adjacency_mode = "Cube Face" if module_type == "CUBE" else "RD Face"

    output_dict = {
        "exists":        True,
        "name":          name,
        "description":   description,
        "moduleType":    module_type,
        "order":         3,
        "axisSize":      axis_size,
        "adjacencyMode": adjacency_mode,
        "tensorPadding": PADDING,
        "modules":       webvis_modules,
        "boundaries":    []
    }

    with open(output_json_path, 'w') as f:
        json.dump(output_dict, f, indent=2)

    print(f"Exported {len(webvis_modules)} modules to '{output_json_path}'")
    print(f"  Bounding span : {span}  →  axisSize set to {axis_size}")

    return output_dict


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Merge two .scen files and optionally export the final state as WebVis JSON."
    )
    parser.add_argument("--start_scene",
                        help=".scen file with initial positions and first set of moves.")
    parser.add_argument("--target_reference",
                        help="Second .scen file whose IDs and moves are appended.")
    parser.add_argument("--output-scen", default="./WebVis/Scenarios/final-combined.scen",
                        help="Destination path for the merged .scen file. "
                             "(default: ./WebVis/Scenarios/final-combined.scen)")
    parser.add_argument("--export-json", metavar="JSON_PATH",
                        help="If provided, also export the final module state as a "
                             "WebVis-compatible JSON file at this path.")
    args = parser.parse_args()

    # ------------------------------------------------------------------
    # Step 1 – load both files
    # ------------------------------------------------------------------
    metadata, initial_modules, movements = load_scen_file(args.start_scene)
    
    # ------------------------------------------------------------------
    # Step 2 – compute where every module in file-1 ends up
    # ------------------------------------------------------------------
    final_computed = compute_final_positions(initial_modules, movements)

    # ------------------------------------------------------------------
    # Step 3 – relabel IDs so they are consistent with file-2
    # ------------------------------------------------------------------
    if args.target_reference:
        _, _, final_movements = load_scen_file(args.target_reference)
    
        print(f"Matching computed positions against '{args.target_reference}' …")
        relabelled_final, id_map = match_and_relabel_ids(
            final_computed, args.start_scene, args.target_reference
        )
    
    else:
        relabelled_final = initial_modules
        
    # Rewrite the first-file moves using the new IDs
    new_movements = []
    for move in movements:
        if move == "":
            new_movements.append(move)
            continue

        split_move = move.split(",")
        raw_id = split_move[0].lstrip('*').strip()

        if args.target_reference:
            if raw_id not in id_map:
                print(f"Warning: move references unknown module id '{raw_id}' – skipping.")
                continue

        # Preserve the checkpoint flag ('*') if present
        prefix = '*' if split_move[0].lstrip().startswith('*') else ''
        
        if args.target_reference:
            split_move[0] = prefix + id_map[raw_id]
        
        new_movements.append(",".join(split_move))

    # ------------------------------------------------------------------
    # Step 4 – write the merged .scen file
    # ------------------------------------------------------------------
    with open(args.output_scen, 'w') as fout:
        # Block 1: metadata (name, description, type) + blank line
        for i, item in enumerate(metadata):
            if i == 3:          # blank line before group definitions
                print('', file=fout)
            print(item, file=fout)

        # Blank line before module definitions
        print("", file=fout)

        # Block 3: module definitions (initial coords, new IDs)
        for mod_id, coord_dict in relabelled_final.items():
            gid    = coord_dict['gid']
            coords = f"{int(coord_dict['x'])}, {int(coord_dict['y'])}, {int(coord_dict['z'])}"
            print(f"{mod_id}, {gid}, {coords}", file=fout)

        # Block 4: merged moves
        for move in new_movements:
            print(move, file=fout)

        if args.target_reference:
            for move in final_movements:
                print(move, file=fout)

    print(f"Merged scenario written to '{args.output_scen}'")

    # ------------------------------------------------------------------
    # Step 5 (optional) – export final state as WebVis JSON
    # ------------------------------------------------------------------
    if args.export_json:
        export_final_state_to_json(args.output_scen, args.export_json)
