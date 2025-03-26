all: Pathfinder

PropertyLib:
	emcc -fPIC -c -std=c++20 ../../pathfinder/modules/ModuleProperties.cpp -I ./em_boost -I ./single_include -sNO_DISABLE_EXCEPTION_CATCHING
	emcc -shared -std=c++20 ./ModuleProperties.o -I ./em_boost -I ./single_include -o "./Module Properties/PropertyLib.so" -sNO_DISABLE_EXCEPTION_CATCHING

ColorPropertyLib:
	emcc -fPIC -c -std=c++20 ../../pathfinder/properties/Colors.cpp -I ./em_boost -I ./single_include -sNO_DISABLE_EXCEPTION_CATCHING
	emcc -shared -std=c++20 ./Colors.o -I ./em_boost -I ./single_include -o "./Module Properties/ColorPropertyLib.so" -sNO_DISABLE_EXCEPTION_CATCHING

Pathfinder:
	emcc -fPIC -std=c++20 webmain.cpp -c -I ./em_boost -I ./single_include -sNO_DISABLE_EXCEPTION_CATCHING
	emcc -fPIC -std=c++20 ../../pathfinder/lattice/Lattice.cpp -c -I ./em_boost -I ./single_include -sNO_DISABLE_EXCEPTION_CATCHING
	emcc -fPIC --std=c++20 ../../pathfinder/lattice/LatticeSetup.cpp -c -I ./em_boost -I ./single_include -sNO_DISABLE_EXCEPTION_CATCHING
	emcc -fPIC --std=c++20 ../../pathfinder/modules/ModuleManager.cpp -c -I ./em_boost -I ./single_include -sNO_DISABLE_EXCEPTION_CATCHING
	emcc -fPIC --std=c++20 ../../pathfinder/moves/Isometry.cpp -c -I ./em_boost -I ./single_include -sNO_DISABLE_EXCEPTION_CATCHING
	emcc -fPIC --std=c++20 ../../pathfinder/moves/MoveManager.cpp -c -I ./em_boost -I ./single_include -sNO_DISABLE_EXCEPTION_CATCHING
	emcc -fPIC --std=c++20 ../../pathfinder/moves/Scenario.cpp -c -I ./em_boost -I ./single_include -sNO_DISABLE_EXCEPTION_CATCHING
	emcc -fPIC --std=c++20 ../../pathfinder/search/ConfigurationSpace.cpp -c -I ./em_boost -I ./single_include -sNO_DISABLE_EXCEPTION_CATCHING
	emcc -fPIC --std=c++20 ../../pathfinder/search/HeuristicCache.cpp -c -I ./em_boost -I ./single_include -sNO_DISABLE_EXCEPTION_CATCHING
	emcc -fPIC --std=c++20 ../../pathfinder/search/SearchAnalysis.cpp -c -I ./em_boost -I ./single_include -sNO_DISABLE_EXCEPTION_CATCHING
	emcc -fPIC --std=c++20 ../../pathfinder/utility/color_util.cpp -c -I ./em_boost -I ./single_include -sNO_DISABLE_EXCEPTION_CATCHING
	emcc -I ./em_boost -L ./em_boost/stage/lib -l:libboost_system.a -l:libboost_filesystem.a -L "./Module Properties" -l:PropertyLib.so -l:ColorPropertyLib.so -std=c++20 webmain.o Lattice.o LatticeSetup.o ModuleManager.o Isometry.o MoveManager.o Scenario.o ConfigurationSpace.o HeuristicCache.o SearchAnalysis.o color_util.o em_boost/stage/lib/libboost_filesystem.a -I ./single_include -o Pathfinder.js --embed-file "Module Properties" --embed-file Moves -sEXPORTED_FUNCTIONS=_pathfinder -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,stringToNewUTF8 -sNO_DISABLE_EXCEPTION_CATCHING

clean:
	rm -f Pathfinder.wasm Pathfinder.js
