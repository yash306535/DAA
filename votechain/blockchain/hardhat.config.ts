import { HardhatUserConfig, subtask } from "hardhat/config";
import { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } from "hardhat/builtin-tasks/task-names";
import path from "path";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Offline fallback: when binaries.soliditylang.org is unreachable (college lab / firewall),
// set SOLC_OFFLINE=true to compile with the solcjs build shipped in node_modules/solc.
if (process.env.SOLC_OFFLINE === "true") {
  subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args: { solcVersion: string }, _hre, runSuper) => {
    const solcPkg = require("solc/package.json");
    if (args.solcVersion !== solcPkg.version) return runSuper();
    return {
      compilerPath: path.join(path.dirname(require.resolve("solc/package.json")), "soljson.js"),
      isSolcJs: true,
      version: args.solcVersion,
      longVersion: require("solc").version(),
    };
  });
}

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL ?? "";
const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
    // Sepolia is only enabled when both an RPC URL and a deployer key are set in .env
    ...(SEPOLIA_RPC_URL && PRIVATE_KEY
      ? { sepolia: { url: SEPOLIA_RPC_URL, accounts: [PRIVATE_KEY], chainId: 11155111 } }
      : {}),
  },
  etherscan: { apiKey: process.env.ETHERSCAN_API_KEY ?? "" },
  gasReporter: { enabled: process.env.REPORT_GAS === "true", currency: "USD" },
};

export default config;
