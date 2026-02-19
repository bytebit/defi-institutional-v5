# core/uniswap_scanner.py

from web3 import Web3

UNISWAP_V3_FACTORY = Web3.to_checksum_address(
    "0x1F98431c8aD98523631AE4a59f267346ea31F984"
)

FACTORY_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "type": "address", "name": "token0"},
            {"indexed": True, "type": "address", "name": "token1"},
            {"indexed": True, "type": "uint24", "name": "fee"},
            {"indexed": False, "type": "int24", "name": "tickSpacing"},
            {"indexed": False, "type": "address", "name": "pool"},
        ],
        "name": "PoolCreated",
        "type": "event"
    }
]


class UniswapV3Scanner:

    def __init__(self, web3: Web3):
        self.w3 = web3
        self.factory = self.w3.eth.contract(
            address=UNISWAP_V3_FACTORY,
            abi=FACTORY_ABI
        )

    def scan_pools(self, from_block, to_block):

        event = self.factory.events.PoolCreated

        logs = event.get_logs(
            fromBlock=from_block,
            toBlock=to_block
        )

        pools = []

        for log in logs:
            pools.append({
                "token0": log["args"]["token0"],
                "token1": log["args"]["token1"],
                "fee": log["args"]["fee"],
                "pool": log["args"]["pool"]
            })

        return pools
