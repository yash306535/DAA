// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title  VoteChain - Voting
 * @author Yashvant Dayanand Mane (F24121004)
 * @notice Decentralized e-voting contract. The contract is the single source of truth for
 *         elections, candidates, registered voters, vote status and vote counts.
 *
 * @dev    ACADEMIC / DEMONSTRATION SYSTEM ONLY.
 *         It is NOT suitable for real government elections. Real elections need verified
 *         identity, ballot secrecy, coercion resistance, auditability by independent parties
 *         and a legal framework. Wallet addresses and transactions on a public chain are
 *         visible to everyone, so a vote is pseudonymous, not anonymous.
 *
 *         Lifecycle of one election:
 *           createElection -> addCandidate / registerVoter(s) -> startElection -> vote -> endElection
 *         A new election can be created once the previous one has ended. Data of older
 *         elections stays on-chain and can still be queried by election id.
 */
contract Voting is Ownable {
    // ------------------------------------------------------------------
    // Data model
    // ------------------------------------------------------------------

    struct Candidate {
        uint256 id;
        string name;
        string party;
        string manifesto;
        uint256 voteCount;
    }

    struct Voter {
        bool registered;
        bool hasVoted;
    }

    struct Election {
        string title;
        uint256 startTime; // set when the election is started
        uint256 endTime; // scheduled deadline (0 = no deadline) or actual end time once ended
        bool started;
        bool ended;
    }

    /// @notice Summary returned to the frontend in a single call.
    struct ElectionInfo {
        uint256 id;
        string title;
        uint256 startTime;
        uint256 endTime;
        bool started;
        bool ended;
        bool votingOpen;
        uint256 candidateCount;
        uint256 registeredVoters;
        uint256 totalVotes;
    }

    /// @notice Id of the latest election (0 = no election created yet).
    uint256 public currentElectionId;

    mapping(uint256 => Election) private _elections;
    mapping(uint256 => Candidate[]) private _candidates;
    mapping(uint256 => mapping(address => Voter)) private _voters;
    mapping(uint256 => uint256) public registeredVoterCount;
    mapping(uint256 => uint256) public totalVotes;

    // ------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------

    event ElectionCreated(uint256 indexed electionId, string title);
    event CandidateAdded(uint256 indexed electionId, uint256 indexed candidateId, string name, string party);
    event VoterRegistered(uint256 indexed electionId, address indexed voter);
    event ElectionStarted(uint256 indexed electionId, uint256 startTime, uint256 endTime);
    event VoteCast(uint256 indexed electionId, address indexed voter, uint256 indexed candidateId);
    event ElectionEnded(uint256 indexed electionId, uint256 endTime, uint256 totalVotes);

    // ------------------------------------------------------------------
    // Custom errors (cheaper than revert strings, decoded by the frontend)
    // ------------------------------------------------------------------

    error NoElection();
    error PreviousElectionNotEnded();
    error ElectionAlreadyStarted();
    error ElectionNotStarted();
    error ElectionAlreadyEnded();
    error ElectionNotActive();
    error EmptyField();
    error NoCandidates();
    error InvalidCandidate();
    error InvalidAddress();
    error AlreadyRegistered();
    error NotRegistered();
    error AlreadyVoted();

    // ------------------------------------------------------------------
    // Modifiers
    // ------------------------------------------------------------------

    modifier electionExists() {
        if (currentElectionId == 0) revert NoElection();
        _;
    }

    /// @dev Setup phase: election created but not yet started.
    modifier beforeStart() {
        if (currentElectionId == 0) revert NoElection();
        if (_elections[currentElectionId].started) revert ElectionAlreadyStarted();
        _;
    }

    /// @dev Voting is only possible while the current election is open.
    modifier onlyWhileOpen() {
        if (currentElectionId == 0) revert NoElection();
        Election storage e = _elections[currentElectionId];
        if (!e.started) revert ElectionNotStarted();
        if (e.ended || (e.endTime != 0 && block.timestamp > e.endTime)) revert ElectionNotActive();
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ------------------------------------------------------------------
    // Admin operations
    // ------------------------------------------------------------------

    /// @notice Create a new election. Allowed when there is none yet or the last one has ended.
    function createElection(string calldata title) external onlyOwner returns (uint256 electionId) {
        if (bytes(title).length == 0) revert EmptyField();
        if (currentElectionId != 0 && !_elections[currentElectionId].ended) revert PreviousElectionNotEnded();

        electionId = ++currentElectionId;
        _elections[electionId].title = title;
        emit ElectionCreated(electionId, title);
    }

    /// @notice Add a candidate to the current election (only before voting starts).
    function addCandidate(
        string calldata name,
        string calldata party,
        string calldata manifesto
    ) external onlyOwner beforeStart returns (uint256 candidateId) {
        if (bytes(name).length == 0 || bytes(party).length == 0) revert EmptyField();

        Candidate[] storage list = _candidates[currentElectionId];
        candidateId = list.length + 1; // ids start at 1, 0 is never valid
        list.push(Candidate(candidateId, name, party, manifesto, 0));
        emit CandidateAdded(currentElectionId, candidateId, name, party);
    }

    /// @notice Authorize one wallet address to vote in the current election.
    function registerVoter(address voter) external onlyOwner electionExists {
        _register(voter);
    }

    /// @notice Authorize many wallet addresses in one transaction (saves gas and clicks).
    function registerVoters(address[] calldata voters) external onlyOwner electionExists {
        for (uint256 i = 0; i < voters.length; ++i) {
            _register(voters[i]);
        }
    }

    /**
     * @notice Open voting.
     * @param durationSeconds Optional automatic deadline. 0 = stays open until endElection().
     */
    function startElection(uint256 durationSeconds) external onlyOwner beforeStart {
        uint256 id = currentElectionId;
        if (_candidates[id].length == 0) revert NoCandidates();

        Election storage e = _elections[id];
        e.started = true;
        e.startTime = block.timestamp;
        e.endTime = durationSeconds == 0 ? 0 : block.timestamp + durationSeconds;
        emit ElectionStarted(id, e.startTime, e.endTime);
    }

    /// @notice Close voting and freeze the results.
    function endElection() external onlyOwner electionExists {
        uint256 id = currentElectionId;
        Election storage e = _elections[id];
        if (!e.started) revert ElectionNotStarted();
        if (e.ended) revert ElectionAlreadyEnded();

        e.ended = true;
        // Record the actual closing moment (or keep an earlier deadline that already passed).
        if (e.endTime == 0 || block.timestamp < e.endTime) e.endTime = block.timestamp;
        emit ElectionEnded(id, e.endTime, totalVotes[id]);
    }

    // ------------------------------------------------------------------
    // Voting
    // ------------------------------------------------------------------

    /// @notice Cast exactly one vote for a candidate in the current election.
    function vote(uint256 candidateId) external onlyWhileOpen {
        uint256 id = currentElectionId;
        Voter storage v = _voters[id][msg.sender];
        if (!v.registered) revert NotRegistered();
        if (v.hasVoted) revert AlreadyVoted();
        if (candidateId == 0 || candidateId > _candidates[id].length) revert InvalidCandidate();

        // Effects only; no external calls, so no re-entrancy surface.
        v.hasVoted = true;
        _candidates[id][candidateId - 1].voteCount += 1;
        totalVotes[id] += 1;
        emit VoteCast(id, msg.sender, candidateId);
    }

    // ------------------------------------------------------------------
    // Public views (anyone can verify)
    // ------------------------------------------------------------------

    /// @notice Raw election record for any election id.
    function getElection(uint256 electionId) external view returns (Election memory) {
        return _elections[electionId];
    }

    /// @notice Everything the dashboard needs about the current election in one call.
    function getElectionInfo() external view returns (ElectionInfo memory info) {
        uint256 id = currentElectionId;
        Election storage e = _elections[id];
        info = ElectionInfo({
            id: id,
            title: e.title,
            startTime: e.startTime,
            endTime: e.endTime,
            started: e.started,
            ended: e.ended,
            votingOpen: isVotingOpen(),
            candidateCount: _candidates[id].length,
            registeredVoters: registeredVoterCount[id],
            totalVotes: totalVotes[id]
        });
    }

    /// @notice True while votes are accepted for the current election.
    function isVotingOpen() public view returns (bool) {
        if (currentElectionId == 0) return false;
        Election storage e = _elections[currentElectionId];
        return e.started && !e.ended && (e.endTime == 0 || block.timestamp <= e.endTime);
    }

    /// @notice All candidates (with live vote counts) of the current election.
    function getCandidates() external view returns (Candidate[] memory) {
        return _candidates[currentElectionId];
    }

    /// @notice Candidates of any election id (history / audit).
    function getCandidatesOf(uint256 electionId) external view returns (Candidate[] memory) {
        return _candidates[electionId];
    }

    function getCandidate(uint256 candidateId) external view returns (Candidate memory) {
        if (candidateId == 0 || candidateId > _candidates[currentElectionId].length) revert InvalidCandidate();
        return _candidates[currentElectionId][candidateId - 1];
    }

    function getCandidateCount() external view returns (uint256) {
        return _candidates[currentElectionId].length;
    }

    /// @notice Registration and voting status of a wallet in the current election.
    function getVoterStatus(address voter) external view returns (bool registered, bool hasVoted) {
        Voter storage v = _voters[currentElectionId][voter];
        return (v.registered, v.hasVoted);
    }

    /// @notice Candidate id(s) with the highest vote count. More than one id means a tie.
    /// @dev    Only meaningful after the election has ended; the frontend shows it then.
    function getWinners() external view returns (uint256[] memory winners, uint256 highestVotes) {
        Candidate[] storage list = _candidates[currentElectionId];
        uint256 count;
        for (uint256 i = 0; i < list.length; ++i) {
            if (list[i].voteCount > highestVotes) {
                highestVotes = list[i].voteCount;
                count = 1;
            } else if (list[i].voteCount == highestVotes) {
                ++count;
            }
        }
        winners = new uint256[](count);
        uint256 k;
        for (uint256 i = 0; i < list.length; ++i) {
            if (list[i].voteCount == highestVotes) winners[k++] = list[i].id;
        }
    }

    // ------------------------------------------------------------------
    // Internal
    // ------------------------------------------------------------------

    function _register(address voter) private {
        uint256 id = currentElectionId;
        if (_elections[id].ended) revert ElectionAlreadyEnded();
        if (voter == address(0)) revert InvalidAddress();
        Voter storage v = _voters[id][voter];
        if (v.registered) revert AlreadyRegistered();
        v.registered = true;
        registeredVoterCount[id] += 1;
        emit VoterRegistered(id, voter);
    }
}
