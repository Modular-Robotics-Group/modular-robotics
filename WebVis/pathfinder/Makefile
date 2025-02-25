all: Pathfinder

Pathfinder:
	emcc webmain.cpp -I ./single_include -o Pathfinder.js -sEXPORTED_FUNCTIONS=_pathfinder -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,stringToNewUTF8 -sNO_DISABLE_EXCEPTION_CATCHING

clean:
	rm -f Pathfinder.wasm Pathfinder.js
