def load_scen_file(filepath):
    # 1. The Meta Data Const
    METADATA_CONST = {
        "headers": [],
        "groups": []
    }
    # 2. The Modules Dictionary
    modules_dict = {}
    # 3. The Movement Strings Array
    movements_array = []
    
    current_step = []

    with open(filepath, 'r') as f:
        lines = f.readlines()

    for line in lines:
        raw_line = line.rstrip('\n')
        stripped = raw_line.strip()
        
        if not stripped:
            continue
            
        # A. Parse Movements
        if raw_line.startswith('*') or (raw_line.startswith(' ') and ',' in raw_line):
            if raw_line.startswith('*') and current_step:
                movements_array.append('\n'.join(current_step))
                current_step = []
            current_step.append(raw_line)
            continue
            
        # B. Parse Groups
        if '//' in raw_line or "Group definition" in raw_line:
            METADATA_CONST["groups"].append(stripped)
            continue
            
        # C. Parse Modules
        parts = [p.strip() for p in stripped.split(',')]
        if len(parts) >= 5:
            try:
                mod_id = parts[0]
                x, y, z = float(parts[2]), float(parts[3]), float(parts[4])
                
                # Sanity check for un-commented group definitions
                if float(parts[1]) > 100 or x > 100:
                    METADATA_CONST["groups"].append(stripped)
                else:
                    modules_dict[mod_id] = {"x": x, "y": y, "z": z}
                continue
            except ValueError:
                pass 
        
        # D. Headers
        METADATA_CONST["headers"].append(stripped)

    # Push the final step block
    if current_step:
        movements_array.append('\n'.join(current_step))

    return METADATA_CONST, modules_dict, movements_array


# Example Usage:
METADATA, modules, movements = load_scen_file("./WebVis/Scenarios/2x2x2 Metamodule.scen")
print(modules)

