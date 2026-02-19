import streamlit as st
from web3 import Web3
from datetime import datetime, timedelta, UTC
import pandas as pd

st.set_page_config(page_title="Uniswap v3 True TVL Scanner", layout="wide")

# ==============================
# RPC
# ==============================

RPC_URL = st.secrets["RPC_URL"]
w3 = Web3(Web3.HTTPProvider(RPC_URL))

if not w3.is_connected():
    st.error("RPC connection failed")
    st.stop()

st.title("Uniswap v3 Arbitrum · True TVL Yield Scanner")

# ==============================
# TOKEN CONFIG
# ==============================

TOKENS = {
    "WETH": {
        "address": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "decimals": 18
    },
    "USDC": {
        "address": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "decimals": 6
    },
    "ARB": {
        "address": "0x912CE59144191C1204E64559FE8253a0e49E6548",
        "decimals": 18
    },
}

PAIR_LIST = [
    ("WETH", "USDC"),
    ("WETH", "ARB"),
    ("ARB", "USDC"),
]

FEE_TIERS = [100, 500, 3000, 10000]

FACTORY_ADDRESS = Web3.to_checksum_address(
    "0x1F98431c8aD98523631AE4a59f267346ea31F984"
)

# ==============================
# ABIs
# ==============================

FACTORY_ABI = [{
    "name": "getPool",
    "outputs": [{"type": "address"}],
    "inputs": [
        {"type": "address"},
        {"type": "address"},
        {"type": "uint24"},
    ],
    "stateMutability": "view",
    "type": "function",
}]

POOL_ABI = [
    {"name":"feeGrowthGlobal0X128","outputs":[{"type":"uint256"}],"inputs":[],"stateMutability":"view","type":"function"},
    {"name":"feeGrowthGlobal1X128","outputs":[{"type":"uint256"}],"inputs":[],"stateMutability":"view","type":"function"},
    {"name":"slot0","outputs":[
        {"type":"uint160"},
        {"type":"int24"},
        {"type":"uint16"},
        {"type":"uint16"},
        {"type":"uint16"},
        {"type":"uint8"},
        {"type":"bool"}
    ],"inputs":[],"stateMutability":"view","type":"function"},
    {"name":"token0","outputs":[{"type":"address"}],"inputs":[],"stateMutability":"view","type":"function"},
    {"name":"token1","outputs":[{"type":"address"}],"inputs":[],"stateMutability":"view","type":"function"},
]

ERC20_ABI = [
    {"name":"balanceOf","outputs":[{"type":"uint256"}],"inputs":[{"type":"address"}],"stateMutability":"view","type":"function"},
    {"name":"decimals","outputs":[{"type":"uint8"}],"inputs":[],"stateMutability":"view","type":"function"},
]

factory = w3.eth.contract(address=FACTORY_ADDRESS, abi=FACTORY_ABI)

# ==============================
# 时间回溯
# ==============================

current_block = w3.eth.block_number

def get_block_by_timestamp(target_ts):
    low = 0
    high = current_block
    while low <= high:
        mid = (low + high) // 2
        block = w3.eth.get_block(mid)
        if block.timestamp < target_ts:
            low = mid + 1
        else:
            high = mid - 1
    return low

seven_days_ago_ts = int((datetime.now(UTC) - timedelta(days=7)).timestamp())
past_block = get_block_by_timestamp(seven_days_ago_ts)

# ==============================
# 主扫描
# ==============================

results = []

for sym0, sym1 in PAIR_LIST:

    TOKEN0 = Web3.to_checksum_address(TOKENS[sym0]["address"])
    TOKEN1 = Web3.to_checksum_address(TOKENS[sym1]["address"])

    pair_name = f"{sym0}/{sym1}"

    for fee in FEE_TIERS:

        pool_address = factory.functions.getPool(
            TOKEN0, TOKEN1, fee
        ).call()

        if pool_address == "0x0000000000000000000000000000000000000000":
            continue

        pool = w3.eth.contract(
            address=Web3.to_checksum_address(pool_address),
            abi=POOL_ABI
        )

        try:
            fee0_now = pool.functions.feeGrowthGlobal0X128().call()
            fee1_now = pool.functions.feeGrowthGlobal1X128().call()

            fee0_past = pool.functions.feeGrowthGlobal0X128().call(
                block_identifier=past_block
            )
            fee1_past = pool.functions.feeGrowthGlobal1X128().call(
                block_identifier=past_block
            )

            slot0 = pool.functions.slot0().call()
            sqrtPriceX96 = slot0[0]

            token0_addr = pool.functions.token0().call()
            token1_addr = pool.functions.token1().call()

            token0 = w3.eth.contract(token0_addr, abi=ERC20_ABI)
            token1 = w3.eth.contract(token1_addr, abi=ERC20_ABI)

            bal0 = token0.functions.balanceOf(pool_address).call()
            bal1 = token1.functions.balanceOf(pool_address).call()

            dec0 = token0.functions.decimals().call()
            dec1 = token1.functions.decimals().call()

            bal0 /= 10**dec0
            bal1 /= 10**dec1

            Q96 = 2**96
            Q128 = 2**128

            price = (sqrtPriceX96 / Q96) ** 2

            if sym0 == "USDC":
                bal0_usd = bal0
                bal1_usd = bal1 / price
            elif sym1 == "USDC":
                bal0_usd = bal0 * price
                bal1_usd = bal1
            else:
                bal0_usd = bal0 * price
                bal1_usd = bal1

            tvl_usd = bal0_usd + bal1_usd

            delta0 = (fee0_now - fee0_past) / Q128
            delta1 = (fee1_now - fee1_past) / Q128

            total_fee_token0 = delta0 * bal0
            total_fee_token1 = delta1 * bal1

            fee_usd = (total_fee_token0 * price_adjusted) + total_fee_token1

            if tvl_usd == 0:
                continue

            if tvl_usd < 1000:
                continue

            apr = (fee_usd / tvl_usd) * (365/7) * 100
            apy = (1 + apr/100/365) ** 365 - 1

            results.append({
                "Pair": pair_name,
                "Fee Tier": f"{fee/10000:.2%}",
                "TVL ($)": round(tvl_usd, 2),
                "7D Fee ($)": round(fee_usd, 2),
                "APR (%)": round(apr, 2),
                "APY (%)": round(apy*100, 2),
            })

        except Exception:
            continue

df = pd.DataFrame(results)

if not df.empty:
    df = df.sort_values("APR (%)", ascending=False)

st.dataframe(df, use_container_width=True)
