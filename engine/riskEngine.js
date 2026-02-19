export function checkRisk(pool) {

  if (pool.drawdown > 0.15)
    return "REDUCE";

  if (pool.volatility > 0.8)
    return "REDUCE";

  return "OK";
}
