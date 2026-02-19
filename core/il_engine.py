
def estimate_il(volatility_30d):
    P = 1 + volatility_30d
    il = 2 * (P**0.5) / (1 + P) - 1
    return il * 100
