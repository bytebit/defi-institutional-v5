import requests
import datetime

SUBGRAPH_URLS = {
    "Ethereum": "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3",
    "Arbitrum": "https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal",
    "Base": "https://api.thegraph.com/subgraphs/name/ianlapham/base"
}

def get_7d_fee_apy(chain, pool_address):

    url = SUBGRAPH_URLS.get(chain)
    if not url:
        return None

    today = int(datetime.datetime.utcnow().timestamp())
    seven_days_ago = today - 7 * 24 * 60 * 60

    query = f"""
    {{
      poolDayDatas(
        first: 7,
        orderBy: date,
        orderDirection: desc,
        where: {{
          pool: "{pool_address.lower()}",
          date_gt: {seven_days_ago}
        }}
      ) {{
        date
        volumeUSD
        feesUSD
        tvlUSD
      }}
    }}
    """

    response = requests.post(url, json={"query": query})

    if response.status_code != 200:
        return None

    data = response.json()["data"]["poolDayDatas"]

    if not data:
        return None

    total_fees = sum(float(d["feesUSD"]) for d in data)
    avg_tvl = sum(float(d["tvlUSD"]) for d in data) / len(data)

    if avg_tvl == 0:
        return None

    fee_apy = (total_fees * 52) / avg_tvl * 100

    return round(fee_apy, 2)
