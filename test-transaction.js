import dotenv from "dotenv";
dotenv.config();

import { executeReducePosition, collectFees } from "./services/transactionExecutor.js";
import { fetchPosition } from "./services/onchainReader.js";
import { fetchPoolOnchain } from "./services/uniswapPoolReader.js";
import readline from "readline";

async function testTransactionExecutor() {
  console.log("=== 半自动交易执行测试 ===\n");

  try {
    const poolAddress = process.env.POOL_ADDRESS;
    const tokenId = process.env.POSITION_ID;

    console.log("1. 获取池子数据...");
    const pool = await fetchPoolOnchain(poolAddress);
    console.log(`   池子: ${pool.symbol0}-${pool.symbol1}`);
    console.log(`   当前Tick: ${pool.tick}`);
    console.log(`   流动性: ${pool.liquidity}`);

    console.log("\n2. 获取头寸数据...");
    const position = await fetchPosition(tokenId);
    console.log(`   Token ID: ${tokenId}`);
    console.log(`   Tick范围: ${position.tickLower} - ${position.tickUpper}`);
    console.log(`   流动性: ${position.liquidity}`);

    console.log("\n3. 测试选项:");
    console.log("   [1] 减少流动性 (减少50%)");
    console.log("   [2] 收取手续费");
    console.log("   [0] 退出");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question("\n请选择测试选项 (0-2): ", async (choice) => {
      rl.close();

      try {
        if (choice === "1") {
          console.log("\n=== 测试减少流动性 ===");
          const liquidityToRemove = Number(position.liquidity) * 0.5;
          const receipt = await executeReducePosition(pool, position, liquidityToRemove);
          
          if (receipt) {
            console.log("\n✅ 减少流动性交易成功!");
            console.log(`交易哈希: ${receipt.hash}`);
            console.log(`Gas使用: ${receipt.gasUsed}`);
          } else {
            console.log("\n❌ 交易已取消");
          }
        } else if (choice === "2") {
          console.log("\n=== 测试收取手续费 ===");
          const receipt = await collectFees(position);
          
          if (receipt) {
            console.log("\n✅ 收取手续费交易成功!");
            console.log(`交易哈希: ${receipt.hash}`);
            console.log(`Gas使用: ${receipt.gasUsed}`);
          } else {
            console.log("\n❌ 交易已取消");
          }
        } else {
          console.log("\n测试已取消");
        }
      } catch (error) {
        console.error("\n❌ 交易执行失败:", error.message);
      }

      console.log("\n=== 测试完成 ===");
      process.exit(0);
    });

  } catch (error) {
    console.error("❌ 测试失败:", error);
    process.exit(1);
  }
}

testTransactionExecutor();
