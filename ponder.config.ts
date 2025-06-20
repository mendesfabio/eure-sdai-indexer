import { createConfig } from "ponder";

import { VaultAbi } from "./abis/VaultAbi";

export default createConfig({
  chains: { gnosis: { id: 100, rpc: process.env.PONDER_RPC_URL_100 } },
  contracts: {
    Vault: {
      abi: VaultAbi,
      address: "0xba12222222228d8ba445958a75a0704d566bf2c8",
      startBlock: 30274134,
      chain: "gnosis",
    },
  },
});
