import { allocateCapital } from "../engine/allocationEngine.js";
import { checkRisk } from "../engine/riskEngine.js";

export async function rebalancePortfolio(pools) {

  const allocations = allocateCapital(pools);

  const decisions = [];

  for (const pool of allocations) {

    const riskSignal = checkRisk(pool);

    decisions.push({
      name: pool.name,
      targetWeight: pool.targetWeight,
      riskSignal
    });
  }

  return decisions;
}
