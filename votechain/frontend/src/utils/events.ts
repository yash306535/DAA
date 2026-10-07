import { shortAddress } from "./format";

/** One-line human description of a Voting.sol event. */
export function describeEvent(name: string, a: Record<string, string>) {
  switch (name) {
    case "VoteCast": return `${shortAddress(a.voter)} voted for candidate #${a.candidateId}`;
    case "VoterRegistered": return `${shortAddress(a.voter)} registered`;
    case "CandidateAdded": return `${a.name} (${a.party}) added as #${a.candidateId}`;
    case "ElectionCreated": return `“${a.title}” created`;
    case "ElectionStarted": return "Voting opened";
    case "ElectionEnded": return `Voting closed with ${a.totalVotes} votes`;
    case "OwnershipTransferred": return `Owner set to ${shortAddress(a.newOwner)}`;
    default: return "";
  }
}
