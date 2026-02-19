
import numpy as np
def capital_efficiency(row):
    il_penalty = abs(row.get("estimated_il", 0))
    return (row["real_apy"] - il_penalty) * np.log(row["tvlUsd"] + 1)
