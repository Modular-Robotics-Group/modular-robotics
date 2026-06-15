import copy
import json
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
    for line in metadata[3:]:
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

def match_and_relabel_ids(computed_final_dict, init_modules, ref_modules):
    """
    Matches computed final positions against the initial positions of the reference
    file and returns:
      relabelled_modules : { ref_id : {gid, x, y, z} }  (initial coords, new id)
      id_map             : { old_id : new_id }

    Accepts already-loaded module dicts directly so callers can avoid redundant
    file I/O during a chained merge.
    """
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
            print(f"  Warning: no module found at "
                  f"({ref_data['x']}, {ref_data['y']}, {ref_data['z']}) "
                  f"to match reference ID {ref_id}")

    return relabelled_modules, id_map


def remap_movements(movements, id_map):
    """
    Rewrite a list of raw movement lines so that every module ID is replaced
    by its entry in id_map.  Lines that cannot be mapped are skipped with a
    warning.  Empty lines (separators) are preserved as-is.
    """
    new_movements = []
    for move in movements:
        if move == "":
            new_movements.append(move)
            continue

        split_move = move.split(",")
        raw_id = split_move[0].lstrip('*').strip()

        if raw_id not in id_map:
            print(f"  Warning: move references unknown module id '{raw_id}' – skipping.")
            continue

        prefix = '*' if split_move[0].lstrip().startswith('*') else ''
        split_move[0] = prefix + id_map[raw_id]
        new_movements.append(",".join(split_move))

    return new_movements


# ---------------------------------------------------------------------------
# Core merge: combine two already-loaded scenes into an in-memory scene
# ---------------------------------------------------------------------------

def merge_two_scenes(
    meta_a,     modules_a,  movements_a,
    meta_b,     modules_b,  movements_b,
    label_a="scene A", label_b="scene B",
):
    """
    Merge scene A (start + moves) with scene B (next set of moves).

    Returns:
      merged_meta      – metadata lines (from scene A)
      merged_modules   – initial module dict with IDs from scene B
      merged_movements – combined movement list (A moves then B moves),
                         both using the scene-B ID space
    """
    print(f"  Computing final positions after '{label_a}' moves …")
    final_computed = compute_final_positions(modules_a, movements_a)

    print(f"  Matching against '{label_b}' …")
    relabelled_modules, id_map = match_and_relabel_ids(
        final_computed, modules_a, modules_b
    )

    remapped_movements_a = remap_movements(movements_a, id_map)

    merged_movements = remapped_movements_a + movements_b

    return meta_a, relabelled_modules, merged_movements


# ---------------------------------------------------------------------------
# Chain merge: apply merge_two_scenes repeatedly across N scene files
# ---------------------------------------------------------------------------

def merge_scene_chain(scene_filepaths):
    """
    Given an ordered list of .scen file paths [s1, s2, s3, …], merge them
    left-to-right:
      m1 = merge(s1, s2)
      m2 = merge(m1, s3)
      m3 = merge(m2, s4)
      …
    Returns the final (metadata, modules_dict, movements_array) triple.
    """
    if len(scene_filepaths) < 1:
        raise ValueError("At least one scene file is required.")

    print(f"\n[1/{len(scene_filepaths)}] Loading '{scene_filepaths[0]}' as base …")
    meta, modules, movements = load_scen_file(scene_filepaths[0])

    for i, next_path in enumerate(scene_filepaths[1:], start=2):
        print(f"\n[{i}/{len(scene_filepaths)}] Merging with '{next_path}' …")
        next_meta, next_modules, next_movements = load_scen_file(next_path)

        meta, modules, movements = merge_two_scenes(
            meta,      modules,      movements,
            next_meta, next_modules, next_movements,
            label_a=f"accumulated scene 1–{i-1}",
            label_b=next_path,
        )

    return meta, modules, movements


# ---------------------------------------------------------------------------
# Scene file writer
# ---------------------------------------------------------------------------

def write_scen_file(output_path, metadata, modules, movements):
    """Serialise an in-memory scene back to a .scen file."""
    with open(output_path, 'w') as fout:
        for i, item in enumerate(metadata):
            if i == 3:
                print('', file=fout)
            print(item, file=fout)

        print("", file=fout)

        for mod_id, coord_dict in modules.items():
            gid    = coord_dict['gid']
            coords = (f"{int(coord_dict['x'])}, "
                      f"{int(coord_dict['y'])}, "
                      f"{int(coord_dict['z'])}")
            print(f"{mod_id}, {gid}, {coords}", file=fout)

        for move in movements:
            print(move, file=fout)

    print(f"\nMerged scenario written to '{output_path}'")


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

    Returns the Python dict that was serialised (useful for inspection).
    """
    metadata, initial_modules, movements = load_scen_file(scen_filepath)
    groups = parse_groups(metadata)

    name        = metadata[0] if len(metadata) > 0 else "Exported Configuration"
    description = metadata[1] if len(metadata) > 1 else ""
    module_type = metadata[2] if len(metadata) > 2 else "CUBE"

    final_positions = compute_final_positions(initial_modules, movements)

    all_coords = [(int(d['x']), int(d['y']), int(d['z']))
                  for d in final_positions.values()]

    if all_coords:
        span = max(
            max(c[0] for c in all_coords) - min(c[0] for c in all_coords),
            max(c[1] for c in all_coords) - min(c[1] for c in all_coords),
            max(c[2] for c in all_coords) - min(c[2] for c in all_coords),
        )
    else:
        span = 0

    PADDING   = 5
    axis_size = max(5, span + PADDING * 2)

    webvis_modules = []
    for mod_id, data in final_positions.items():
        gid   = data['gid']
        group = groups.get(gid, {"r": 255, "g": 255, "b": 255})
        color = rgb_to_int(group['r'], group['g'], group['b'])
        webvis_modules.append({
            "position": [int(data['x']), int(data['y']), int(data['z'])],
            "static":   False,
            "properties": {
                "colorProperty": {"color": color}
            }
        })

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
    print(f"  Bounding span: {span}  →  axisSize set to {axis_size}")

    return output_dict


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=(
            "Merge two or more .scen files into a single combined animation.\n\n"
            "Scenes are merged left-to-right: s1+s2 → m1, m1+s3 → m2, …\n\n"
            "Usage examples:\n"
            "  # Two files (original behaviour)\n"
            "  python file-merger-3.py --start_scene s1.scen --target_reference s2.scen\n\n"
            "  # Three or more files via --scenes\n"
            "  python file-merger-3.py --scenes s1.scen s2.scen s3.scen s4.scen\n\n"
            "  # With JSON export\n"
            "  python file-merger-3.py --scenes s1.scen s2.scen --export-json out.json"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    # --- input: two modes -----------------------------------------------
    # Mode A – original two-argument style (kept for backward compatibility)
    parser.add_argument("--start_scene",
                        help=".scen file with initial positions and first set of moves.")
    parser.add_argument("--target_reference",
                        help="Second .scen file whose IDs and moves are appended.")

    # Mode B – new multi-file style
    parser.add_argument("--scenes", nargs="+", metavar="SCENE",
                        help="Two or more .scen files to merge in order.")

    # --- output ----------------------------------------------------------
    parser.add_argument("--output-scen", default="./WebVis/Scenarios/final-combined.scen",
                        help="Destination path for the merged .scen file. "
                             "(default: ./WebVis/Scenarios/final-combined.scen)")
    parser.add_argument("--export-json", metavar="JSON_PATH",
                        help="Also export the final module state as a "
                             "WebVis-compatible JSON file at this path.")

    args = parser.parse_args()

    # ------------------------------------------------------------------
    # Resolve which input mode is being used
    # ------------------------------------------------------------------
    if args.scenes:
        if len(args.scenes) < 2:
            parser.error("--scenes requires at least two .scen files.")
        scene_paths = args.scenes

    elif args.start_scene:
        # Backward-compatible two-file mode
        scene_paths = [args.start_scene]
        if args.target_reference:
            scene_paths.append(args.target_reference)
        if len(scene_paths) < 2:
            parser.error("Provide --target_reference together with --start_scene, "
                         "or use --scenes with two or more files.")
    else:
        parser.error("Provide either --scenes <file1> <file2> … "
                     "or --start_scene <file> --target_reference <file>.")

    # ------------------------------------------------------------------
    # Run the chain merge
    # ------------------------------------------------------------------
    print(f"Merging {len(scene_paths)} scene file(s): {scene_paths}")
    final_meta, final_modules, final_movements = merge_scene_chain(scene_paths)

    # ------------------------------------------------------------------
    # Write the merged .scen file
    # ------------------------------------------------------------------
    write_scen_file(args.output_scen, final_meta, final_modules, final_movements)

    # ------------------------------------------------------------------
    # Optionally export final state as WebVis JSON
    # ------------------------------------------------------------------
    if args.export_json:
        export_final_state_to_json(args.output_scen, args.export_json)