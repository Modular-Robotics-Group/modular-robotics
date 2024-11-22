#include <fstream>
#include "SearchAnalysis.h"

std::chrono::high_resolution_clock::time_point SearchAnalysis::clock;
std::chrono::high_resolution_clock::time_point SearchAnalysis::timePaused;
nlohmann::json SearchAnalysis::data = nlohmann::json::object();
nlohmann::basic_json<>* SearchAnalysis::current = nullptr;
const nlohmann::json SearchAnalysis::emptyGraph = R"(
{
    "Title": "Title",
    "XLabel": "x",
    "YLabel": "y",
    "InterpolationOrder": 0,
    "Points": []
}
)"_json;

void SearchAnalysis::StartClock() {
    clock = std::chrono::high_resolution_clock::now();
}

void SearchAnalysis::PauseClock() {
    timePaused = std::chrono::high_resolution_clock::now();
}

void SearchAnalysis::ResumeClock() {
    clock += std::chrono::high_resolution_clock::now() - timePaused;
}

void SearchAnalysis::EnterGraph(const std::string& key) {
    if (!data.contains(key)) {
        data[key] = emptyGraph;
    }
    current = &(data[key]);
}

void SearchAnalysis::LabelGraph(const std::string& title) {
    (*current)["Title"] = title;
}

void SearchAnalysis::LabelAxes(const std::string& xLabel, const std::string& yLabel) {
    (*current)["XLabel"] = xLabel;
    (*current)["YLabel"] = yLabel;
}

void SearchAnalysis::SetInterpolationOrder(int order) {
    (*current)["InterpolationOrder"] = order;
}

void SearchAnalysis::InsertPoint(unsigned long x, unsigned long y) {
    (*current)["Points"].push_back({x, y});
}

void SearchAnalysis::InsertTimePoint(unsigned long y) {
    long t = std::chrono::duration_cast<std::chrono::microseconds>(timePaused - clock).count();
    (*current)["Points"].push_back({t, y});
}


void SearchAnalysis::ExportData(const std::string& filename) {
    std::ofstream out(filename);
    out << data.dump(2);
}

void SearchAnalysis::ClearData() {
    data.clear();
    current = nullptr;
}
