import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Test-suite for Voting.sol
 * Covers: registration, candidates, lifecycle, successful vote, duplicate / unregistered /
 * early / late / invalid votes, ending the election, winners and admin authorization.
 */
describe("Voting", function () {
  const TITLE = "Student Council Election 2026";

  async function deployFixture() {
    const [admin, alice, bob, carol, outsider] = await ethers.getSigners();
    const Voting = await ethers.getContractFactory("Voting");
    const voting = await Voting.deploy(admin.address);
    await voting.waitForDeployment();
    return { voting, admin, alice, bob, carol, outsider };
  }

  /** Election created, 3 demo candidates, alice/bob/carol registered, not started. */
  async function setupFixture() {
    const ctx = await deployFixture();
    const { voting, alice, bob, carol } = ctx;
    await voting.createElection(TITLE);
    await voting.addCandidate("Aarav Sharma", "Student First", "Better labs and library hours");
    await voting.addCandidate("Priya Patil", "Future Forward", "Green campus and hackathons");
    await voting.addCandidate("Rahul Deshmukh", "Progress Alliance", "Placement cell and sports");
    await voting.registerVoters([alice.address, bob.address, carol.address]);
    return ctx;
  }

  /** Same as setupFixture but voting is open. */
  async function openFixture() {
    const ctx = await setupFixture();
    await ctx.voting.startElection(0);
    return ctx;
  }

  describe("Deployment & election creation", function () {
    it("sets the deployer as owner and starts with no election", async function () {
      const { voting, admin } = await loadFixture(deployFixture);
      expect(await voting.owner()).to.equal(admin.address);
      expect(await voting.currentElectionId()).to.equal(0n);
      expect(await voting.isVotingOpen()).to.equal(false);
    });

    it("creates an election and emits ElectionCreated", async function () {
      const { voting } = await loadFixture(deployFixture);
      await expect(voting.createElection(TITLE)).to.emit(voting, "ElectionCreated").withArgs(1n, TITLE);
      const info = await voting.getElectionInfo();
      expect(info.id).to.equal(1n);
      expect(info.title).to.equal(TITLE);
      expect(info.started).to.equal(false);
    });

    it("rejects an empty title and a new election while one is running", async function () {
      const { voting } = await loadFixture(deployFixture);
      await expect(voting.createElection("")).to.be.revertedWithCustomError(voting, "EmptyField");
      await voting.createElection(TITLE);
      await expect(voting.createElection("Second")).to.be.revertedWithCustomError(voting, "PreviousElectionNotEnded");
    });
  });

  describe("Candidates", function () {
    it("adds candidates with sequential ids and emits CandidateAdded", async function () {
      const { voting } = await loadFixture(deployFixture);
      await voting.createElection(TITLE);
      await expect(voting.addCandidate("Aarav Sharma", "Student First", "m"))
        .to.emit(voting, "CandidateAdded")
        .withArgs(1n, 1n, "Aarav Sharma", "Student First");
      await voting.addCandidate("Priya Patil", "Future Forward", "m");
      const list = await voting.getCandidates();
      expect(list.length).to.equal(2);
      expect(list[1].id).to.equal(2n);
      expect(list[1].name).to.equal("Priya Patil");
      expect(list[1].voteCount).to.equal(0n);
    });

    it("requires an election and non-empty name/party", async function () {
      const { voting } = await loadFixture(deployFixture);
      await expect(voting.addCandidate("A", "B", "C")).to.be.revertedWithCustomError(voting, "NoElection");
      await voting.createElection(TITLE);
      await expect(voting.addCandidate("", "B", "C")).to.be.revertedWithCustomError(voting, "EmptyField");
      await expect(voting.addCandidate("A", "", "C")).to.be.revertedWithCustomError(voting, "EmptyField");
    });

    it("cannot add candidates after the election has started", async function () {
      const { voting } = await loadFixture(openFixture);
      await expect(voting.addCandidate("Late", "Party", "m")).to.be.revertedWithCustomError(
        voting,
        "ElectionAlreadyStarted"
      );
    });
  });

  describe("Voter registration", function () {
    it("registers a voter and emits VoterRegistered", async function () {
      const { voting, alice } = await loadFixture(deployFixture);
      await voting.createElection(TITLE);
      await expect(voting.registerVoter(alice.address)).to.emit(voting, "VoterRegistered").withArgs(1n, alice.address);
      const [registered, hasVoted] = await voting.getVoterStatus(alice.address);
      expect(registered).to.equal(true);
      expect(hasVoted).to.equal(false);
      expect(await voting.registeredVoterCount(1n)).to.equal(1n);
    });

    it("registers voters in batch", async function () {
      const { voting } = await loadFixture(setupFixture);
      expect((await voting.getElectionInfo()).registeredVoters).to.equal(3n);
    });

    it("rejects duplicate registration and the zero address", async function () {
      const { voting, alice } = await loadFixture(setupFixture);
      await expect(voting.registerVoter(alice.address)).to.be.revertedWithCustomError(voting, "AlreadyRegistered");
      await expect(voting.registerVoter(ethers.ZeroAddress)).to.be.revertedWithCustomError(voting, "InvalidAddress");
    });
  });

  describe("Starting the election", function () {
    it("starts the election and emits ElectionStarted", async function () {
      const { voting } = await loadFixture(setupFixture);
      await expect(voting.startElection(3600)).to.emit(voting, "ElectionStarted");
      const info = await voting.getElectionInfo();
      expect(info.started).to.equal(true);
      expect(info.votingOpen).to.equal(true);
      expect(info.endTime - info.startTime).to.equal(3600n);
    });

    it("cannot start without candidates or twice", async function () {
      const { voting } = await loadFixture(deployFixture);
      await voting.createElection(TITLE);
      await expect(voting.startElection(0)).to.be.revertedWithCustomError(voting, "NoCandidates");
      await voting.addCandidate("A", "B", "C");
      await voting.startElection(0);
      await expect(voting.startElection(0)).to.be.revertedWithCustomError(voting, "ElectionAlreadyStarted");
    });
  });

  describe("Voting", function () {
    it("records a successful vote on-chain", async function () {
      const { voting, alice } = await loadFixture(openFixture);
      await expect(voting.connect(alice).vote(2))
        .to.emit(voting, "VoteCast")
        .withArgs(1n, alice.address, 2n);
      const candidate = await voting.getCandidate(2);
      expect(candidate.voteCount).to.equal(1n);
      expect(await voting.totalVotes(1n)).to.equal(1n);
      const [, hasVoted] = await voting.getVoterStatus(alice.address);
      expect(hasVoted).to.equal(true);
    });

    it("prevents duplicate voting (same or different candidate)", async function () {
      const { voting, alice } = await loadFixture(openFixture);
      await voting.connect(alice).vote(1);
      await expect(voting.connect(alice).vote(1)).to.be.revertedWithCustomError(voting, "AlreadyVoted");
      await expect(voting.connect(alice).vote(3)).to.be.revertedWithCustomError(voting, "AlreadyVoted");
      expect(await voting.totalVotes(1n)).to.equal(1n);
    });

    it("prevents an unregistered wallet from voting", async function () {
      const { voting, outsider } = await loadFixture(openFixture);
      await expect(voting.connect(outsider).vote(1)).to.be.revertedWithCustomError(voting, "NotRegistered");
    });

    it("prevents voting before the election starts", async function () {
      const { voting, alice } = await loadFixture(setupFixture);
      await expect(voting.connect(alice).vote(1)).to.be.revertedWithCustomError(voting, "ElectionNotStarted");
    });

    it("prevents voting after the admin ends the election", async function () {
      const { voting, alice } = await loadFixture(openFixture);
      await voting.endElection();
      await expect(voting.connect(alice).vote(1)).to.be.revertedWithCustomError(voting, "ElectionNotActive");
    });

    it("prevents voting after the scheduled deadline", async function () {
      const { voting, alice } = await loadFixture(setupFixture);
      await voting.startElection(60);
      await time.increase(61);
      expect(await voting.isVotingOpen()).to.equal(false);
      await expect(voting.connect(alice).vote(1)).to.be.revertedWithCustomError(voting, "ElectionNotActive");
    });

    it("prevents voting for an invalid candidate", async function () {
      const { voting, alice } = await loadFixture(openFixture);
      await expect(voting.connect(alice).vote(0)).to.be.revertedWithCustomError(voting, "InvalidCandidate");
      await expect(voting.connect(alice).vote(4)).to.be.revertedWithCustomError(voting, "InvalidCandidate");
      const [, hasVoted] = await voting.getVoterStatus(alice.address);
      expect(hasVoted).to.equal(false);
    });

    it("fails when no election exists", async function () {
      const { voting, alice } = await loadFixture(deployFixture);
      await expect(voting.connect(alice).vote(1)).to.be.revertedWithCustomError(voting, "NoElection");
    });
  });

  describe("Ending the election & results", function () {
    it("ends the election, emits ElectionEnded and freezes results", async function () {
      const { voting, alice, bob, carol } = await loadFixture(openFixture);
      await voting.connect(alice).vote(2);
      await voting.connect(bob).vote(2);
      await voting.connect(carol).vote(1);
      await expect(voting.endElection()).to.emit(voting, "ElectionEnded");

      const info = await voting.getElectionInfo();
      expect(info.ended).to.equal(true);
      expect(info.votingOpen).to.equal(false);
      expect(info.totalVotes).to.equal(3n);

      const [winners, highest] = await voting.getWinners();
      expect(winners).to.deep.equal([2n]);
      expect(highest).to.equal(2n);
    });

    it("reports ties as multiple winners", async function () {
      const { voting, alice, bob } = await loadFixture(openFixture);
      await voting.connect(alice).vote(1);
      await voting.connect(bob).vote(3);
      await voting.endElection();
      const [winners] = await voting.getWinners();
      expect(winners).to.deep.equal([1n, 3n]);
    });

    it("cannot end before start or twice", async function () {
      const { voting } = await loadFixture(setupFixture);
      await expect(voting.endElection()).to.be.revertedWithCustomError(voting, "ElectionNotStarted");
      await voting.startElection(0);
      await voting.endElection();
      await expect(voting.endElection()).to.be.revertedWithCustomError(voting, "ElectionAlreadyEnded");
    });

    it("allows a fresh election after the previous one ended and keeps history", async function () {
      const { voting, alice } = await loadFixture(openFixture);
      await voting.connect(alice).vote(1);
      await voting.endElection();
      await voting.createElection("Second Election");
      expect(await voting.currentElectionId()).to.equal(2n);
      expect((await voting.getCandidates()).length).to.equal(0);
      // history of election 1 is still verifiable
      expect((await voting.getCandidatesOf(1n))[0].voteCount).to.equal(1n);
      // alice must be registered again for the new election
      const [registered] = await voting.getVoterStatus(alice.address);
      expect(registered).to.equal(false);
    });
  });

  describe("Admin authorization", function () {
    it("blocks non-owners from every admin operation", async function () {
      const { voting, outsider, alice } = await loadFixture(setupFixture);
      const asOutsider = voting.connect(outsider);
      const err = "OwnableUnauthorizedAccount";
      await expect(asOutsider.createElection("X")).to.be.revertedWithCustomError(voting, err).withArgs(outsider.address);
      await expect(asOutsider.addCandidate("A", "B", "C")).to.be.revertedWithCustomError(voting, err);
      await expect(asOutsider.registerVoter(outsider.address)).to.be.revertedWithCustomError(voting, err);
      await expect(asOutsider.registerVoters([outsider.address])).to.be.revertedWithCustomError(voting, err);
      await expect(asOutsider.startElection(0)).to.be.revertedWithCustomError(voting, err);
      await voting.startElection(0);
      await expect(voting.connect(alice).endElection()).to.be.revertedWithCustomError(voting, err);
    });
  });
});
