import { fetchPoolOnchain }
  from "./uniswapPoolReader.js";

import { fetchPosition }
  from "./onchainReader.js";

function sqrtPriceToPrice(sqrtPriceX96) {

  const Q96 = 2n ** 96n;

  const price =
    (Number(sqrtPriceX96) / Number(Q96)) ** 2;

  return price;
}

export async function fetchAllPoolMetrics() {

  const poolAddress =
    process.env.POOL_ADDRESS;

  const tokenId =
    process.env.POSITION_ID;

  const pool =
    await fetchPoolOnchain(poolAddress);

  const position =
    await fetchPosition(tokenId);

  const price =
    sqrtPriceToPrice(pool.sqrtPriceX96);

  const inRange =
    pool.tick > position.tickLower &&
    pool.tick < position.tickUpper;

  return [
    {
      name: `${pool.symbol0}-${pool.symbol1}`,
      apr: 0.20,  // 后续可计算真实fee APR
      volatility: 0.5,
      drawdown: 0.05,
      maxWeight: 0.5,
      inRange
    }
  ];
}
