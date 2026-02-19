
def normalize_pool_info(df):
    df["pair"] = df["symbol"].str.replace("-", " / ")
    df["base"] = df["pair"].str.split(" / ").str[0]
    df["quote"] = df["pair"].str.split(" / ").str[-1]
    df["protocol_type"] = df["project"].apply(
        lambda x: "AMM" if "uniswap" in x.lower() else "Other"
    )
    return df
