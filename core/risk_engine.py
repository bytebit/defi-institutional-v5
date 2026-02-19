
def risk_label(row):
    if row["estimated_il"] < -5:
        return "High IL Risk"
    if row["real_apy"] < row["apy"] * 0.5:
        return "Incentive Driven"
    if row["tvlUsd"] < 20000000:
        return "Low Liquidity"
    return "Healthy"
