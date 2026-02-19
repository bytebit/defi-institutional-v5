export function allocateCapital(pools) {

  const scored = pools.map(p => ({
    ...p,
    score: p.apr / p.volatility
  }));

  const totalScore =
    scored.reduce((sum, p) => sum + p.score, 0);

  return scored.map(p => {

    let weight = p.score / totalScore;

    if (weight > p.maxWeight)
      weight = p.maxWeight;

    return {
      ...p,
      targetWeight: weight
    };
  });
}
