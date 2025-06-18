import { createConfig } from "ponder";

import { UnverifiedContractAbi } from "./abis/UnverifiedContractAbi";

export default createConfig({
  chains: { gnosis: { id: 100, rpc: "http(process.env.PONDER_RPC_URL_100)" } },
  contracts: {
    UnverifiedContract: {
      abi: UnverifiedContractAbi,
      address: "0xba12222222228d8ba445958a75a0704d566bf2c8",
      chain: "gnosis",
    },
  },
});
