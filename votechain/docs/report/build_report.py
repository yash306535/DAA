"""Generates report.html for the VoteChain mini project report (rendered to PDF with Chromium)."""
import os, html
HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, "..", "screenshots")

# ---------------------------------------------------------------- SVG helpers
P, PL, B, G, GR = "#6d28d9", "#ede9fe", "#1d4ed8", "#e0e7ff", "#374151"

def svg(w, h, body):
    return f'''<svg viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Arial" font-size="13">
<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{GR}"/></marker></defs>{body}</svg>'''

def txt(x, y, s, size=13, weight=400, anchor="middle", fill="#111827"):
    lines = s.split("\n"); out = ""
    y0 = y - (len(lines) - 1) * size * 0.6
    for i, l in enumerate(lines):
        out += f'<text x="{x}" y="{y0 + i*size*1.2}" text-anchor="{anchor}" dominant-baseline="middle" font-size="{size}" font-weight="{weight}" fill="{fill}">{html.escape(l)}</text>'
    return out

def box(x, y, w, h, label, fill=PL, stroke=P, size=13, weight=600, rx=10, dash=False):
    d = ' stroke-dasharray="5 4"' if dash else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="1.6"{d}/>' + txt(x+w/2, y+h/2, label, size, weight)

def arrow(x1, y1, x2, y2, label="", both=False, lx=0, ly=-9, size=11):
    s = f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{GR}" stroke-width="1.5" marker-end="url(#ar)"{" marker-start=\"url(#ar)\"" if both else ""}/>'
    if label: s += txt((x1+x2)/2+lx, (y1+y2)/2+ly, label, size, 500, fill="#4b5563")
    return s

def poly(points, label="", lx=0, ly=0):
    pts = " ".join(f"{x},{y}" for x, y in points)
    s = f'<polyline points="{pts}" fill="none" stroke="{GR}" stroke-width="1.5" marker-end="url(#ar)"/>'
    if label: s += txt(lx, ly, label, 11, 500, fill="#4b5563")
    return s

def circle_proc(cx, cy, r, label, size=12):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{G}" stroke="{B}" stroke-width="1.6"/>' + txt(cx, cy, label, size, 600)

def store(x, y, w, label):
    return f'<line x1="{x}" y1="{y}" x2="{x+w}" y2="{y}" stroke="{GR}" stroke-width="1.6"/><line x1="{x}" y1="{y+34}" x2="{x+w}" y2="{y+34}" stroke="{GR}" stroke-width="1.6"/><line x1="{x}" y1="{y}" x2="{x}" y2="{y+34}" stroke="{GR}" stroke-width="1.6"/>' + txt(x+w/2+6, y+17, label, 12, 600)

# 1. Architecture
arch = svg(860, 560,
    box(330, 10, 200, 46, "Users\nAdmin · Voter · Observer", "#f3f4f6", GR, 12)
  + arrow(430, 56, 430, 84)
  + f'<rect x="60" y="86" width="740" height="128" rx="14" fill="#faf5ff" stroke="{P}" stroke-width="1.6"/>'
  + txt(430, 106, "Frontend · React + Vite + TypeScript + Tailwind CSS", 14, 700, fill=P)
  + box(80, 124, 160, 72, "Pages\nHome · Vote · Results\nAdmin · Explorer", "#fff", P, 11, 500)
  + box(258, 124, 160, 72, "Hooks (state)\nuseWallet · useElection\nuseTransactions", "#fff", P, 11, 500)
  + box(436, 124, 160, 72, "Services\nvotingService.ts\n(read / write calls)", "#fff", P, 11, 500)
  + box(614, 124, 168, 72, "contracts/config.ts\naddress · ABI · chainId\nexplorer URL (.env)", "#fff", P, 11, 500)
  + arrow(300, 214, 300, 252, "write: sign tx", lx=-52, ly=0)
  + box(200, 254, 200, 52, "MetaMask (EIP-1193)\nprivate key · signs tx", "#fff7ed", "#c2410c", 12)
  + arrow(300, 306, 300, 336)
  + box(200, 338, 200, 46, "ethers.js v6\nABI encode / decode", G, B, 12)
  + poly([(560, 214), (560, 361), (402, 361)], "read-only JSON-RPC\n(no wallet needed)", 640, 300)
  + arrow(300, 384, 300, 414)
  + f'<rect x="60" y="416" width="740" height="130" rx="14" fill="#eff6ff" stroke="{B}" stroke-width="1.6"/>'
  + txt(430, 436, "Ethereum-compatible blockchain · Hardhat Local (31337) / Sepolia (11155111)", 14, 700, fill=B)
  + box(90, 456, 300, 76, "Voting.sol smart contract\nOwnable · modifiers · custom errors\nvote() · admin functions · views", "#fff", B, 12, 600)
  + box(420, 456, 170, 76, "Contract storage\nelections · candidates\nvoters · vote counts", "#fff", B, 11, 500)
  + box(610, 456, 170, 76, "Event log\nVoteCast · VoterRegistered\nCandidateAdded …", "#fff", B, 11, 500)
  + arrow(390, 494, 418, 494) + arrow(590, 494, 608, 494))

# 2. DFD level 0
dfd0 = svg(860, 330,
    box(20, 40, 170, 56, "Election Admin\n(contract owner)", "#f3f4f6", GR)
  + box(20, 230, 170, 56, "Voter\n(registered wallet)", "#f3f4f6", GR)
  + box(670, 135, 170, 56, "Public Observer", "#f3f4f6", GR)
  + circle_proc(430, 163, 105, "0.0\nVoteChain\nE-Voting System", 14)
  + arrow(190, 60, 340, 110, "election, candidates,\nvoter addresses, start/end", lx=-10, ly=-26)
  + arrow(330, 140, 190, 84, "tx receipts, statistics", lx=-10, ly=14)
  + arrow(190, 248, 340, 210, "connect wallet, vote(candidateId)", lx=-20, ly=20)
  + arrow(332, 228, 190, 270, "eligibility, status, tx hash", lx=-30, ly=26)
  + arrow(535, 150, 670, 150, "results, events", ly=-12)
  + arrow(670, 178, 535, 178, "query / verify", ly=14))

# 3. DFD level 1
dfd1 = svg(880, 560,
    box(10, 20, 130, 46, "Admin", "#f3f4f6", GR) + box(10, 300, 130, 46, "Voter", "#f3f4f6", GR) + box(740, 300, 130, 46, "Observer", "#f3f4f6", GR)
  + circle_proc(250, 60, 50, "1.0\nWallet\nConnect", 11)
  + circle_proc(440, 60, 50, "2.0\nManage\nElection", 11)
  + circle_proc(630, 60, 50, "3.0\nRegister\nVoters", 11)
  + circle_proc(300, 320, 55, "4.0\nCast\nVote", 12)
  + circle_proc(560, 320, 55, "5.0\nCompute\nResults", 12)
  + circle_proc(560, 480, 50, "6.0\nExplorer /\nAudit", 11)
  + store(330, 170, 150, "D1 Elections") + store(500, 170, 160, "D2 Candidates") + store(690, 170, 140, "D3 Voters")
  + store(80, 450, 170, "D4 Event log")
  + arrow(140, 43, 198, 52, "") + arrow(300, 60, 388, 60, "address") + arrow(490, 60, 578, 60, "")
  + arrow(440, 110, 410, 168, "title, times", lx=-40, ly=0) + arrow(470, 108, 560, 168, "name, party", lx=40, ly=-4)
  + arrow(650, 110, 740, 168, "registered=true", lx=52, ly=-4)
  + arrow(140, 320, 243, 320, "candidateId")
  + arrow(405, 204, 330, 268, "status", lx=-30, ly=0) + arrow(740, 204, 350, 280, "check registered / hasVoted", lx=40, ly=-12)
  + arrow(340, 362, 545, 210, "voteCount + 1", lx=10, ly=40)
  + arrow(260, 368, 200, 448, "VoteCast", lx=-30, ly=0)
  + arrow(580, 204, 566, 263, "counts", lx=28, ly=0) + arrow(615, 320, 740, 320, "results, winner")
  + arrow(250, 466, 508, 478, "events", ly=-10) + arrow(610, 480, 760, 348, "tx details", lx=30, ly=10))

# 4. Use case
def actor(x, y, name):
    return (f'<circle cx="{x}" cy="{y}" r="13" fill="none" stroke="{GR}" stroke-width="1.6"/><line x1="{x}" y1="{y+13}" x2="{x}" y2="{y+48}" stroke="{GR}" stroke-width="1.6"/>'
            f'<line x1="{x-20}" y1="{y+26}" x2="{x+20}" y2="{y+26}" stroke="{GR}" stroke-width="1.6"/><line x1="{x}" y1="{y+48}" x2="{x-16}" y2="{y+72}" stroke="{GR}" stroke-width="1.6"/><line x1="{x}" y1="{y+48}" x2="{x+16}" y2="{y+72}" stroke="{GR}" stroke-width="1.6"/>' + txt(x, y+90, name, 13, 700))
def uc(cx, cy, label):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="112" ry="22" fill="{PL}" stroke="{P}" stroke-width="1.4"/>' + txt(cx, cy, label, 12, 500)
def ln(x1, y1, x2, y2): return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#9ca3af" stroke-width="1.2"/>'
admin_uc = ["Create election", "Add candidates", "Register voters", "Start election", "End election", "View statistics & events"]
voter_uc = ["Connect wallet", "Check eligibility", "View candidates", "Cast vote (once)", "View tx on explorer"]
pub_uc = ["View live results", "Verify events on-chain"]
body = f'<rect x="150" y="10" width="560" height="560" rx="16" fill="#fafafa" stroke="{GR}" stroke-width="1.4"/>' + txt(430, 30, "VoteChain System", 14, 700)
for i, u in enumerate(admin_uc): y = 60 + i*44; body += uc(300, y, u) + ln(80, 140, 188, y)
for i, u in enumerate(voter_uc): y = 330 + i*44; body += uc(300, y, u) + ln(80, 420, 188, y)
for i, u in enumerate(pub_uc): y = 150 + i*60; body += uc(570, y, u) + ln(790, 200, 682, y)
body += uc(570, 420, "Ownership check (onlyOwner)") + ln(412, 104, 470, 410) + uc(570, 500, "Validate vote (contract)") + ln(412, 462, 458, 500)
body += actor(60, 100, "Admin") + actor(60, 380, "Voter") + actor(810, 160, "Public")
usecase = svg(880, 590, body)

# 5. Sequence diagram
lanes = [("Voter", 60), ("React UI", 205), ("MetaMask", 350), ("ethers.js", 495), ("Blockchain node", 640), ("Voting.sol", 790)]
seq = ""
for n, x in lanes:
    seq += box(x-62, 8, 124, 36, n, PL if n != "Voting.sol" else G, P if n != "Voting.sol" else B, 12) + f'<line x1="{x}" y1="44" x2="{x}" y2="600" stroke="#9ca3af" stroke-dasharray="4 4"/>'
msgs = [(0,1,"click Vote → confirm modal"),(1,3,"contract.vote(id)"),(3,4,"eth_estimateGas (dry run)"),(4,5,"execute checks"),(5,4,"ok / revert(custom error)"),(3,2,"eth_sendTransaction"),(2,0,"show gas, ask approval"),(0,2,"Confirm"),(2,4,"signed transaction"),(4,5,"vote(): checks → effects"),(5,4,"VoteCast event, state saved"),(4,3,"tx hash → receipt (mined)"),(3,1,"receipt: block, status"),(1,0,"✓ recorded + hash + explorer link"),(1,5,"refresh: getCandidates(), getVoterStatus()")]
for i,(a,b,l) in enumerate(msgs):
    y = 70 + i*35; x1, x2 = lanes[a][1], lanes[b][1]; off = 6 if x2 > x1 else -6
    seq += arrow(x1, y, x2-off, y, l, ly=-9, size=10.5)
seqd = svg(860, 610, seq)

# 6. vote validation flowchart
def dia(cx, cy, label):
    return f'<polygon points="{cx},{cy-30} {cx+130},{cy} {cx},{cy+30} {cx-130},{cy}" fill="#fef3c7" stroke="#b45309" stroke-width="1.5"/>' + txt(cx, cy, label, 11.5, 600)
fl = box(330, 6, 200, 38, "vote(candidateId)", G, B)
checks = [("Election exists & started?", "ElectionNotStarted"), ("Not ended & before deadline?", "ElectionNotActive"), ("Voter registered?", "NotRegistered"), ("Not voted already?", "AlreadyVoted"), ("1 ≤ id ≤ candidateCount?", "InvalidCandidate")]
y = 44
for i,(q,e) in enumerate(checks):
    cy = y + 50 + i*78
    fl += arrow(430, cy-48 if i else 44, 430, cy-31) + dia(430, cy, q) + arrow(560, cy, 650, cy, "No", ly=-9) + box(652, cy-17, 190, 34, "revert " + e, "#fee2e2", "#b91c1c", 11.5)
    fl += txt(445, cy+40, "Yes", 11, 600, "start", "#4b5563")
last = y + 50 + 4*78
fl += arrow(430, last+30, 430, last+56) + box(280, last+58, 300, 58, "hasVoted = true · voteCount += 1\ntotalVotes += 1 · emit VoteCast", "#dcfce7", "#15803d", 12)
flow = svg(860, last+130, fl)

# 7. State diagram
st = (box(20, 70, 120, 46, "No election", "#f3f4f6", GR) + box(210, 70, 140, 46, "Setup\n(candidates, voters)", PL, P, 12)
      + box(430, 70, 130, 46, "Active\n(voting open)", "#dcfce7", "#15803d", 12) + box(640, 70, 130, 46, "Ended\n(results final)", "#fee2e2", "#b91c1c", 12)
      + box(430, 180, 130, 46, "Deadline passed\n(votes rejected)", "#fef3c7", "#b45309", 11)
      + arrow(140, 93, 208, 93, "createElection", ly=-12) + arrow(350, 93, 428, 93, "startElection", ly=-12) + arrow(560, 93, 638, 93, "endElection", ly=-12)
      + arrow(495, 116, 495, 178, "time > endTime", lx=50, ly=0) + poly([(560, 203), (705, 203), (705, 118)], "endElection", 640, 190)
      + poly([(705, 70), (705, 30), (280, 30), (280, 68)], "createElection (new id)", 490, 20))
state = svg(800, 240, st)

# ---------------------------------------------------------------- content
def fig(svgc, n, cap): return f'<figure class="diagram">{svgc}<figcaption>Figure {n}: {cap}</figcaption></figure>'
def shot(f, n, cap, cls=""): return f'<figure class="shot {cls}"><img src="../screenshots/{f}"/><figcaption>Figure {n}: {cap}</figcaption></figure>'
def table(head, rows, cls=""):
    h = "".join(f"<th>{c}</th>" for c in head)
    r = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in row) + "</tr>" for row in rows)
    return f'<table class="{cls}"><thead><tr>{h}</tr></thead><tbody>{r}</tbody></table>'

tests = [
 ("TC01","Deployment","Deployer is owner, no election yet","Pass"),
 ("TC02","Create election","ElectionCreated emitted, id = 1","Pass"),
 ("TC03","Create election","Empty title / second running election rejected","Pass"),
 ("TC04","Add candidate","Sequential ids, CandidateAdded emitted","Pass"),
 ("TC05","Add candidate","Needs election; empty name/party rejected","Pass"),
 ("TC06","Add candidate","Rejected after election started","Pass"),
 ("TC07","Register voter","VoterRegistered emitted, status = registered","Pass"),
 ("TC08","Register voters (batch)","5 addresses registered in one tx","Pass"),
 ("TC09","Register voter","Duplicate & zero address rejected","Pass"),
 ("TC10","Start election","ElectionStarted, votingOpen = true, deadline set","Pass"),
 ("TC11","Start election","Without candidates / twice rejected","Pass"),
 ("TC12","Successful vote","Count +1, totalVotes +1, hasVoted = true","Pass"),
 ("TC13","Duplicate vote","Second vote (same or other candidate) → AlreadyVoted","Pass"),
 ("TC14","Unregistered voter","NotRegistered","Pass"),
 ("TC15","Vote before start","ElectionNotStarted","Pass"),
 ("TC16","Vote after end","ElectionNotActive","Pass"),
 ("TC17","Vote after deadline","Time travel +61 s → ElectionNotActive","Pass"),
 ("TC18","Invalid candidate","id 0 and id 4 → InvalidCandidate","Pass"),
 ("TC19","No election","vote() → NoElection","Pass"),
 ("TC20","End election","ElectionEnded, results frozen, winner = #2","Pass"),
 ("TC21","Tie","getWinners() returns [1, 3]","Pass"),
 ("TC22","End election","Before start / twice rejected","Pass"),
 ("TC23","New election","History of election #1 preserved","Pass"),
 ("TC24","Admin authorization","All admin functions revert for non-owner","Pass"),
]
gas = [("Deploy Voting.sol","1,831,518"),("createElection","71,620"),("addCandidate (first)","216,580"),("addCandidate","≈199,450"),("registerVoters (5 addresses)","176,501"),("startElection","76,787"),("vote (first vote of election)","82,623"),("vote (candidate already has votes)","48,423"),("endElection","57,210")]

CONTRACT_SNIPPET = html.escape('''function vote(uint256 candidateId) external onlyWhileOpen {
    uint256 id = currentElectionId;
    Voter storage v = _voters[id][msg.sender];
    if (!v.registered) revert NotRegistered();
    if (v.hasVoted) revert AlreadyVoted();
    if (candidateId == 0 || candidateId > _candidates[id].length) revert InvalidCandidate();

    v.hasVoted = true;                                   // effects only, no external calls
    _candidates[id][candidateId - 1].voteCount += 1;
    totalVotes[id] += 1;
    emit VoteCast(id, msg.sender, candidateId);
}''')
MODIFIER_SNIPPET = html.escape('''modifier onlyWhileOpen() {
    if (currentElectionId == 0) revert NoElection();
    Election storage e = _elections[currentElectionId];
    if (!e.started) revert ElectionNotStarted();
    if (e.ended || (e.endTime != 0 && block.timestamp > e.endTime)) revert ElectionNotActive();
    _;
}''')

TITLE = "Design and Develop a Blockchain-Based Decentralized E-Voting System"

doc = f'''<!doctype html><html><head><meta charset="utf-8"><title>VoteChain Mini Project Report</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
@page {{ size: A4; margin: 20mm 18mm 20mm 18mm; }}
* {{ box-sizing: border-box; }}
body {{ font-family: "Source Serif 4", Georgia, serif; font-size: 11.3pt; line-height: 1.55; color: #111827; margin: 0; }}
h1, h2, h3, h4 {{ font-family: Inter, Arial, sans-serif; color: #1f1147; }}
h2 {{ font-size: 17pt; margin: 0 0 10px; padding-bottom: 6px; border-bottom: 2.5px solid #6d28d9; break-after: avoid; }}
h3 {{ font-size: 12.8pt; margin: 18px 0 6px; color: #4c1d95; break-after: avoid; }}
h4 {{ font-size: 11.5pt; margin: 12px 0 4px; break-after: avoid; }}
p {{ margin: 0 0 9px; text-align: justify; }}
ul, ol {{ margin: 4px 0 10px; padding-left: 22px; }} li {{ margin-bottom: 3px; }}
.page {{ break-after: page; }}
.chapter {{ break-before: page; }}
table {{ width: 100%; border-collapse: collapse; margin: 8px 0 14px; font-family: Inter, Arial; font-size: 9.4pt; break-inside: auto; }}
th {{ background: #ede9fe; color: #3b0764; text-align: left; padding: 6px 8px; border: 1px solid #c4b5fd; }}
td {{ padding: 5px 8px; border: 1px solid #ddd6fe; vertical-align: top; }}
tr {{ break-inside: avoid; }}
tbody tr:nth-child(even) td {{ background: #faf8ff; }}
code, pre {{ font-family: "JetBrains Mono", monospace; }}
code {{ font-size: 9.2pt; background: #f3f0ff; padding: 1px 4px; border-radius: 4px; color: #4c1d95; }}
pre {{ background: #0f0f2e; color: #e0e7ff; padding: 12px 14px; border-radius: 8px; font-size: 8.6pt; line-height: 1.45; white-space: pre-wrap; break-inside: avoid; }}
figure {{ margin: 12px 0 16px; text-align: center; break-inside: avoid; }}
figure.diagram svg {{ width: 100%; height: auto; max-height: 205mm; }}
figure.shot img {{ max-width: 100%; max-height: 120mm; border: 1px solid #d1d5db; border-radius: 6px; }}
figure.shot.tall img {{ max-height: 195mm; }}
figure.shot.small img {{ max-height: 95mm; }}
figcaption {{ font-family: Inter, Arial; font-size: 9pt; color: #4b5563; margin-top: 6px; font-style: italic; }}
.note {{ border-left: 4px solid #d97706; background: #fffbeb; padding: 9px 12px; margin: 10px 0 14px; font-size: 10.5pt; break-inside: avoid; }}
.note p:last-child {{ margin: 0; }}
.kw {{ font-family: Inter; font-size: 10pt; }}
/* Cover */
.cover {{ text-align: center; font-family: "Source Serif 4", serif; padding-top: 4mm; }}
.cover .uni {{ font-size: 17pt; font-weight: 700; }}
.cover .col {{ font-size: 14.5pt; font-weight: 700; margin-top: 4px; }}
.cover .addr {{ font-size: 11pt; }}
.cover .acc {{ font-size: 10.5pt; font-weight: 700; margin-top: 8px; letter-spacing: .5px; }}
.cover .dept {{ font-size: 13.5pt; font-weight: 700; margin: 26px 0 0; }}
.cover .a {{ font-size: 13pt; margin-top: 36px; font-weight: 700; }}
.cover .mpr {{ font-size: 20pt; font-weight: 700; letter-spacing: 1px; }}
.cover .ttl {{ font-size: 18pt; font-weight: 700; color: #3b0764; margin: 14px 18mm 4px; line-height: 1.3; }}
.cover .sub {{ font-size: 12.5pt; font-style: italic; color: #4c1d95; }}
.cover .deg {{ font-size: 13pt; font-weight: 700; margin-top: 14px; }}
.cover .lbl {{ font-size: 13pt; font-weight: 700; margin-top: 30px; text-decoration: underline; }}
.cover table {{ width: 72%; margin: 10px auto; font-family: "Source Serif 4"; font-size: 12.5pt; }}
.cover table td, .cover table th {{ border: 1px solid #9ca3af; padding: 6px 10px; text-align: center; background: #fff !important; }}
.cover table th {{ background: #f5f3ff !important; color: #111; }}
.cover .guide {{ font-size: 14pt; font-weight: 700; margin-top: 6px; }}
.cover .yr {{ font-size: 12.5pt; margin-top: 14px; }}
.cover .foot {{ font-size: 12pt; font-weight: 700; margin-top: 26px; }}
.cert {{ font-family: "Source Serif 4"; text-align: center; padding-top: 12mm; }}
.cert h1 {{ font-family: "Source Serif 4"; font-size: 22pt; letter-spacing: 3px; color: #111; text-decoration: underline; margin: 26px 0 30px; }}
.cert p {{ text-align: justify; font-size: 13pt; line-height: 2; }}
.sign {{ display: flex; justify-content: space-between; margin-top: 46mm; font-size: 12pt; text-align: left; }}
.sign div:last-child {{ text-align: right; }}
.centerh {{ text-align: center; font-size: 18pt; border: none; letter-spacing: 1.5px; margin: 6mm 0 8mm; }}
.toc td {{ border: none; border-bottom: 1px dotted #c4b5fd; font-size: 11pt; padding: 5px 4px; background: #fff !important; font-family: "Source Serif 4"; }}
.toc td.n {{ width: 40px; font-weight: 600; }} .toc td.s {{ padding-left: 26px; color: #374151; }}
.grid2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }}
.grid2 figure {{ margin: 6px 0; }}
.grid2 figure.shot img {{ max-height: 70mm; }}
</style></head><body>

<!-- COVER -->
<section class="cover page">
  <div class="uni">Savitribai Phule Pune University</div>
  <div class="col">Modern Education Society’s Wadia College of Engineering, Pune</div>
  <div class="addr">19, Bund Garden, V.K. Joag Path, Pune – 411001.</div>
  <div class="acc">ACCREDITED BY NBA AND NAAC WITH ‘A++’ GRADE</div>
  <div class="dept">DEPARTMENT OF COMPUTER ENGINEERING</div>
  <div class="a">A</div>
  <div class="mpr">MINI PROJECT REPORT</div>
  <div class="a" style="margin-top:4px">ON</div>
  <div class="ttl">“{TITLE}”</div>
  <div class="sub">VoteChain – Decentralized E-Voting System</div>
  <div class="deg">B.E. (COMPUTER)</div>
  <div class="lbl">SUBMITTED BY</div>
  <table><thead><tr><th>Name of Student</th><th>PRN</th><th>Roll No.</th></tr></thead>
  <tbody><tr><td>Yashvant Dayanand Mane</td><td>F24121004</td><td>68</td></tr></tbody></table>
  <div class="lbl" style="margin-top:22px">GUIDED BY</div>
  <div class="guide">Dr. S. R. Khonde</div>
  <div class="yr">(Academic Year: 2026–2027)</div>
  <div class="foot">DEPARTMENT OF COMPUTER ENGINEERING<br>MODERN EDUCATION SOCIETY’S WADIA COLLEGE OF ENGINEERING, PUNE</div>
</section>

<!-- CERTIFICATE -->
<section class="cert page">
  <div class="col" style="font-size:14pt;font-weight:700">Modern Education Society’s Wadia College of Engineering, Pune</div>
  <div style="font-size:12pt;font-weight:700;margin-top:4px">Department of Computer Engineering</div>
  <h1>CERTIFICATE</h1>
  <p>This is to certify that the Mini Project report entitled <b>“{TITLE}” (VoteChain)</b> submitted by
  <b>Yashvant Dayanand Mane</b> (PRN <b>F24121004</b>, Roll No. <b>68</b>) is a bonafide work carried out by him
  and submitted during the 2026–27 academic year, in partial fulfillment of the requirements for the award of the degree of
  <b>BACHELOR OF ENGINEERING</b> in <b>COMPUTER ENGINEERING</b> of Savitribai Phule Pune University, at MESWCOE, Pune.</p>
  <div class="sign">
    <div>Dr. S. R. Khonde<br><b>Project Guide</b><br><br>Date :<br>Place : Pune</div>
    <div>Sign :<br><b>Head of the Department</b><br>Department of Computer Engineering</div>
  </div>
</section>

<!-- ACKNOWLEDGEMENT -->
<section class="page">
  <h2 class="centerh">ACKNOWLEDGEMENT</h2>
  <p>I would like to express my sincere gratitude to my respected guide, <b>Dr. S. R. Khonde</b>, for providing valuable guidance,
  constructive suggestions and continuous support throughout the development of my mini project on
  <b>“{TITLE}”</b>.</p>
  <p>I am also thankful to the Department of Computer Engineering, Modern Education Society’s Wadia College of Engineering, Pune,
  for providing the necessary facilities, resources and academic support required for successfully completing this project.
  I sincerely appreciate the guidance and assistance provided by the faculty members throughout the project.</p>
  <p>Finally, I thank my family and friends for their encouragement during this work.</p>
  <p style="text-align:right;margin-top:24mm"><b>Yashvant Dayanand Mane</b><br>PRN: F24121004 · Roll No. 68<br>B.E. Computer Engineering</p>
</section>

<!-- ABSTRACT -->
<section class="page">
  <h2 class="centerh">ABSTRACT</h2>
  <p>VoteChain is a decentralized electronic voting application in which the complete election is executed by an Ethereum smart
  contract. An administrator (the contract owner) creates an election, adds candidates, registers the wallet addresses of eligible
  voters and opens and closes voting. A registered voter connects MetaMask, verifies eligibility, reviews the candidates and casts
  exactly one vote. The vote is a signed blockchain transaction; the contract validates the election status, voter registration,
  double voting and the candidate id before updating the on-chain vote count and emitting a <code>VoteCast</code> event.</p>
  <p>Unlike conventional online voting systems, VoteChain has no central database. The blockchain is the single source of truth for
  registered voters, candidates, voting status, vote counts and election status, so the results shown on the dashboard can be
  verified independently by anyone. The system is built with Solidity 0.8.24 and OpenZeppelin <code>Ownable</code>, tested with
  Hardhat (24 automated test cases, all passing), and a React + Vite + TypeScript frontend using ethers.js v6, Tailwind CSS and
  Recharts. The application includes a voter dashboard, live results with charts, an admin dashboard and a built-in blockchain
  explorer that shows the transaction hash, block number, status, timestamp, sender and contract address of every action.</p>
  <p>The report also discusses the difference between transparency and voter privacy: wallet addresses and transactions on a
  public blockchain are visible, so votes are pseudonymous, not anonymous. VoteChain is an academic demonstration and is not
  intended for government elections, which additionally require verified identity, ballot secrecy, coercion resistance and legal infrastructure.</p>
  <p class="kw"><b>Keywords:</b> blockchain, e-voting, Ethereum, smart contract, Solidity, MetaMask, ethers.js, transparency, tamper resistance, React.</p>
</section>

<!-- TOC -->
<section class="page">
  <h2 class="centerh">TABLE OF CONTENTS</h2>
  <table class="toc"><tbody>
  {''.join(f'<tr><td class="{"n" if not s else "s"}">{n}</td><td class="{"s" if s else ""}">{t}</td></tr>' for n,t,s in [
   ("1","Introduction",0),("2","Problem Statement and Objectives",0),("","2.1 Objectives · 2.2 Scope · 2.3 Existing vs Proposed System",1),
   ("3","Why Blockchain?",0),("4","System Architecture and Design",0),("","4.1 Architecture · 4.2 DFD · 4.3 Use Case · 4.4 Interaction Flow · 4.5 Data Flow",1),
   ("5","Smart Contract Design (Voting.sol)",0),("","5.1 Data Model · 5.2 Functions · 5.3 Access Control · 5.4 Algorithm · 5.5 Life-cycle",1),
   ("6","Frontend Architecture",0),("7","Technology Stack and System Requirements",0),("8","Testing",0),("","8.1 Test Cases · 8.2 Gas Usage",1),
   ("9","Results and Output",0),("10","Security Considerations, Transparency and Privacy",0),("11","Limitations and Future Enhancements",0),
   ("12","Installation, Deployment and Demo Guide",0),("13","Conclusion",0),("14","References",0),("A","Appendix: Mini Project Presentation Points",0)])}
  </tbody></table>
</section>

<section>
<h2>1. Introduction</h2>
<p>Elections at every level, from a student council to a nation, depend on trust: voters must believe that only eligible people voted,
that each person voted once and that the published count matches the ballots cast. In most online voting systems the votes are rows in a
database controlled by the operator. Voters and candidates must simply trust that the operator, the server administrator or an attacker
did not alter those rows.</p>
<p>Blockchain technology offers a different model. A smart contract is a program deployed on a blockchain whose code and state are
replicated across many nodes and changed only by valid, signed transactions. Once a transaction is included in a block, changing it
would require rewriting the chain, which is computationally and economically infeasible on a public network. VoteChain uses this
property to run a complete election inside the <code>Voting</code> smart contract. The web application is only a window onto the
contract: it never stores votes and never computes results on its own.</p>
<p>The project is designed as a polished, demonstrable final-year mini project. It runs on a local Hardhat blockchain (chain id 31337) or on
the Sepolia public testnet, uses MetaMask for identity and transaction signing, and presents the election through a modern dark,
glassmorphism-style dashboard.</p>

<h2 style="margin-top:22px">2. Problem Statement and Objectives</h2>
<p><b>Problem statement:</b> Design and develop a secure, transparent and tamper-resistant electronic voting system using blockchain technology,
in which eligible users connect their crypto wallet, verify their eligibility, view candidates, cast exactly one vote and see
transparent election results, with all voting data stored and validated by a Solidity smart contract rather than a centralized database.</p>
<h3>2.1 Objectives</h3>
<ul>
<li>Implement a <code>Voting.sol</code> smart contract that manages elections, candidates, voter registration, voting and results.</li>
<li>Restrict administrative operations to the election owner using OpenZeppelin <code>Ownable</code>.</li>
<li>Guarantee one vote per registered wallet and reject invalid candidates and out-of-time votes on-chain.</li>
<li>Emit events (<code>VoterRegistered</code>, <code>CandidateAdded</code>, <code>ElectionStarted</code>, <code>VoteCast</code>, <code>ElectionEnded</code>) for public auditing.</li>
<li>Build a responsive React + TypeScript dApp with wallet connection, voter dashboard, results, admin and explorer pages.</li>
<li>Show the full transaction life-cycle: MetaMask confirmation, pending state, block confirmation, hash and explorer link.</li>
<li>Verify the contract with comprehensive automated tests and document the architecture, DFD, use cases and limitations.</li>
</ul>
<h3>2.2 Scope</h3>
<p>The system targets small, low-stakes elections such as a student council, club or classroom poll, demonstrated on a local or test
network. It covers the complete election life-cycle for one active election at a time, with the history of previous elections kept on-chain.
Real-world identity verification (KYC), ballot secrecy and legal compliance are outside the scope and are discussed in Chapter 10.</p>
<h3>2.3 Existing System vs Proposed System</h3>
{table(["Aspect","Existing / conventional e-voting","Proposed system – VoteChain"],[
 ["Vote storage","Rows in a central database controlled by the operator.","State variables of a smart contract replicated on every node."],
 ["Tamper resistance","An administrator or attacker with DB access can change counts.","Confirmed transactions cannot be altered; counts change only via <code>vote()</code>."],
 ["Double voting","Enforced by application code that users cannot inspect.","Enforced by the public contract (<code>AlreadyVoted</code>)."],
 ["Result verification","Voters must trust the published report.","Anyone can call <code>getCandidates()</code> or replay <code>VoteCast</code> events."],
 ["Admin control","Server roles and passwords.","<code>onlyOwner</code> checked by the contract itself."],
 ["Audit trail","Server logs that can be edited or deleted.","Immutable event log with tx hash, block and timestamp."],
 ["Single point of failure","Central server / database.","Decentralized network of nodes (on a public chain)."]])}
</section>

<section class="chapter">
<h2>3. Why Blockchain?</h2>
<ul>
<li><b>Immutability:</b> each block contains the hash of the previous block; changing an old vote would change every later hash and be rejected by the network.</li>
<li><b>Single source of truth:</b> every node computes the same contract state, so the results page, the admin page and an external auditor read identical numbers.</li>
<li><b>Programmable rules:</b> the voting rules (who, when, how many times, for whom) are code that executes the same way for everybody and cannot be skipped by the frontend.</li>
<li><b>Cryptographic identity:</b> a vote is valid only if it is signed by the private key of a registered address; nobody can vote on someone else’s behalf without that key.</li>
<li><b>Public auditability:</b> events and transactions are permanently available; anyone can recount the election from the event log.</li>
<li><b>No trusted operator:</b> once the contract is deployed, even the administrator cannot change a vote or a count; the admin can only perform the actions the contract allows.</li>
</ul>
<div class="note"><p><b>Important:</b> these benefits concern <i>integrity</i> and <i>transparency</i>. They do not by themselves provide ballot secrecy or real-world identity. See Chapter 10.</p></div>

<h2 style="margin-top:22px">4. System Architecture and Design</h2>
<h3>4.1 System Architecture</h3>
<p>The architecture follows the flow <b>Frontend → MetaMask → ethers.js → Ethereum-compatible blockchain → Voting smart contract</b>.
Write operations (vote, admin actions) are signed in MetaMask; read operations use a read-only JSON-RPC provider so that results are
visible even without a wallet. Contract address, ABI, chain id and explorer URL are loaded from environment variables through
a single configuration file, <code>contracts/config.ts</code>.</p>
{fig(arch, 1, "System architecture of VoteChain")}
</section>

<section class="chapter">
<h3>4.2 Data Flow Diagrams</h3>
<p>The Level 0 DFD shows VoteChain as a single process with three external entities. The Level 1 DFD decomposes it into six processes.
All four data stores (D1–D4) are on-chain; there is no off-chain database.</p>
{fig(dfd0, 2, "DFD Level 0 (context diagram)")}
{fig(dfd1, 3, "DFD Level 1")}
</section>

<section class="chapter">
<h3>4.3 Use Case Diagram</h3>
{fig(usecase, 4, "Use case diagram: Admin, Voter and Public observer")}
</section>

<section class="chapter">
<h3>4.4 Smart Contract Interaction Flow (Casting a Vote)</h3>
<p>Before MetaMask is opened, ethers.js estimates gas, which runs the contract checks in a dry run. An invalid vote (for example a
second vote) is therefore reported to the user with a friendly message before any fee is paid.</p>
{fig(seqd, 5, "Sequence diagram of the vote transaction")}
<h3>4.5 Blockchain Data Flow Explanation</h3>
<p>VoteChain replaces the traditional database with contract storage. Writes travel as transactions: the frontend builds the call with the ABI,
MetaMask signs it, a node executes <code>Voting.sol</code> and the resulting state change is stored once the transaction is mined. Reads are free
<code>eth_call</code> requests to view functions (<code>getElectionInfo</code>, <code>getCandidates</code>, <code>getVoterStatus</code>, <code>getWinners</code>).
The frontend polls these every five seconds, so all dashboards stay in sync. Events are read with <code>eth_getLogs</code> from the deployment block
and are used by the admin activity feed and the built-in explorer.</p>
{table(["Data","On-chain location","Written by","Read by"],[
 ["Election (title, start, end, started, ended)","<code>_elections[id]</code>","createElection / startElection / endElection","getElection(), getElectionInfo()"],
 ["Candidates and vote counts","<code>_candidates[id][]</code>","addCandidate, vote","getCandidates(), getCandidate()"],
 ["Voter registration and voted flag","<code>_voters[id][address]</code>","registerVoter(s), vote","getVoterStatus()"],
 ["Totals","<code>registeredVoterCount</code>, <code>totalVotes</code>","registerVoter(s), vote","getElectionInfo()"],
 ["Audit trail","Event log","every state-changing function","Explorer page, admin feed"]])}
</section>

<section class="chapter">
<h2>5. Smart Contract Design (Voting.sol)</h2>
<h3>5.1 Data Model</h3>
{table(["Structure","Fields","Purpose"],[
 ["Candidate","uint256 id, string name, string party, string manifesto, uint256 voteCount","A candidate and their live on-chain vote count."],
 ["Voter","bool registered, bool hasVoted","Eligibility and one-vote enforcement per address."],
 ["Election","string title, uint256 startTime, uint256 endTime, bool started, bool ended","Status and timing of an election."],
 ["ElectionInfo","id, title, times, flags, votingOpen, candidateCount, registeredVoters, totalVotes","Summary returned to the dashboard in one call."]])}
<p>All mappings are keyed by an <b>election id</b>, so a new election starts with clean candidate and voter lists while previous results remain verifiable.</p>
<h3>5.2 Functions</h3>
{table(["Function","Access","Description"],[
 ["createElection(title)","onlyOwner","Creates a new election (only if none exists or the last one ended)."],
 ["addCandidate(name, party, manifesto)","onlyOwner, beforeStart","Adds a candidate with the next id (ids start at 1)."],
 ["registerVoter(address) / registerVoters(address[])","onlyOwner","Authorizes one or many wallets; rejects zero and duplicate addresses."],
 ["startElection(durationSeconds)","onlyOwner, beforeStart","Opens voting; optional automatic deadline (0 = manual end)."],
 ["endElection()","onlyOwner","Closes voting permanently and freezes results."],
 ["vote(candidateId)","registered voter, onlyWhileOpen","Casts exactly one vote and emits VoteCast."],
 ["getElectionInfo(), isVotingOpen()","public view","Status of the current election."],
 ["getCandidates(), getCandidate(id), getCandidatesOf(electionId)","public view","Candidates with vote counts (current or historic)."],
 ["getVoterStatus(address)","public view","Registered / has-voted flags."],
 ["getWinners()","public view","Winning candidate id(s) and highest count; several ids mean a tie."]])}
<h3>5.3 Access Control, Modifiers, Events and Errors</h3>
<p>Administrative functions use OpenZeppelin’s <code>onlyOwner</code>; the owner is the deploying account. Two custom modifiers enforce the
election phase. Custom errors are used instead of revert strings to save gas; the frontend decodes them into readable messages.</p>
<pre>{MODIFIER_SNIPPET}</pre>
{table(["Events","Custom errors (revert reasons)"],[
 ["ElectionCreated, CandidateAdded, VoterRegistered, ElectionStarted, VoteCast, ElectionEnded",
  "NoElection, PreviousElectionNotEnded, ElectionAlreadyStarted, ElectionNotStarted, ElectionAlreadyEnded, ElectionNotActive, EmptyField, NoCandidates, InvalidCandidate, InvalidAddress, AlreadyRegistered, NotRegistered, AlreadyVoted, OwnableUnauthorizedAccount"]])}
<h3>5.4 Vote Algorithm</h3>
<p><b>Input:</b> <code>candidateId</code>, sender address. <b>Steps:</b> 1) Check an election exists and has started. 2) Check it has not ended and the
deadline (if any) has not passed. 3) Check the sender is registered. 4) Check the sender has not voted. 5) Check 1 ≤ id ≤ number of candidates.
6) Set <code>hasVoted = true</code>. 7) Increment the candidate’s <code>voteCount</code> and <code>totalVotes</code>. 8) Emit <code>VoteCast</code>.
The function follows the checks-effects pattern and makes no external calls, so there is no re-entrancy surface.</p>
<pre>{CONTRACT_SNIPPET}</pre>
</section>

<section class="chapter">
{fig(flow, 6, "Vote validation flowchart inside Voting.sol")}
<h3>5.5 Election Life-cycle</h3>
{fig(state, 7, "Election state diagram")}
</section>

<section class="chapter">
<h2>6. Frontend Architecture</h2>
<p>The frontend is a single-page React 18 application written in TypeScript and bundled with Vite. It is organised in layers so that
only one module talks to the blockchain.</p>
{table(["Folder / module","Responsibility"],[
 ["contracts/config.ts, VotingABI.json","Contract address, ABI, chain id, chain name, RPC and explorer URL from <code>.env</code> (written by the deploy script)."],
 ["services/votingService.ts","All ethers.js calls: read provider, contract instances, election/candidate/voter reads, event queries, transaction details."],
 ["hooks/useWallet.tsx","MetaMask connection, auto-reconnect, accountsChanged / chainChanged, network switch / add, signer."],
 ["hooks/useElection.tsx","Election, candidates, voter status, owner, winners; polls the contract every 5 s."],
 ["hooks/useTransactions.tsx","Runs a transaction: awaiting signature → pending → confirmed/failed; toasts; refresh."],
 ["utils/errors.ts","Maps custom errors and wallet errors (rejected, insufficient gas, wrong network, unavailable contract) to friendly text."],
 ["components/","Navbar, Footer, animated network background, glass cards, candidate card, confirm modal, transaction modal, skeletons."],
 ["pages/","Home, Connect Wallet, Vote (voter dashboard), Results, How It Works, Admin, Explorer, Not Found."]])}
{table(["Page","Main features"],[
 ["Home","Hero “Decentralized Voting. Transparent Results.”, live election status card, how-it-works, security features, privacy note."],
 ["Connect Wallet","Address, connected vs required network, eligibility, role; handles missing MetaMask, rejection and wrong network."],
 ["Vote","Wallet, eligibility, election and voting status; candidate cards; confirmation modal; “You have already voted ✓”."],
 ["Results","Registered voters, votes cast, turnout, bar chart, donut chart, ranking with progress bars, winner after the election ends."],
 ["Admin","Owner-only: create/start/end election, add candidates, batch register voters, statistics, vote counts, event history."],
 ["Explorer","Every contract event with tx hash, block, status, timestamp, from and contract address; search; transaction details."]])}
<p>Admin routes are hidden for non-owners in the UI, but the real protection is on-chain: even a forged request from another address is
rejected with <code>OwnableUnauthorizedAccount</code>.</p>

<h2 style="margin-top:22px">7. Technology Stack and System Requirements</h2>
{table(["Layer","Technology"],[
 ["Smart contract","Solidity 0.8.24, OpenZeppelin Contracts 5 (Ownable)"],
 ["Development / test","Hardhat 2, hardhat-toolbox, Mocha + Chai, TypeScript, ethers.js v6"],
 ["Network","Hardhat Local (chain id 31337) or Sepolia testnet (11155111)"],
 ["Frontend","React 18, Vite 6, TypeScript 5, React Router 6"],
 ["UI","Tailwind CSS 4, Lucide React icons, Recharts, react-hot-toast"],
 ["Wallet / Web3","MetaMask (EIP-1193), ethers.js v6 BrowserProvider and JsonRpcProvider"],
 ["Backend / database","None. All voting data lives on the blockchain."]])}
{table(["Type","Item","Specification"],[
 ["Hardware","Processor / RAM","Intel Core i3 / Ryzen 3 or better; 4 GB RAM minimum, 8 GB recommended"],
 ["Software","OS","Windows 10/11, Ubuntu 22.04+ or macOS"],
 ["Software","Runtime","Node.js 18+ (tested on 22) and npm"],
 ["Software","Browser","Chrome / Brave / Firefox with the MetaMask extension"]])}
</section>

<section class="chapter">
<h2>8. Testing</h2>
<h3>8.1 Smart Contract Test Cases</h3>
<p>The contract was tested with Hardhat using fixtures and time manipulation (<code>npx hardhat test</code>). <b>Result: 24 passing, 0 failing.</b></p>
{table(["ID","Feature","Expected behaviour","Result"], tests)}
<h3>8.2 End-to-end Test and Gas Usage</h3>
<p>An end-to-end run was performed on the local Hardhat network through the real user interface: the admin started the election,
five registered voters voted (3 for Priya Patil, 1 for Aarav Sharma, 1 for Rahul Deshmukh), an unregistered wallet was blocked,
the admin ended the election and the results page declared the winner. The gas used by each transaction was read from the receipts:</p>
{table(["Transaction","Gas used"], gas)}
</section>

<section class="chapter">
<h2>9. Results and Output</h2>
<p>Observed results of the local deployment:</p>
<ul>
<li>Network: Hardhat Local, chain id 31337. Contract address: <code>0x5FbDB2315678afecb367f032d93F642f64180aa3</code> (deployed in block #1).</li>
<li>Election “Student Council Election 2026” with candidates Aarav Sharma (Student First), Priya Patil (Future Forward) and Rahul Deshmukh (Progress Alliance).</li>
<li>5 registered voters, 5 votes cast, 100% turnout. Final result: Priya Patil 3 votes (60%), Aarav Sharma 1 (20%), Rahul Deshmukh 1 (20%). Winner: Priya Patil.</li>
<li>Duplicate vote, unregistered wallet and non-owner admin access were all rejected.</li>
</ul>
{shot("01-home.jpg", 8, "Landing page with live election status card")}
{shot("04-wallet.jpg", 9, "Connect Wallet page: address, network, eligibility and role", "small")}
</section>
<section class="chapter">
{shot("02-admin-setup.jpg", 10, "Admin dashboard before the election starts (candidates and voters registered on-chain)", "tall")}
</section>
<section class="chapter">
{shot("03-admin-start-tx.jpg", 11, "Admin starts the election: confirmed transaction with hash, block, status, timestamp, sender and contract", "small")}
{shot("05-vote-dashboard.jpg", 12, "Voter dashboard with candidate cards (photo/avatar, name, party, manifesto, id, vote button)")}
</section>
<section class="chapter">
{shot("06-confirm-modal.jpg", 13, "Vote confirmation modal", "small")}
{shot("07-tx-awaiting.jpg", 14, "Waiting for confirmation in MetaMask", "small")}
</section>
<section class="chapter">
{shot("08-tx-success.jpg", 15, "“Vote successfully recorded on blockchain ✓” with transaction hash and explorer link", "small")}
{shot("09-already-voted.jpg", 16, "After voting: “You have already voted ✓”", "small")}
</section>
<section class="chapter">
{shot("10-results-live.jpg", 17, "Live results while voting is open (bar chart, donut chart, ranking)", "tall")}
</section>
<section class="chapter">
{shot("11-not-registered.jpg", 18, "Unregistered wallet: voting disabled with “Not registered”", "small")}
{shot("12-admin-unauthorized.jpg", 19, "Non-owner wallet blocked from the admin dashboard", "small")}
</section>
<section class="chapter">
{shot("13-explorer.jpg", 20, "Built-in blockchain explorer listing every contract event", "tall")}
</section>
<section class="chapter">
{shot("14-explorer-tx.jpg", 21, "Transaction details: method, gas used and decoded events")}
{shot("15-admin-ended.jpg", 22, "Admin dashboard after ending the election, with transaction history", "small")}
</section>
<section class="chapter">
{shot("16-results-final.jpg", 23, "Final results with the winner declared after the election ended", "tall")}
</section>
<section class="chapter">
<div class="grid2">
{shot("18-mobile-results.jpg", 24, "Responsive mobile layout")}
{shot("17-how-it-works.jpg", 25, "How It Works page: architecture and privacy explanation")}
</div>

<h2 style="margin-top:18px">10. Security Considerations, Transparency and Privacy</h2>
<h3>10.1 Security Measures</h3>
<ul>
<li><b>Access control:</b> OpenZeppelin <code>Ownable</code>; every admin function is <code>onlyOwner</code>.</li>
<li><b>Phase control:</b> <code>beforeStart</code> and <code>onlyWhileOpen</code> modifiers, plus an optional time-based deadline using <code>block.timestamp</code>.</li>
<li><b>Input validation:</b> empty fields, zero address, duplicate registration and out-of-range candidate ids revert.</li>
<li><b>One vote per wallet:</b> <code>hasVoted</code> is set before the count is updated; a second call reverts with <code>AlreadyVoted</code>.</li>
<li><b>No ether handling and no external calls</b> in <code>vote()</code>, removing re-entrancy and fund-loss risks.</li>
<li><b>Gas efficiency:</b> custom errors, <code>calldata</code> parameters, batch voter registration, optimizer enabled (200 runs).</li>
<li><b>Frontend:</b> no private keys handled; configuration via environment variables; the wrong network is detected before signing.</li>
</ul>
<h3>10.2 Transparency versus Voter Privacy</h3>
<div class="note">
<p><b>Transparency</b> means the process can be audited: anyone can see the candidates, the number of registered voters, the vote counts and that no address voted twice. VoteChain provides this.</p>
<p><b>Privacy (ballot secrecy)</b> means nobody can link a voter to their choice. VoteChain does <b>not</b> provide this. The <code>vote(candidateId)</code> transaction and the <code>VoteCast</code> event reveal which wallet voted for which candidate. Wallets are pseudonymous, but anyone who knows who owns an address can see their vote. Blockchain voting is therefore <b>not</b> completely anonymous.</p>
<p>This is an academic demonstration. It is <b>not suitable for real government elections</b> without verified identity, privacy-preserving cryptography, coercion resistance, independent audits and a legal framework.</p>
</div>
</section>

<section class="chapter">
<h2>11. Limitations and Future Enhancements</h2>
<h3>11.1 Limitations</h3>
<ul>
<li>Votes are linkable to wallet addresses (no ballot secrecy) and a voter could prove their vote to a third party (no coercion resistance).</li>
<li>One wallet represents one voter; the admin must verify off-chain that each address belongs to a distinct eligible person.</li>
<li>A single owner key controls the election life-cycle; losing or leaking it is a risk.</li>
<li>Every vote costs gas; on a public mainnet this would be a cost barrier for voters.</li>
<li>Candidate text is stored on-chain, which is expensive for long manifestos or images.</li>
<li>The frontend polls the node; very large elections would need an indexer (e.g. The Graph).</li>
</ul>
<h3>11.2 Future Enhancements</h3>
<ul>
<li>Privacy-preserving voting with zero-knowledge proofs (Semaphore, MACI) or a commit-reveal scheme.</li>
<li>Identity integration (college ID / DigiLocker based verification, soulbound voter tokens).</li>
<li>Multi-signature or DAO-based administration (Gnosis Safe, AccessControl roles).</li>
<li>Gasless voting with meta-transactions (EIP-2771) or account abstraction (ERC-4337) so voters need no ETH.</li>
<li>IPFS storage for candidate photos and manifestos; multiple concurrent elections; ranked-choice voting.</li>
<li>Deployment to a Layer-2 network (Polygon, Arbitrum, Optimism) for lower fees, with contract verification on the block explorer.</li>
</ul>

<h2 style="margin-top:22px">12. Installation, Deployment and Demo Guide</h2>
<pre># 1. Blockchain: install, test, run node, deploy and seed demo data
cd votechain/blockchain
npm install
npx hardhat test                      # 24 passing
npx hardhat node                      # terminal 1: local chain on http://127.0.0.1:8545
npm run deploy:local                  # terminal 2: writes frontend/.env.local + ABI
npm run seed:local                    # demo election, 3 candidates, 5 voters

# 2. Frontend
cd ../frontend
npm install
npm run dev                           # http://localhost:5173</pre>
<p><b>MetaMask setup:</b> add a network with RPC <code>http://127.0.0.1:8545</code>, chain id <code>31337</code>, symbol ETH. Import Hardhat account #0
(the admin/owner) and accounts #1–#5 (registered voters) using the private keys printed by <code>npx hardhat node</code>. These are public test
keys and must never be used on a real network. Account #6 or later can be used to demonstrate an unregistered voter.</p>
<p><b>Demo flow:</b> Admin opens the Admin page and clicks Start → voters #1–#5 connect and vote → Results update live → Admin ends the election
→ the winner is shown. For Sepolia, set <code>SEPOLIA_RPC_URL</code> and <code>PRIVATE_KEY</code> in <code>blockchain/.env</code> and run <code>npm run deploy:sepolia</code>;
explorer links then open Sepolia Etherscan.</p>
</section>

<section class="chapter">
<h2>13. Conclusion</h2>
<p>VoteChain demonstrates how a smart contract can act as a trustworthy, shared election authority. The <code>Voting</code> contract stores voters,
candidates, status and vote counts on-chain, enforces one vote per registered wallet, restricts administration to the owner and publishes
an event for every action. The React dApp provides a complete user experience, from MetaMask connection and eligibility checks to vote
confirmation, transaction tracking, live charts and a built-in explorer, while reading every number directly from the blockchain.</p>
<p>The contract was verified with 24 automated test cases and an end-to-end election on a local Hardhat network. The project also makes
its limits explicit: blockchain voting provides integrity and transparency but not, by itself, privacy or real-world identity. With
zero-knowledge privacy, identity integration and multi-signature administration, the same architecture could serve as the basis for
trustworthy institutional elections.</p>
<p><b>Project outcome:</b> a working decentralized e-voting application with on-chain voter registration, candidate management, one-vote enforcement,
publicly verifiable results and complete transaction traceability.</p>

<h2 style="margin-top:22px">14. References</h2>
<ol>
<li>S. Nakamoto, “Bitcoin: A Peer-to-Peer Electronic Cash System,” 2008.</li>
<li>G. Wood, “Ethereum: A Secure Decentralised Generalised Transaction Ledger (Yellow Paper).”</li>
<li>Solidity Documentation, v0.8.24 – https://docs.soliditylang.org</li>
<li>OpenZeppelin Contracts 5.x Documentation – Access Control / Ownable – https://docs.openzeppelin.com/contracts</li>
<li>Hardhat Documentation – https://hardhat.org/docs</li>
<li>ethers.js v6 Documentation – https://docs.ethers.org/v6</li>
<li>EIP-1193: Ethereum Provider JavaScript API – https://eips.ethereum.org/EIPS/eip-1193</li>
<li>MetaMask Developer Documentation – https://docs.metamask.io</li>
<li>React, Vite, Tailwind CSS and Recharts official documentation.</li>
<li>F. Þ. Hjálmarsson et al., “Blockchain-Based E-Voting System,” IEEE CLOUD, 2018.</li>
<li>Privacy &amp; Scaling Explorations, “MACI: Minimal Anti-Collusion Infrastructure.”</li>
</ol>

<h2 style="margin-top:22px">Appendix A: Mini Project Presentation Points</h2>
<ol>
<li><b>Title:</b> VoteChain – Decentralized E-Voting System · Yashvant Dayanand Mane (F24121004, Roll 68) · Guide: Dr. S. R. Khonde.</li>
<li><b>Problem:</b> centralized e-voting requires trusting whoever controls the database.</li>
<li><b>Idea:</b> move the election rules and the ballot box into an Ethereum smart contract.</li>
<li><b>Architecture:</b> React → MetaMask → ethers.js → Ethereum → Voting.sol (Figure 1).</li>
<li><b>Contract:</b> Candidate / Voter / Election structs, onlyOwner, phase modifiers, 6 events, custom errors.</li>
<li><b>Rules enforced on-chain:</b> registered only, one vote, valid candidate, only while open.</li>
<li><b>Live demo:</b> admin starts election → voter connects, confirms vote in MetaMask → tx hash and block → results update → duplicate vote rejected → admin ends → winner.</li>
<li><b>Explorer:</b> every action has a transaction hash, block, timestamp and sender.</li>
<li><b>Testing:</b> 24 Hardhat tests passing; gas per vote about 48k–83k.</li>
<li><b>Honest limits:</b> transparency is not privacy; academic system, not for government elections.</li>
<li><b>Future:</b> ZK privacy, identity, multisig admin, gasless voting, Layer-2.</li>
</ol>
</section>
</body></html>'''

with open(os.path.join(HERE, "report.html"), "w") as f:
    f.write(doc)
print("ok")
