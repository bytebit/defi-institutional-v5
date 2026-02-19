# core/pool_apy_engine.py

import requests

SUBGRAPH_URL = "https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal"

class PoolAPYEngine:

    def __init__(self, pool_address: str, fee_tier: float):
        self.pool_address = pool_address.lower()
        self.fee_tier = fee_tier

    # -----------------------------------
    # Fetch Pool Data (Single Query)
    # -----------------------------------

    def fetch_pool_data(self):

        query = """
        {
          pool(id: "%s") {
            totalValueLockedUSD
            poolDayData(first: 7, orderBy: date, orderDirection: desc) {
              volumeUSD
            }
          }
        }
        """ % self.pool_address

        r = requests.post(SUBGRAPH_URL, json={"query": query})
        data = r.json()["data"]["pool"]

        tvl = float(data["totalValueLockedUSD"])

        volume_7d = sum(
            float(day["volumeUSD"])
            for day in data["poolDayData"]
        )

        return tvl, volume_7d

    # -----------------------------------
    # Calculate APY
    # -----------------------------------

    def calculate(self):

        tvl, volume_7d = self.fetch_pool_data()

        if tvl == 0:
            return {
                "TVL ($)": 0,
                "7d Volume ($)": 0,
                "7d Fee ($)": 0,
                "APY (%)": 0
            }

        fee_7d = volume_7d * self.fee_tier

        apy = (fee_7d / tvl) * (365 / 7) * 100

        return {
            "TVL ($)": tvl,
            "7d Volume ($)": volume_7d,
            "7d Fee ($)": fee_7d,
            "APY (%)": apy
        }
