/**
 * Seeds the deployed contract with the demo election:
 *   - "Student Council Election 2026"
 *   - Aarav Sharma (Student First), Priya Patil (Future Forward), Rahul Deshmukh (Progress Alliance)
 *   - registers Hardhat accounts #1..#5 as voters
 *   - starts the election when SEED_START=true
 *
 * Candidates and voters stay fully dynamic: everything here can also be done from the Admin page.
 * Usage: npx hardhat run scripts/seed.ts --network localhost
 */
import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

const CANDIDATES = [
  ["Aarav Sharma", "Student First", "24x7 library access, upgraded computer labs and a transparent student budget."],
  ["Priya Patil", "Future Forward", "Green campus drive, monthly hackathons and stronger industry mentorship."],
  ["Rahul Deshmukh", "Progress Alliance", "Active placement cell, better sports facilities and a student help desk."],
] as const;

async function main() {
  const file = path.resolve(__dirname, `../deployments/${network.name}.json`);
  if (!fs.existsSync(file)) throw new Error(`No deployment for ${network.name}. Run the deploy script first.`);
  const { address } = JSON.parse(fs.readFileSync(file, "utf8"));

  const signers = await ethers.getSigners();
  const voting = await ethers.getContractAt("Voting", address, signers[0]);

  const title = process.env.SEED_TITLE ?? "Student Council Election 2026";
  await (await voting.createElection(title)).wait();
  console.log(`Election created: ${title}`);

  for (const [name, party, manifesto] of CANDIDATES) {
    await (await voting.addCandidate(name, party, manifesto)).wait();
    console.log(`Candidate added : ${name} – ${party}`);
  }

  const voters = signers.slice(1, 6).map((s) => s.address);
  if (voters.length) {
    await (await voting.registerVoters(voters)).wait();
    voters.forEach((v, i) => console.log(`Voter #${i + 1}       : ${v}`));
  }

  if (process.env.SEED_START === "true") {
    await (await voting.startElection(0)).wait();
    console.log("Election started (no deadline, end it from the Admin page).");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
