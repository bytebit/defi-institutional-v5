import { ethers } from "ethers";

const POSITION_MANAGER =
  "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";

const ABI = [
  "function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)"
];

export async function fetchPosition(tokenId) {

  const provider =
    new ethers.JsonRpcProvider(process.env.RPC_URL);

  const contract =
    new ethers.Contract(
      POSITION_MANAGER,
      ABI,
      provider
    );

  const position =
    await contract.positions(tokenId);

  return position;
}
