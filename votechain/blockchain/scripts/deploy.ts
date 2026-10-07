/**
 * Deploys Voting.sol and exports what the frontend needs:
 *   - frontend/src/contracts/VotingABI.json   (ABI, generated from the compiled artifact)
 *   - frontend/.env.local                      (contract address, chain id, explorer, RPC)
 *   - blockchain/deployments/<network>.json    (deployment record)
 *
 * Usage: npx hardhat run scripts/deploy.ts --network localhost|sepolia
 */
import { ethers, network, artifacts } from "hardhat";
import fs from "fs";
import path from "path";

const FRONTEND_DIR = path.resolve(__dirname, "../../frontend");

const EXPLORERS: Record<number, string> = {
  31337: "", // local chain has no public explorer; the dApp has its own built-in explorer page
  11155111: "https://sepolia.etherscan.io",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const { chainId } = await ethers.provider.getNetwork();

  console.log(`Network     : ${network.name} (chainId ${chainId})`);
  console.log(`Deployer    : ${deployer.address}`);

  const Voting = await ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(deployer.address);
  await voting.waitForDeployment();
  const address = await voting.getAddress();
  const receipt = await voting.deploymentTransaction()?.wait();

  console.log(`Voting      : ${address}`);
  console.log(`Deploy block: ${receipt?.blockNumber}`);

  // 1. deployment record
  const deployment = {
    network: network.name,
    chainId: Number(chainId),
    address,
    deployer: deployer.address,
    blockNumber: receipt?.blockNumber ?? 0,
    txHash: receipt?.hash,
    deployedAt: new Date().toISOString(),
  };
  const depDir = path.resolve(__dirname, "../deployments");
  fs.mkdirSync(depDir, { recursive: true });
  fs.writeFileSync(path.join(depDir, `${network.name}.json`), JSON.stringify(deployment, null, 2));

  // 2. ABI for the frontend
  const artifact = await artifacts.readArtifact("Voting");
  const contractsDir = path.join(FRONTEND_DIR, "src/contracts");
  fs.mkdirSync(contractsDir, { recursive: true });
  fs.writeFileSync(path.join(contractsDir, "VotingABI.json"), JSON.stringify(artifact.abi, null, 2));
  // bytecode is used by the in-browser demo chain (frontend demo mode)
  fs.writeFileSync(path.join(contractsDir, "VotingBytecode.json"), JSON.stringify({ bytecode: artifact.bytecode }));

  // 3. frontend environment
  const rpc = network.name === "localhost" || network.name === "hardhat" ? "http://127.0.0.1:8545" : "";
  const env = [
    `VITE_CONTRACT_ADDRESS=${address}`,
    `VITE_CHAIN_ID=${chainId}`,
    `VITE_CHAIN_NAME=${network.name === "sepolia" ? "Sepolia" : "Hardhat Local"}`,
    `VITE_RPC_URL=${rpc}`,
    `VITE_EXPLORER_URL=${EXPLORERS[Number(chainId)] ?? ""}`,
    `VITE_DEPLOY_BLOCK=${receipt?.blockNumber ?? 0}`,
    "",
  ].join("\n");
  if (fs.existsSync(FRONTEND_DIR)) {
    fs.writeFileSync(path.join(FRONTEND_DIR, ".env.local"), env);
    console.log("Wrote frontend/.env.local and frontend/src/contracts/VotingABI.json");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
