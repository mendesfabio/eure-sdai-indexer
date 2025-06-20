import { createConfig } from "ponder";

import { VaultAbi } from "./abis/VaultAbi";

export default createConfig({
  chains: { gnosis: { id: 100, rpc: process.env.PONDER_RPC_URL_100 } },
  contracts: {
    Vault: {
      abi: VaultAbi,
      address: "0xba12222222228d8ba445958a75a0704d566bf2c8",
      startBlock: 30274134, // EURe/sDAI pool created (https://gnosisscan.io/tx/0x8920d9efac5b1427bbc8e1572b98afe0987aa27fe6e884602ef7757b4a1be8fe)
      endBlock: 39440898, // Cache duration fixed (https://gnosisscan.io/tx/0xa7e848092499d4b29c08daebd80f15d657609a976876b3b026c724d9705a1107)
      chain: "gnosis",
    },
  },
});
