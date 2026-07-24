import json

results = set()

def normalize(metamodule): 
    min_cell = metamodule[0]
    for cell in metamodule:  
        if min_cell[1] == cell[1]: 
            min_cell = min(min_cell, cell, key=lambda c: c[0]) # tiebreaker based on the x value
        else: 
            min_cell = min(min_cell, cell, key=lambda c: c[1])

    # normalizing each cell in the metamodule
    normalized = []
    for cell in metamodule: 
        normalized.append((cell[0] - min_cell[0], cell[1] - min_cell[1]))

    return normalized

def is_translation(metamodule): 

    # reflection in the x axis 
    metamodule_temp = []
    for cell in metamodule: 
        metamodule_temp.append((cell[0], -cell[1]))
    metamodule_temp = normalize(metamodule_temp)
    if set(metamodule_temp) in results: 
        return 1
    
    # reflection in the y axis 
    metamodule_temp = []
    for cell in metamodule: 
        metamodule_temp.append((-cell[0], cell[1]))
    metamodule_temp = normalize(metamodule_temp)
    if set(metamodule_temp) in results: 
        return 1
    
    # reflection across y=x
    metamodule_temp = []
    for cell in metamodule: 
        metamodule_temp.append((cell[1], cell[0]))
    metamodule_temp = normalize(metamodule_temp)
    if set(metamodule_temp) in results: 
        return 1
    
    # reflection across y=-x
    metamodule_temp = []
    for cell in metamodule: 
        metamodule_temp.append((-cell[1], -cell[0]))
    metamodule_temp = normalize(metamodule_temp)
    if set(metamodule_temp) in results: 
        return 1
    
    # rotation 90 deg 
    metamodule_temp = []
    for cell in metamodule: 
        metamodule_temp.append((cell[1], -cell[0]))
    metamodule_temp = normalize(metamodule_temp)
    if set(metamodule_temp) in results: 
        return 1

    # rotation 180 deg 
    metamodule_temp = []
    for cell in metamodule: 
        metamodule_temp.append((-cell[0], -cell[1]))
    metamodule_temp = normalize(metamodule_temp)
    if set(metamodule_temp) in results: 
        return 1

    # rotation 270 deg 
    metamodule_temp = []
    for cell in metamodule: 
        metamodule_temp.append((-cell[1], cell[0]))
    metamodule_temp = normalize(metamodule_temp)
    if set(metamodule_temp) in results: 
        return 1
    
    return 0
    

def write_metamodule(cells, width, height, filename):
    modules = []
    for c in cells:
        modules.append({
            "position": [c[0], c[1]],
            "static": False,
            "properties": {
                "colorProperty": {
                    "color": [0, 255, 255]
                }
            }
        })

    data = {
        "exists": True,
        "name": "Enumerated-Metamodule",
        "description": f"Polyomino metamodule fitting {width}x{height}",
        "moduleType": "CUBE",
        "order": 2,
        "axisSize": 13,
        "adjacencyMode": "Cube Face",
        "tensorPadding": 5,
        "modules": modules,
        "boundaries": []
    }

    with open(filename, "w") as f:
        json.dump(data, f, indent=2)

def is_border(pt):
    x, y = pt
    return y < 0 or (y == 0 and x < 0)   

def neighbors(pt): 
   x, y = pt 
   return [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]


def in_bounds(max_X, min_X, max_Y, n):
    new_cell_max_X = max(max_X, n[0])
    new_cell_min_X = min(min_X, n[0])
    new_cell_max_Y = max(max_Y, n[1]) # checking to see if it remains in bounds 
    return new_cell_max_X - new_cell_min_X + 1 <= width and new_cell_max_Y + 1 <= height


def ennumerator(start, untried, not_free, max_X, max_Y, min_X, metamodule):

    metamodule.append(start)
    # updating min and max 
    max_X = max(max_X, start[0])
    min_X = min(min_X, start[0])
    max_Y = max(max_Y, start[1])

    if max_X - min_X + 1 == width and max_Y + 1 == height: 
        metamodule = normalize(metamodule.copy())
        if not is_translation(set(metamodule.copy())):
            total = 1
            results.add(frozenset(metamodule.copy()))
            print(f"{metamodule}")
        else: 
            total = 0

    else: 
        total = 0
    
    neighbor_list = neighbors(start) # obtaining all neighbors of the point
    not_free_temp = set()

    for n in neighbor_list:
        if n not in not_free and not is_border(n): # adding each viable neighbor to the untried set 
            if in_bounds(max_X, min_X, max_Y, n): 
                untried.append(n)
                not_free.add(n)
                not_free_temp.add(n)

    while untried:
        n = untried.pop()
        if in_bounds(max_X, min_X, max_Y, n): 
            total += ennumerator(n, untried.copy(), not_free, max_X, max_Y, min_X, metamodule.copy())
    
    for n in not_free_temp:
        not_free.remove(n)

    return total


width = int(input("Enter width: ")) 
height = int(input("Enter height: ")) # ennumerator always has access to the dimensions 

ennumerate = ennumerator((0,0), [], {(0,0)}, 0, 0, 0, [])

print(f"{ennumerate}")

results = list(results) # converting the results back into a list 

for i in range(ennumerate): 
    write_metamodule(results[i], width, height, f"metamodule_{i}.json")
    print(f"wrote metamodule_{i}.json")