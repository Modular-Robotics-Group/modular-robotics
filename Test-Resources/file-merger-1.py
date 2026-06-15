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
                    x, y, z = float(parts[2]), float(parts[3]), float(parts[4])
                    modules_dict[mod_id] = {"x": x, "y": y, "z": z}
                    continue
                except ValueError:
                    pass 
        
        #Parse Movements 
        if blockNum > 2:
            if raw_line.startswith('*') and current_step:
                movements_array.append('\n'.join(current_step))
                current_step = []
            current_step.append(raw_line)
            continue

    # Push the final step block
    if current_step:
        movements_array.append('\n'.join(current_step))

    return METADATA_CONST, modules_dict, movements_array


def compute_final_positions(modules_dict, movements_array):
    """Applies the parsed movement steps to the initial module coordinates."""
    # Create a deep copy so we don't mutate the original initial state
    final_positions = copy.deepcopy(modules_dict)
    
    for step_block in movements_array:
        lines = step_block.strip().split('\n')
        
        for line in lines:
            if not line.strip():
                continue
                
            # Clean up the line: remove leading '*' or spaces
            clean_line = line.lstrip('* ')
            parts = [p.strip() for p in clean_line.split(',')]
            
            if len(parts) >= 5:
                mod_id = parts[0]
                dx = float(parts[2])
                dy = float(parts[3])
                dz = float(parts[4])
                
                # Apply the deltas if the module exists in our dictionary
                if mod_id in final_positions:
                    final_positions[mod_id]['x'] += dx
                    final_positions[mod_id]['y'] += dy
                    final_positions[mod_id]['z'] += dz
                    
    return final_positions


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parse a Scene file and compute final module positions.")
    parser.add_argument("input", help="Path to the input Scene file (e.g., scene.txt)")
    args = parser.parse_args()
    
    # 1. Load the data
    print(f"Loading {args.input}...")
    metadata, initial_modules, movements = load_scen_file(args.input)
    
    # 2. Compute the final state
    print(f"Computing final positions across {len(movements)} movement steps...")
    final_modules = compute_final_positions(initial_modules, movements)
    
    # 3. Output the results comparison
    print("\n--- Results ---")
    for mod_id in sorted(initial_modules.keys()):
        start = initial_modules[mod_id]
        end = final_modules[mod_id]
        print(f"Module {mod_id}:")
        print(f"  Start: (x: {start['x']}, y: {start['y']}, z: {start['z']})")
        print(f"  End:   (x: {end['x']}, y: {end['y']}, z: {end['z']})")