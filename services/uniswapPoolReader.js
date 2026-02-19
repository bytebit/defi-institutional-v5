import { ethers } from "ethers";

const POOL_ABI = [
  "function slot0() view returns (uint160 sqrtPriceX96,int24 tick,uint16,uint16,uint16,uint8,bool)",
  "function liquidity() view returns (uint128)",
  "function fee() view returns (uint24)",
  "function token0() view returns (address)",
  "function token1() view returns (address)"
];

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

export async function fetchPoolOnchain(poolAddress) {

  const provider =
    new ethers.JsonRpcProvider(process.env.RPC_URL);

  const pool =
    new ethers.Contract(
      poolAddress,
      POOL_ABI,
      provider
    );

  const slot0 = await pool.slot0();
  const liquidity = await pool.liquidity();
  const fee = await pool.fee();

  const token0Addr = await pool.token0();
  const token1Addr = await pool.token1();

  const token0 =
    new ethers.Contract(token0Addr, ERC20_ABI, provider);
  const token1 =
    new ethers.Contract(token1Addr, ERC20_ABI, provider);

  const symbol0 = await token0.symbol();
  const symbol1 = await token1.symbol();

  return {
    sqrtPriceX96: slot0[0],
    tick: slot0[1],
    liquidity,
    fee,
    symbol0,
    symbol1
  };
}
