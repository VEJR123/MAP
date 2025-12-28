import { Swimmer } from "@/entities/swimmer";
import { calculateFinaPoints, getFinaDetails } from "@/core/utils";
// @ts-ignore
import solver from "javascript-lp-solver";

export interface LeagueAssignment {
  swimmerId: string;
  eventId: string;
  points: number;
}

export interface LeagueResult {
  roster: Swimmer[];
  assignments: LeagueAssignment[];
  totalPoints: number;
  status: string;
}

const ROSTER_SIZE = 16;
const MAX_INDIVIDUAL_EVENTS = 4;
const MAX_SWIMMERS_PER_EVENT = 2;
const PENALTY_EMPTY_EVENT = 10000;

// Normalize event names from database codes to Czech display names
// e.g., "100K" -> "100m Volný způsob", "100Z" -> "100m Znak"
const normalizeEventName = (eventCode: string): string => {
  // Extract distance from start
  const distanceMatch = eventCode.match(/^(\d+)/);
  const distance = distanceMatch ? distanceMatch[1] : '';
  
  // Get stroke from last character
  const lastChar = eventCode.slice(-1).toUpperCase();
  let stroke = '';
  
  switch (lastChar) {
    case 'K': stroke = 'Volný způsob'; break;
    case 'Z': stroke = 'Znak'; break;
    case 'O': stroke = 'Polohový závod'; break;
    case 'P': stroke = 'Prsa'; break;
    case 'M': stroke = 'Motýlek'; break;
    default: return eventCode; // Return unchanged if not recognized
  }
  
  return distance ? `${distance}m ${stroke}` : eventCode;
};

// Map from normalized names to database codes for reverse lookup
const createEventCodeMap = (allEventCodes: string[]): Record<string, string> => {
  const map: Record<string, string> = {};
  allEventCodes.forEach(code => {
    const normalized = normalizeEventName(code);
    map[normalized] = code;
  });
  return map;
};

export const solveLeagueTeam = (
  swimmers: Swimmer[],
  events: string[],
  poolSize: number = 50
): LeagueResult => {
  // Validate input
  if (!swimmers || swimmers.length === 0) {
    throw new Error("Žádní plavci nejsou vybráni.");
  }
  if (!events || events.length === 0) {
    throw new Error("Žádné disciplíny nejsou definovány.");
  }

  // Log input for diagnostics
  console.log("Input swimmers:", swimmers.length);
  console.log("Input events:", events.length);
  console.log("Pool size:", poolSize);
  console.log("Expected events:", events);
  swimmers.forEach((s, i) => {
    console.log(`Swimmer ${i}: ${s.id}, times:`, s.times ? s.times.length : "NO TIMES ARRAY");
    if (s.times && s.times.length > 0) {
      console.log(`  Sample times from swimmer ${s.id}:`, s.times.slice(0, 3).map(t => t.event));
    }
  });

  const model: any = {
    optimize: "totalPoints",
    opType: "max",
    constraints: {},
    variables: {},
    ints: {}, // All variables are binary (integers 0 or 1)
  };

  // 1. Define Constraints
  console.log("Building model constraints...");
  
  // helper to create safe keys (no spaces/special chars)
  const safeKey = (s: string) => String(s).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  
  const BIG_PENALTY = 10000; // Penalizes uncovered events heavily
  
  // A. Event constraints
  events.forEach((event) => {
    const eKey = safeKey(event);
    // Max 2 swimmers per event: sum(x_p,d) <= 2
    model.constraints[`event_${eKey}_max`] = { max: MAX_SWIMMERS_PER_EVENT };
    // Minimum coverage (soft): sum(x_p,d) + z_d >= 1
    model.constraints[`event_${eKey}_min`] = { min: 1 };
  });

  // B. Individual swimmer constraints
  swimmers.forEach((swimmer) => {
    const sKey = safeKey(String(swimmer.id));
    // Max 4 events per swimmer: sum(x_p,d) <= 4
    model.constraints[`swimmer_${sKey}_maxEvents`] = { max: MAX_INDIVIDUAL_EVENTS };
    // Nomination constraint: if any x_p,d = 1, then y_p = 1
    // This is implicit - we'll link via variable coefficients
  });

  // C. Roster limit: sum(y_p) <= 16
  model.constraints["rosterLimit"] = { max: ROSTER_SIZE };

  // 2. Define Variables
  console.log("Adding assignment variables...");
  let assignmentVarCount = 0;
  
  // Step 1: Create x_p,d (assignment) and y_p (nomination) variables
  swimmers.forEach((swimmer) => {
    if (!swimmer || typeof swimmer !== 'object') {
      console.warn("Invalid swimmer object:", swimmer);
      return;
    }
    if (!Array.isArray(swimmer.times)) {
      console.warn(`Swimmer ${swimmer.id} has no times array`, swimmer);
      return;
    }
    
    const sKey = safeKey(String(swimmer.id));
    let swimmerHasAnyAssignment = false;
    
    events.forEach((event) => {
      // Find time/points
      let timeObj = swimmer.times.find((t) => t.event === event);
      if (!timeObj) {
        timeObj = swimmer.times.find((t) => normalizeEventName(t.event) === event);
      }
      
      if (!timeObj || !timeObj.personalBestMs) return;

      const points = calculateFinaPoints(timeObj.personalBestMs, event, poolSize, swimmer.gender);
      const assignVarName = `assign|${swimmer.id}|${event}`;
      const eKey = safeKey(event);
      assignmentVarCount++;
      swimmerHasAnyAssignment = true;

      // x_p,d: assignment variable with FINA points
      model.variables[assignVarName] = {
        totalPoints: points,
        [`event_${eKey}_max`]: 1,      // Counts toward event limit
        [`event_${eKey}_min`]: 1,      // Counts toward event coverage
        [`swimmer_${sKey}_maxEvents`]: 1, // Counts toward individual limit
      };
      model.ints[assignVarName] = 1;
    });
    
    // y_p: nomination variable (whether swimmer is on roster)
    // If any x_p,d = 1, then y_p must be 1 (we'll enforce via linking)
    const nominationVarName = `nominate|${swimmer.id}`;
    model.variables[nominationVarName] = {
      totalPoints: 0, // Nomination itself doesn't score
      [`rosterLimit`]: 1, // Counts toward roster limit
    };
    model.ints[nominationVarName] = 1;
  });
  
  // Step 2: Create z_d (uncovered event) variables with big penalty
  events.forEach((event) => {
    const uncoveredVarName = `uncovered|${event}`;
    model.variables[uncoveredVarName] = {
      totalPoints: -BIG_PENALTY, // Heavy penalty for uncovered events
      [`event_${safeKey(event)}_min`]: 1, // Counts toward minimum constraint
    };
    model.ints[uncoveredVarName] = 1;
  });
  
  console.log(`Added ${assignmentVarCount} assignment variables`);
  console.log(`Added ${swimmers.length} nomination variables`);
  console.log(`Added ${events.length} uncovered event variables`);

  // Step 3: Add linking constraints x_p,d <= y_p for each (p, d)
  // This ensures that if a swimmer starts an event, they must be nominated
  swimmers.forEach((swimmer) => {
    const sKey = safeKey(String(swimmer.id));
    const nominationVarName = `nominate|${swimmer.id}`;
    
    events.forEach((event) => {
      // Check if this swimmer can swim this event
      let timeObj = swimmer.times.find((t) => t.event === event);
      if (!timeObj) {
        timeObj = swimmer.times.find((t) => normalizeEventName(t.event) === event);
      }
      if (!timeObj || !timeObj.personalBestMs) return;
      
      const assignVarName = `assign|${swimmer.id}|${event}`;
      const linkingConstraintKey = `link_${sKey}_${safeKey(event)}`;
      
      // x_p,d - y_p <= 0  =>  x_p,d <= y_p
      model.constraints[linkingConstraintKey] = {
        max: 0,
      };
      
      // Add coefficients: x_p,d has coefficient +1, y_p has coefficient -1
      if (!model.variables[assignVarName]) {
        model.variables[assignVarName] = {};
      }
      if (!model.variables[nominationVarName]) {
        model.variables[nominationVarName] = {};
      }
      
      model.variables[assignVarName][linkingConstraintKey] = 1;
      model.variables[nominationVarName][linkingConstraintKey] = -1;
    });
  });

  console.log("Model built with linking constraints. Calling solver...");
  console.log("Total variables:", Object.keys(model.variables).length);
  console.log("Total constraints:", Object.keys(model.constraints).length);
  console.log("Constraint keys:", Object.keys(model.constraints).filter(k => k.startsWith('swimmer_')).slice(0, 5));

  // 3. Solve
  let solution;
  try {
    console.log("Solver starting...");
    const startTime = performance.now();
    solution = solver.Solve(model);
    const endTime = performance.now();
    console.log(`Solver finished in ${(endTime - startTime).toFixed(2)}ms`);
      // Debug: inspect the raw solution shape when assignments are empty
      try {
        if (solution && typeof solution === 'object') {
          console.log('--- Solver solution keys ---', Object.keys(solution));
          if (solution.variables && typeof solution.variables === 'object') {
            const varNames = Object.keys(solution.variables);
            console.log(`solution.variables count: ${varNames.length}`);
            varNames.slice(0, 20).forEach((n) => {
              console.log('solution.variables sample ->', n, ':', solution.variables[n]);
            });
          }
        }
      } catch (dbgErr) {
        console.warn('Could not fully inspect solution object', dbgErr);
      }
  } catch (error) {
    console.error("Solver error:", error);
    throw new Error("Nepodařilo se vypočítat tým. Solver selhal.");
  }

  // Check if solution is valid
  if (!solution || typeof solution !== 'object') {
    console.error("Invalid solution returned:", solution);
    throw new Error("Nepodařilo se vypočítat tým. Solver vrátil neplatný výsledek.");
  }

  // Check feasibility
  if (solution.feasible === false) {
    console.error("No feasible solution found. Model constraints might be too strict.");
    console.error("Number of swimmers:", swimmers.length);
    console.error("Number of events:", events.length);
    console.error("Max roster size:", ROSTER_SIZE);
    console.error("Max events per swimmer:", MAX_INDIVIDUAL_EVENTS);
    console.error("Max swimmers per event:", MAX_SWIMMERS_PER_EVENT);
    
    // Additional diagnostics
    const swimmersWithTimes = swimmers.filter(s => s.times && s.times.length > 0);
    console.error("Swimmers with times:", swimmersWithTimes.length);
    
    events.forEach((event) => {
      const swimmersForEvent = swimmersWithTimes.filter(s => 
        s.times.some(t => (t.event === event || normalizeEventName(t.event) === event) && t.personalBestMs)
      );
      console.error(`Event ${event}: ${swimmersForEvent.length} swimmers can swim`);
    });
    
    throw new Error("Nepodařilo se vypočítat tým. Zkontrolujte, zda máte dostatek plavců pro pokrytí disciplín.");
  }

  // 4. Parse Results
  const assignments: LeagueAssignment[] = [];
  const rosterIds = new Set<string>();

  if (solution.result === undefined) {
    console.warn("No solution result found");
    return {
      roster: [],
      assignments: [],
      totalPoints: 0,
      status: "No solution",
    };
  }

  // Try to parse assignment variables from solver output.
  // Some solver outputs expose variables as top-level keys (e.g. solution['assign|...'] = 1)
  // while others nest them under `solution.variables[varName]` with different property names.
  const modelVarNames = Object.keys(model.variables || {});

  modelVarNames.forEach((varName) => {
    let val: number | undefined = undefined as any;

    // 1) top-level numeric value
    if (typeof solution[varName] === 'number') {
      val = solution[varName];
    }

    // 2) nested under solution.variables[varName]
    if ((val === undefined || val === null) && solution.variables && solution.variables[varName]) {
      const nested = solution.variables[varName];
      if (typeof nested === 'number') val = nested;
      else if (nested.solution !== undefined) val = nested.solution;
      else if (nested.value !== undefined) val = nested.value;
      else if (nested.val !== undefined) val = nested.val;
      else if (nested[0] !== undefined) val = nested[0];
    }

    // 3) some outputs use a `bounded`/`basis` structure — attempt to coerce truthy
    if ((val === undefined || val === null) && solution[varName] !== undefined) {
      const maybe = solution[varName];
      if (typeof maybe === 'boolean') val = maybe ? 1 : 0;
      else if (typeof maybe === 'string') val = parseFloat(maybe) || 0;
    }

    if (typeof val === 'number' && val > 0.5 && varName.startsWith('assign|')) {
      const parts = varName.split("|");
      const swimmerId = parts[1];
      const eventId = parts.slice(2).join("|");

      const swimmer = swimmers.find(s => String(s.id) === String(swimmerId));
      if (swimmer) {
        // Try exact match first, then normalized match to compute points
        let timeObj = swimmer.times.find(t => t.event === eventId);
        if (!timeObj) {
          timeObj = swimmer.times.find(t => normalizeEventName(t.event) === eventId);
        }

        const points = timeObj ? calculateFinaPoints(timeObj.personalBestMs, eventId, poolSize, swimmer.gender) : 0;
        // Log detailed calculation to help diagnose mismatches
        if (timeObj) {
          const details = getFinaDetails(timeObj.personalBestMs, eventId, poolSize, swimmer.gender);
          console.log(`FINA calc -> swimmer=${swimmerId}, event=${eventId}, time=${timeObj.personalBestMs}ms, worldRecord=${details.worldRecordMs}ms, gender=${details.gender}, points=${details.points}`);
        }
        assignments.push({ swimmerId: String(swimmerId), eventId, points });
        rosterIds.add(String(swimmerId));
      }
    }
  });

  // POST-PROCESSING: Group assignments by swimmer and log final state
  const assignmentsBySwimmer: Record<string, LeagueAssignment[]> = {};
  assignments.forEach(a => {
    if (!assignmentsBySwimmer[a.swimmerId]) assignmentsBySwimmer[a.swimmerId] = [];
    assignmentsBySwimmer[a.swimmerId].push(a);
  });

  console.log("Final assignment verification:");
  Object.entries(assignmentsBySwimmer).forEach(([swimmerId, asns]) => {
    if (asns.length > MAX_INDIVIDUAL_EVENTS) {
      console.error(`ERROR: Swimmer ${swimmerId} has ${asns.length} events (max is ${MAX_INDIVIDUAL_EVENTS})`);
    } else {
      console.log(`  Swimmer ${swimmerId}: ${asns.length} events ✓`);
    }
  });

  const finalAssignments = assignments;
  const finalRosterIds = new Set<string>();
  finalAssignments.forEach(a => finalRosterIds.add(a.swimmerId));
  const finalRoster = swimmers.filter((s) => finalRosterIds.has(String(s.id)));

  return {
    roster: finalRoster,
    assignments: finalAssignments,
    totalPoints: solution.result || 0,
    status: solution.feasible ? "Optimal" : "Infeasible",
  };
};
