cmake_minimum_required(VERSION 3.28)
project(Pathfinder)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -lboost_filesystem -lboost_system")
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY "${PROJECT_BINARY_DIR}/Module Properties")

find_package(Boost REQUIRED COMPONENTS filesystem system)
if(Boost_FOUND)
    include_directories(${Boost_INCLUDE_DIR})
    add_definitions("-DHAS_BOOST")
endif()

if(NOT "${CMAKE_CURRENT_BINARY_DIR}" STREQUAL "${CMAKE_CURRENT_LIST_DIR}")
    if(EXISTS ${CMAKE_CURRENT_BINARY_DIR}/Moves)
        add_custom_target(clear_moves
                COMMAND rm -r "${CMAKE_CURRENT_BINARY_DIR}/Moves"
        )
    endif()

    add_custom_target(copy_moves
            COMMAND ${CMAKE_COMMAND} -E copy_directory ${CMAKE_CURRENT_LIST_DIR}/Moves ${CMAKE_CURRENT_BINARY_DIR}/Moves
    )

    add_custom_target(copy_examples
            COMMAND ${CMAKE_COMMAND} -E copy_directory ${CMAKE_CURRENT_LIST_DIR}/docs/examples ${CMAKE_CURRENT_BINARY_DIR}/docs/examples
    )

    add_custom_target(copy_properties
            COMMAND ${CMAKE_COMMAND} -E copy_directory "${CMAKE_CURRENT_LIST_DIR}/Module Properties" "${CMAKE_CURRENT_BINARY_DIR}/Module Properties"
    )
endif()

add_library(PropertyLib SHARED pathfinder/modules/ModuleProperties.cpp)

set_target_properties(PropertyLib PROPERTIES PREFIX "")

add_library(ColorPropertyLib MODULE pathfinder/properties/Colors.cpp pathfinder/utility/color_util.cpp)

set_target_properties(ColorPropertyLib PROPERTIES PREFIX "")

target_link_libraries(ColorPropertyLib PropertyLib)

add_dependencies(ColorPropertyLib PropertyLib copy_properties)

add_executable(Pathfinder
        pathfinder/main.cpp
        pathfinder/utility/debug_util.h
        pathfinder/modules/ModuleManager.h
        pathfinder/modules/ModuleManager.cpp
        pathfinder/moves/MoveManager.h
        pathfinder/moves/MoveManager.cpp
        pathfinder/lattice/Lattice.h
        pathfinder/lattice/Lattice.cpp
        pathfinder/lattice/LatticeSetup.h
        pathfinder/lattice/LatticeSetup.cpp
        pathfinder/moves/Scenario.h
        pathfinder/moves/Scenario.cpp
        pathfinder/search/ConfigurationSpace.h
        pathfinder/search/ConfigurationSpace.cpp
        pathfinder/search/SearchAnalysis.h
        pathfinder/search/SearchAnalysis.cpp
        pathfinder/modules/Metamodule.h
        pathfinder/modules/Metamodule.cpp
        pathfinder/moves/Isometry.h
        pathfinder/moves/Isometry.cpp
        pathfinder/search/HeuristicCache.cpp
        pathfinder/search/HeuristicCache.h
        pathfinder/modules/ModuleProperties.h
        pathfinder/utility/color_util.cpp
        pathfinder/utility/color_util.h)

target_link_libraries(Pathfinder PropertyLib)
target_link_libraries(Pathfinder Boost::system)
target_link_libraries(Pathfinder Boost::filesystem)

if(NOT "${CMAKE_CURRENT_BINARY_DIR}" STREQUAL "${CMAKE_CURRENT_LIST_DIR}")
    add_dependencies(Pathfinder copy_moves copy_examples copy_properties)
    if(EXISTS "${CMAKE_CURRENT_BINARY_DIR}/Moves")
        add_dependencies(copy_moves clear_moves)
    endif()
endif()