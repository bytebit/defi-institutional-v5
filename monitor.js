import dotenv from "dotenv";
dotenv.config();

import { fetchAllPoolMetrics } from "./services/dataFetcher.js";
import { rebalancePortfolio } from "./portfolio/portfolioManager.js";
import { sendAlert } from "./services/telegram.js";
import { executeReducePosition } from "./services/transactionExecutor.js";
import { fetchPosition } from "./services/onchainReader.js";
import { ethers } from "ethers";

const INTERVAL = parseInt(process.env.MONITOR_INTERVAL) || 3600000;
const AUTO_EXECUTE = process.env.AUTO_EXECUTE === "true";

console.log("Using RPC_URL:", process.env.RPC_URL);
console.log("Auto Execute:", AUTO_EXECUTE ? "Enabled" : "Disabled (Manual confirmation required)");

// 初始化 RPC provider
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

async function monitor() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Starting monitor cycle...`);

  try {
    // 测试 RPC 连接
    const blockNumber = await provider.getBlockNumber();
    console.log(`[${timestamp}] Connected to blockchain. Current block: ${blockNumber}`);

    // 拉取池子指标
    const pools = await fetchAllPoolMetrics();
    const decisions = await rebalancePortfolio(pools);

    console.log(`[${timestamp}] Portfolio decisions:`);
    console.table(decisions.map(d => ({
      Asset: d.name,
      Action: d.riskSignal,
      Reason: "-"
    })));

    // 筛选需要减仓的警告
    const alerts = decisions.filter(d => d.riskSignal === "REDUCE");
    if (alerts.length > 0) {
      const alertMessage = `⚠ Portfolio risk alert (${timestamp}):\n` +
        alerts.map(a => `- ${a.name}: ${a.riskSignal}`).join("\n");
      await sendAlert(alertMessage);
      console.log(`[${timestamp}] Alerts sent to Telegram.`);

      // 执行减仓操作
      if (AUTO_EXECUTE || process.env.PRIVATE_KEY) {
        console.log(`[${timestamp}] Preparing to execute risk reduction...`);
        
        for (const alert of alerts) {
          try {
            const tokenId = process.env.POSITION_ID;
            const position = await fetchPosition(tokenId);
            const pool = pools.find(p => p.name === alert.name);
            
            if (pool && position) {
              // 减少50%的流动性作为风险控制
              const liquidityToRemove = Number(position.liquidity) * 0.5;
              
              console.log(`[${timestamp}] Executing reduce position for ${alert.name}...`);
              const receipt = await executeReducePosition(pool, position, liquidityToRemove);
              
              if (receipt) {
                console.log(`[${timestamp}] Successfully reduced position for ${alert.name}`);
              } else {
                console.log(`[${timestamp}] Position reduction cancelled for ${alert.name}`);
              }
            }
          } catch (txError) {
            console.error(`[${timestamp}] Error executing transaction for ${alert.name}:`, txError);
            await sendAlert(`❌ Transaction failed for ${alert.name}:\n${txError.message}`);
          }
        }
      } else {
        console.log(`[${timestamp}] PRIVATE_KEY not configured. Skipping transaction execution.`);
      }
    } else {
      console.log(`[${timestamp}] No REDUCE signals. No alerts sent.`);
    }

  } catch (err) {
    console.error(`[${timestamp}] Monitor error:`, err);
    try {
      await sendAlert(`❌ Monitor encountered an error (${timestamp}):\n${err.message}`);
    } catch (telegramErr) {
      console.error(`[${timestamp}] Failed to send Telegram alert:`, telegramErr);
    }
  }

  console.log(`[${timestamp}] Monitor cycle complete.\n`);
}

// 首次执行
monitor();

// 定时执行
setInterval(monitor, INTERVAL);
