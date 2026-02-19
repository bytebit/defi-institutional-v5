# core/real_fee_growth_engine.py

from web3 import Web3

Q128 = 2 ** 128

UNISWAP_V3_POOL_ABI = [
    {
        "name": "feeGrowthGlobal0X128",
        "outputs": [{"type": "uint256"}],
        "inputs": [],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "name": "feeGrowthGlobal1X128",
        "outputs": [{"type": "uint256"}],
        "inputs": [],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "name": "liquidity",
        "outputs": [{"type": "uint128"}],
        "inputs": [],
        "stateMutability": "view",
        "type": "function"
    }
]


class RealFeeGrowthEngine:

    def __init__(self, web3: Web3, pool_address: str):
        self.w3 = web3
        self.pool = self.w3.eth.contract(
            address=Web3.to_checksum_address(pool_address),
            abi=UNISWAP_V3_POOL_ABI
        )

    # ---------------------------------------
    # Core Read Functions
    # ---------------------------------------

    def get_fee_growth(self, block_number="latest"):
        fg0 = self.pool.functions.feeGrowthGlobal0X128().call(
            block_identifier=block_number
        )
        fg1 = self.pool.functions.feeGrowthGlobal1X128().call(
            block_identifier=block_number
        )
        return fg0, fg1

    def get_liquidity(self, block_number="latest"):
        return self.pool.functions.liquidity().call(
            block_identifier=block_number
        )

    # ---------------------------------------
    # Fast APY Calculation (No Block Scanning)
    # ---------------------------------------

    def estimate_blocks_per_day(self):
        """
        Estimate block speed based on chain.
        Ethereum ≈ 12s/block → 7200 blocks/day
        Arbitrum ≈ 0.25s/block → 345600 blocks/day
        """
        chain_id = self.w3.eth.chain_id

        # Ethereum Mainnet
        if chain_id == 1:
            return 7200

        # Arbitrum One
        if chain_id == 42161:
            return 345600

        # Fallback (safe default)
        return 7200

    def calculate_apy(self, days=7):

        latest_block = self.w3.eth.block_number
        blocks_per_day = self.estimate_blocks_per_day()

        past_block = latest_block - int(days * blocks_per_day)

        if past_block < 0:
            past_block = 0

        # ---- Fee Growth ----
        fg0_now, fg1_now = self.get_fee_growth(latest_block)
        fg0_past, fg1_past = self.get_fee_growth(past_block)

        delta_fg0 = fg0_now - fg0_past
        delta_fg1 = fg1_now - fg1_past

        # ---- Liquidity ----
        liquidity = self.get_liquidity(latest_block)

        if liquidity == 0:
            return 0

        # ---- Fee Per Liquidity ----
        fee_per_liquidity = (
            delta_fg0 / Q128 +
            delta_fg1 / Q128
        )

        fee_growth_ratio = fee_per_liquidity / liquidity

        # ---- Annualize ----
        apy = fee_growth_ratio * (365 / days)

        return apy * 100
