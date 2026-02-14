import { ethers } from "ethers";
import readline from "readline";

const POSITION_MANAGER =
  "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";

const POSITION_MANAGER_ABI = [
  "function decreaseLiquidity((uint256 tokenId,uint128 liquidity,uint256 amount0Min,uint256 amount1Min,uint256 deadline)) external payable returns (uint256 amount0,uint256 amount1)",
  "function collect((uint256 tokenId,address recipient,uint256 amount0Max,uint256 amount1Max)) external returns (uint256 amount0,uint256 amount1)",
  "function increaseLiquidity((uint256 tokenId,uint128 liquidity,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,uint256 deadline)) external payable returns (uint128,uint256,uint256)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

function createWallet() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in environment variables");
  }
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  return new ethers.Wallet(privateKey, provider);
}

async function confirmTransaction(txDetails) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log("\n=== 交易确认 ===");
    console.log(`操作: ${txDetails.action}`);
    console.log(`池子: ${txDetails.poolName}`);
    console.log(`Token ID: ${txDetails.tokenId}`);
    console.log(`流动性: ${txDetails.liquidity}`);
    console.log(`预估Gas: ${txDetails.estimatedGas} ETH`);
    console.log("==================\n");

    rl.question("确认执行交易？(yes/no): ", (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

export async function executeReducePosition(pool, position, liquidityToRemove) {
  const wallet = createWallet();
  const positionManager = new ethers.Contract(
    POSITION_MANAGER,
    POSITION_MANAGER_ABI,
    wallet
  );

  const liquidity = BigInt(liquidityToRemove);
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  const params = {
    tokenId: position.tokenId,
    liquidity: liquidity,
    amount0Min: 0n,
    amount1Min: 0n,
    deadline: deadline
  };

  const estimatedGas = await positionManager.decreaseLiquidity.estimateGas(params);

  const txDetails = {
    action: "减少流动性",
    poolName: pool.name,
    tokenId: position.tokenId,
    liquidity: liquidity.toString(),
    estimatedGas: ethers.formatEther(estimatedGas * BigInt(2000000000n))
  };

  const confirmed = await confirmTransaction(txDetails);

  if (!confirmed) {
    console.log("交易已取消");
    return null;
  }

  console.log("执行交易中...");
  const tx = await positionManager.decreaseLiquidity(params);
  console.log(`交易已发送: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`交易已确认: ${receipt.hash}`);

  return receipt;
}

export async function executeIncreasePosition(pool, position, liquidityToAdd, amount0, amount1) {
  const wallet = createWallet();
  const positionManager = new ethers.Contract(
    POSITION_MANAGER,
    POSITION_MANAGER_ABI,
    wallet
  );

  const liquidity = BigInt(liquidityToAdd);
  const amount0Desired = BigInt(amount0);
  const amount1Desired = BigInt(amount1);
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  const params = {
    tokenId: position.tokenId,
    liquidity: liquidity,
    amount0Desired: amount0Desired,
    amount1Desired: amount1Desired,
    amount0Min: 0n,
    amount1Min: 0n,
    deadline: deadline
  };

  const estimatedGas = await positionManager.increaseLiquidity.estimateGas(params);

  const txDetails = {
    action: "增加流动性",
    poolName: pool.name,
    tokenId: position.tokenId,
    liquidity: liquidity.toString(),
    estimatedGas: ethers.formatEther(estimatedGas * BigInt(2000000000n))
  };

  const confirmed = await confirmTransaction(txDetails);

  if (!confirmed) {
    console.log("交易已取消");
    return null;
  }

  console.log("执行交易中...");
  const tx = await positionManager.increaseLiquidity(params);
  console.log(`交易已发送: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`交易已确认: ${receipt.hash}`);

  return receipt;
}

export async function collectFees(position) {
  const wallet = createWallet();
  const positionManager = new ethers.Contract(
    POSITION_MANAGER,
    POSITION_MANAGER_ABI,
    wallet
  );

  const params = {
    tokenId: position.tokenId,
    recipient: wallet.address,
    amount0Max: 2n ** 128n - 1n,
    amount1Max: 2n ** 128n - 1n
  };

  const estimatedGas = await positionManager.collect.estimateGas(params);

  const txDetails = {
    action: "收取手续费",
    poolName: "Position",
    tokenId: position.tokenId,
    liquidity: "全部",
    estimatedGas: ethers.formatEther(estimatedGas * BigInt(2000000000n))
  };

  const confirmed = await confirmTransaction(txDetails);

  if (!confirmed) {
    console.log("交易已取消");
    return null;
  }

  console.log("执行交易中...");
  const tx = await positionManager.collect(params);
  console.log(`交易已发送: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`交易已确认: ${receipt.hash}`);

  return receipt;
}
