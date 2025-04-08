all: PropertyLib ColorPropertyLib Pathfinder

PropertyLib:
	emcc -fwasm-exceptions -O3 -fPIC -c --std=c++20 ../../pathfinder/modules/ModuleProperties.cpp -I ./em_boost -I ./single_include
	emcc -fwasm-exceptions -O3 -sALLOW_MEMORY_GROWTH -shared --std=c++20 ./ModuleProperties.o -I ./em_boost -I ./single_include -o "./Module Properties/PropertyLib.so"

ColorPropertyLib:
	emcc -fwasm-exceptions -O3 -shared -sSIDE_MODULE=1 -fPIC -c --std=c++20 ../../pathfinder/properties/Colors.cpp -I ./em_boost -I ./single_include
	emcc -fwasm-exceptions -O3 -sALLOW_MEMORY_GROWTH -shared -sSIDE_MODULE=1 --std=c++20 ./Colors.o -I ./em_boost -I ./single_include -o "./Module Properties/ColorPropertyLib.so"

Pathfinder:
	emcc -fwasm-exceptions -DCONFIG_MOD_DATA_STORAGE=1 -O3 -fPIC --std=c++20 webmain.cpp -c -I ./em_boost -I ./single_include
	emcc -fwasm-exceptions -O3 -fPIC --std=c++20 ../../pathfinder/lattice/Lattice.cpp -c -I ./em_boost -I ./single_include
	emcc -fwasm-exceptions -O3 -fPIC --std=c++20 ../../pathfinder/lattice/LatticeSetup.cpp -c -I ./em_boost -I ./single_include
	emcc -fwasm-exceptions -DCONFIG_MOD_DATA_STORAGE=1 -O3 -fPIC --std=c++20 ../../pathfinder/modules/ModuleManager.cpp -c -I ./em_boost -I ./single_include
	emcc -fwasm-exceptions -O3 -fPIC --std=c++20 ../../pathfinder/moves/Isometry.cpp -c -I ./em_boost -I ./single_include
	emcc -fwasm-exceptions -O3 -fPIC --std=c++20 ../../pathfinder/moves/MoveManager.cpp -c -I ./em_boost -I ./single_include
	emcc -fwasm-exceptions -O3 -fPIC --std=c++20 ../../pathfinder/moves/Scenario.cpp -c -I ./em_boost -I ./single_include
	emcc -fwasm-exceptions -DCONFIG_VERBOSE=2 -DCONFIG_REALTIME=0 -O3 -fPIC --std=c++20 ../../pathfinder/search/ConfigurationSpace.cpp -c -I ./em_boost -I ./single_include
	emcc -fwasm-exceptions -O3 -fPIC --std=c++20 ../../pathfinder/search/HeuristicCache.cpp -c -I ./em_boost -I ./single_include
	emcc -fwasm-exceptions -O3 -fPIC --std=c++20 ../../pathfinder/search/SearchAnalysis.cpp -c -I ./em_boost -I ./single_include
	emcc -fwasm-exceptions -O3 -fPIC --std=c++20 ../../pathfinder/utility/color_util.cpp -c -I ./em_boost -I ./single_include
	export EMCC_FORCE_STDLIBS=1
	emcc --pre-js PathfinderModule.js -fwasm-exceptions -O3 -sALLOW_MEMORY_GROWTH -sSTACK_SIZE=1048576 -sMAXIMUM_MEMORY=4294967296 -sASSERTIONS -sMAIN_MODULE=1 -I ./em_boost -L ./em_boost/stage/lib -l:libboost_system.a -l:libboost_filesystem.a -L "./Module Properties" -l:PropertyLib.so --std=c++20 webmain.o Lattice.o LatticeSetup.o ModuleManager.o Isometry.o MoveManager.o Scenario.o ConfigurationSpace.o HeuristicCache.o SearchAnalysis.o color_util.o -I ./single_include -o ../src/Pathfinder.js --embed-file "Module Properties" --embed-file Moves -sEXPORTED_FUNCTIONS=_pathfinder,_config2Scen,_exceptionTest -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,stringToNewUTF8

clean:
	rm -f Pathfinder.wasm Pathfinder.js
