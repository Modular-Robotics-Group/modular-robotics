# The Enumerator

Generates all distinct polyominoes (2D) or polycubes (3D) that fit within a given set of dimensions, for use as metamodules.

## Scripts

- `enumerator_2D_free.py` — 2D polyominoes
- `enumerator_3D_free.py` — 3D polycubes

## Usage

Run either script and enter the dimensions when prompted:

## Output

Writes one JSON file per distinct metamodule (`metamodule_0.json`, `metamodule_1.json`, ...) to the current directory, in the format expected by the metamodule processor.

## Notes 

None of the metamodules generated are rigid transformations of any other 
generated metamodule (i.e. all metamodules are unique and cannot be transformed into
another) 