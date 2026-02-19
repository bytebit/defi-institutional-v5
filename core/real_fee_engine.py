from web3 import Web3
import time

POOL_ABI = [
    {
        "name": "fee",
        "outputs": [{"type": "uint24"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "sender", "type": "address"},
            {"indexed": True, "name": "recipient", "type": "address"},
            {"indexed": False, "name": "amount0", "type": "int256"},
            {"indexed": False, "name": "amount1", "type": "int256"},
            {"indexed": False, "name": "sqrtPriceX96", "type": "uint160"},
            {"indexed": False, "name": "liquidity", "type": "uint128"},
            {"indexed": False, "name": "tick", "type": "int24"}
        ],
        "name": "Swap",
        "type": "event"
    }
]

def get_real_7d_fee_apy(w3, pool_address):

    pool = w3.eth.contract(
        address=Web3.to_checksum_address(pool_address),
        abi=POOL_ABI
    )

    fee = pool.functions.fee().call() / 1_000_000

    current_block = w3.eth.block_number
    block_7d_ago = current_block - 45000  # approx 7 days (Arbitrum)

    swap_filter = pool.events.Swap.create_filter(
        fromBlock=block_7d_ago,
        toBlock=current_block
    )

    events = swap_filter.get_all_entries()

    total_volume = 0

    for e in events:
        amount0 = abs(e["args"]["amount0"])
        amount1 = abs(e["args"]["amount1"])

        # 这里简单用 amount0 近似
        total_volume += amount0

    total_fees = total_volume * fee

    # TVL 估算
    liquidity = pool.functions.liquidity().call()
    tvl_estimate = liquidity  # 简化版本

    if tvl_estimate == 0:
        return None

    fee_apy = (total_fees * 52) / tvl_estimate * 100

    return round(fee_apy, 2)
