import solver from "javascript-lp-solver";

console.log("Solver loaded:", !!solver);

const swimmers = [
    { id: "1", times: [{ event: "A", personalBestMs: 50000 }] },
    { id: "2", times: [{ event: "A", personalBestMs: 51000 }] },
    { id: "3", times: [{ event: "A", personalBestMs: 49000 }] }
];
const events = ["A"];

const model = {
    optimize: "totalPoints",
    opType: "max",
    constraints: {
        "rosterLimit": { max: 2 },
        "event_A_max": { max: 2 },
        "event_A_min": { min: 1 },
        "link|1|A": { max: 0 },
        "link|2|A": { max: 0 },
        "link|3|A": { max: 0 },
    },
    variables: {
        "roster_1": { rosterLimit: 1, "link|1|A": -1, totalPoints: 0 },
        "roster_2": { rosterLimit: 1, "link|2|A": -1, totalPoints: 0 },
        "roster_3": { rosterLimit: 1, "link|3|A": -1, totalPoints: 0 },
        
        "assign|1|A": { totalPoints: 10, "event_A_max": 1, "event_A_min": 1, "link|1|A": 1 },
        "assign|2|A": { totalPoints: 8, "event_A_max": 1, "event_A_min": 1, "link|2|A": 1 },
        "assign|3|A": { totalPoints: 12, "event_A_max": 1, "event_A_min": 1, "link|3|A": 1 },
        
        "empty_A": { totalPoints: -1000, "event_A_min": 1 }
    },
    ints: {
        "roster_1": 1, "roster_2": 1, "roster_3": 1,
        "assign|1|A": 1, "assign|2|A": 1, "assign|3|A": 1,
        "empty_A": 1
    }
};

const solution = solver.Solve(model);
console.log("Solution:", solution);

if (solution.result === 22) { // 12 + 10 (Swimmers 3 and 1)
    console.log("TEST PASSED: Correctly selected top 2 swimmers.");
} else {
    console.log("TEST FAILED: Unexpected result.");
}
