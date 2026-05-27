import copy
import argparse

def load_scen_file(filepath):
    """Parses the scene file into metadata, a modules dictionary, and a movements array."""
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
    
        if blockNum < 3: #not in the movement block
            if not stripped:
                continue

        if blockNum == 0:
            METADATA_CONST.append(stripped)
            continue
            
        # B. Parse Groups (Contains '//' or 'Group definition')
        if blockNum == 1:
            METADATA_CONST.append(stripped)
            continue
            
            
        # C. Parse Modules (5 comma-separated values)
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
        
        #Parse Movements 
        if blockNum > 2:
            movements_array.append(raw_line)
            # current_step.append(raw_line)
            continue

    # Push the final step block
    if current_step:
        movements_array.append('\n'.join(current_step))

    return METADATA_CONST, modules_dict, movements_array


def compute_final_positions(modules_dict, movements_array):
    """Applies movements to initial modules to find their final spatial positions."""
    final_positions = copy.deepcopy(modules_dict)
    for step_block in movements_array:
        lines = step_block.strip().split('\n')
        for line in lines:
            clean_line = line.lstrip('* ')
            parts = [p.strip() for p in clean_line.split(',')]
            if len(parts) >= 5:
                mod_id, dx, dy, dz = parts[0], float(parts[2]), float(parts[3]), float(parts[4])
                if mod_id in final_positions:
                    final_positions[mod_id]['x'] += dx
                    final_positions[mod_id]['y'] += dy
                    final_positions[mod_id]['z'] += dz
    return final_positions

def match_and_relabel_ids(computed_final_dict, initial_file_path, reference_file_path):
    """
    Step 3: Matches computed positions against a reference file and adopts the new IDs.
    Returns a dictionary: { "new_id": {x, y, z} }
    """
    # Load the reference file to get the target IDs and their positions
    _, ref_modules, _ = load_scen_file(reference_file_path)
    _, init_modules, _ = load_scen_file(initial_file_path)

    relabelled_modules = {}
    id_map = {}

    # We look through the reference modules and find which computed module is at that spot
    for ref_id, ref_data in ref_modules.items():
        match_found = False
        for comp_id, comp_data in computed_final_dict.items():
            # Check if coordinates match
            if (comp_data['x'] == ref_data['x'] and 
                comp_data['y'] == ref_data['y'] and 
                comp_data['z'] == ref_data['z']):
                
                relabelled_modules[ref_id] = initial_modules[comp_id]
                id_map[comp_id] = ref_id
                match_found = True
                break
        
        if not match_found:
            print(f"Warning: No module found at position ({ref_data['x']}, {ref_data['y']}, {ref_data['z']}) to match Reference ID {ref_id}")

    return relabelled_modules, id_map

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process scene movements and relabel IDs based on a second state file.")
    parser.add_argument("start_scene", help="The .scen file containing initial positions and movements.")
    parser.add_argument("target_reference", help="The second .scen file to pull new IDs from.")
    args = parser.parse_args()
    
    # Step 1: Load and compute
    metadata, initial_modules, movements = load_scen_file(args.start_scene)
    _, _, final_movements = load_scen_file(args.target_reference)
    final_computed = compute_final_positions(initial_modules, movements)
    
    # Step 2: Relabel based on the second file
    print(f"Matching computed positions against {args.target_reference}...")
    relabelled_final, id_map = match_and_relabel_ids(final_computed, args.start_scene, args.target_reference)

    new_movements = []
    for move in movements:
        if move == "": 
            new_movements.append(move)
            continue

        split_move = move.split(",")
        split_move[0] = id_map[split_move[0].strip("*")]
        
        new_movements.append(",".join(split_move))
        

    # Output Results
    print("\n--- Final Modules (Relabelled with Target IDs) ---")
    # for mod_id, data in sorted(relabelled_final.items()):
    #     print(f"ID: {mod_id} | Position: ({data['x']}, {data['y']}, {data['z']})")

    # print(metadata)
    # print(relabelled_final.items())
    fout = open("./WebVis/Scenarios/final-combined.scen", 'w')
    count = 0
    for item in metadata:
        if count == 3:
            print('', file=fout)
        
        print(item, file=fout)
        count += 1
    
    print("", file=fout)

    for id, coord_dict in relabelled_final.items():
        coords = ""
        for axis, val in coord_dict.items():
            coords += str(int(val)) + ", "
        
        coords = coords[:-2]

        print(id + ",", coords, file=fout)
    
    # print("", file=fout)4

    for move in new_movements:
        print(move, file=fout)
        # print("", file=fout)

    for move in final_movements:
        print(move, file=fout)
        # print("", file=fout)

    