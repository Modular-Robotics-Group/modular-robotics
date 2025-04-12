#ifndef MODULAR_ROBOTICS_DEBUG_UTIL_H
#define MODULAR_ROBOTICS_DEBUG_UTIL_H

// Debug logging that only runs when compiled in debug mode
#ifndef _DEBUG // This should work on Visual Studio but I can't test that
#ifdef NDEBUG // This works on CLion
#define DEBUG(msg, ...)
#else
#define DEBUGF(msg, ...) printf(msg, __VA_ARGS__)
#define DEBUG(msg) std::cout << msg
#endif
#else
#define DEBUGF(msg, ...) printf(msg, __VA_ARGS__)
#define DEBUG(msg) std::cout << msg
#endif
// These will only run if non-wasm
#if __EMSCRIPTEN__
#define LOG_NOWASM(msg, ...)
#else
#define LOG_NOWASM(msg, ...) std::cout << msg
#endif

#endif //MODULAR_ROBOTICS_DEBUG_UTIL_H
