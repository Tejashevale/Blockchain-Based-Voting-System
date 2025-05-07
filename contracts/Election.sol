// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Election {
    struct Candidate {
        uint256 id;
        string name;
        string description;
        uint256 voteCount;
    }

    struct Voter {
        string name;
        string voterId;
        bool isRegistered;
        address voterAddress;
    }

    struct ElectionData {
        uint256 id;
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint256 candidateCount;
    }

    mapping(uint256 => ElectionData) public elections;
    mapping(uint256 => mapping(uint256 => Candidate)) public candidates;
    mapping(address => Voter) public voters;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    uint256 public electionCount;
    address public admin;
    address[] public voterList; // New array to track voter addresses

    event ElectionCreated(uint256 electionId, string name, uint256 startTime, uint256 endTime);
    event CandidateAdded(uint256 electionId, uint256 candidateId, string name);
    event VoterRegistered(address voterAddress, string voterId);
    event VoteCast(uint256 electionId, uint256 candidateId, address voter);
    event VoterRemoved(string voterId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier electionExists(uint256 _electionId) {
        require(_electionId > 0 && _electionId <= electionCount, "Election does not exist");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function createElection(
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) public onlyAdmin {
        require(_startTime < _endTime, "Invalid election time");
        require(_startTime > block.timestamp, "Election must start in the future");

        electionCount++;
        elections[electionCount] = ElectionData({
            id: electionCount,
            name: _name,
            description: _description,
            startTime: _startTime,
            endTime: _endTime,
            isActive: true,
            candidateCount: 0
        });

        emit ElectionCreated(electionCount, _name, _startTime, _endTime);
    }

    function addCandidate(
        uint256 _electionId,
        string memory _name,
        string memory _description
    ) public onlyAdmin {
        require(_electionId <= electionCount, "Election does not exist");
        require(elections[_electionId].isActive, "Election is not active");

        uint256 candidateId = elections[_electionId].candidateCount + 1;
        candidates[_electionId][candidateId] = Candidate({
            id: candidateId,
            name: _name,
            description: _description,
            voteCount: 0
        });

        elections[_electionId].candidateCount = candidateId;
        emit CandidateAdded(_electionId, candidateId, _name);
    }

    function registerVoter(
        string memory _name,
        string memory _voterId,
        address _voterAddress
    ) public onlyAdmin {
        require(!voters[_voterAddress].isRegistered, "Voter already registered");
        require(_voterAddress != address(0), "Invalid voter address");
        
        voters[_voterAddress] = Voter({
            name: _name,
            voterId: _voterId,
            isRegistered: true,
            voterAddress: _voterAddress
        });

        voterList.push(_voterAddress); // Add to voter list
        emit VoterRegistered(_voterAddress, _voterId);
    }

    function vote(uint256 _electionId, uint256 _candidateId) public {
        require(_electionId <= electionCount, "Election does not exist");
        require(elections[_electionId].isActive, "Election is not active");
        require(block.timestamp >= elections[_electionId].startTime, "Election has not started");
        require(block.timestamp <= elections[_electionId].endTime, "Election has ended");
        require(voters[msg.sender].isRegistered, "Voter is not registered");
        require(!hasVoted[_electionId][msg.sender], "Already voted in this election");
        require(_candidateId <= elections[_electionId].candidateCount, "Invalid candidate");

        candidates[_electionId][_candidateId].voteCount++;
        hasVoted[_electionId][msg.sender] = true;

        emit VoteCast(_electionId, _candidateId, msg.sender);
    }

    function modifyElection(
        uint256 _electionId,
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) public onlyAdmin electionExists(_electionId) {
        ElectionData storage election = elections[_electionId];
        require(block.timestamp < election.startTime, "Cannot modify ongoing or completed election");
        
        election.name = _name;
        election.description = _description;
        election.startTime = _startTime;
        election.endTime = _endTime;
    }

    function deleteElection(uint256 _electionId) 
        public 
        onlyAdmin 
        electionExists(_electionId) 
    {
        ElectionData storage election = elections[_electionId];
        require(block.timestamp < election.startTime, "Cannot delete ongoing or completed election");
        
        election.isActive = false;
    }

    function deleteCandidate(uint256 _electionId, uint256 _candidateId) public onlyAdmin {
        require(_electionId <= electionCount, "Election does not exist");
        require(_candidateId <= elections[_electionId].candidateCount, "Candidate does not exist");
        require(elections[_electionId].isActive, "Election is not active");
        
        // Set the candidate's name to empty to mark as deleted
        candidates[_electionId][_candidateId].name = "";
        candidates[_electionId][_candidateId].description = "";
        candidates[_electionId][_candidateId].voteCount = 0;
    }

    function deleteVoter(address _voterAddress) public onlyAdmin {
        require(voters[_voterAddress].isRegistered, "Voter is not registered");
        
        // Remove from voterList
        for (uint i = 0; i < voterList.length; i++) {
            if (voterList[i] == _voterAddress) {
                voterList[i] = voterList[voterList.length - 1];
                voterList.pop();
                break;
            }
        }
        
        emit VoterRemoved(voters[_voterAddress].voterId);
        delete voters[_voterAddress];
    }

    // Function to get all registered voters
    function getAllVoters() public view returns (
        address[] memory voterAddresses,
        string[] memory names,
        string[] memory voterIds,
        bool[] memory isRegistered
    ) {
        uint256 totalVoters = voterList.length;
        
        voterAddresses = new address[](totalVoters);
        names = new string[](totalVoters);
        voterIds = new string[](totalVoters);
        isRegistered = new bool[](totalVoters);

        for (uint256 i = 0; i < totalVoters; i++) {
            address voterAddr = voterList[i];
            Voter memory voter = voters[voterAddr];
            
            voterAddresses[i] = voterAddr;
            names[i] = voter.name;
            voterIds[i] = voter.voterId;
            isRegistered[i] = voter.isRegistered;
        }

        return (voterAddresses, names, voterIds, isRegistered);
    }

    // View functions
    function getElection(uint256 _electionId) public view returns (
        uint256 id,
        string memory name,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        bool isActive,
        uint256 candidateCount
    ) {
        require(_electionId <= electionCount, "Election does not exist");
        ElectionData memory election = elections[_electionId];
        return (
            election.id,
            election.name,
            election.description,
            election.startTime,
            election.endTime,
            election.isActive,
            election.candidateCount
        );
    }

    function getCandidate(uint256 _electionId, uint256 _candidateId) public view returns (
        uint256 id,
        string memory name,
        string memory description,
        uint256 voteCount
    ) {
        require(_electionId <= electionCount, "Election does not exist");
        require(_candidateId <= elections[_electionId].candidateCount, "Invalid candidate");
        Candidate memory candidate = candidates[_electionId][_candidateId];
        return (
            candidate.id,
            candidate.name,
            candidate.description,
            candidate.voteCount
        );
    }

    function getVoter(address _voterAddress) public view returns (
        string memory name,
        string memory voterId,
        bool isRegistered
    ) {
        Voter memory voter = voters[_voterAddress];
        return (
            voter.name,
            voter.voterId,
            voter.isRegistered
        );
    }

    function checkVoterVoteStatus(uint256 _electionId, address _voterAddress) public view returns (bool) {
        require(_electionId <= electionCount, "Election does not exist");
        return hasVoted[_electionId][_voterAddress];
    }

    // Function to get all candidates across all elections
    function getAllCandidates() public view returns (
        uint256[] memory electionIds,
        uint256[] memory candidateIds,
        string[] memory names,
        string[] memory descriptions,
        uint256[] memory voteCounts,
        bool[] memory activeStates
    ) {
        // Calculate total number of candidates
        uint256 totalCandidates = 0;
        for (uint256 i = 1; i <= electionCount; i++) {
            totalCandidates += elections[i].candidateCount;
        }

        // Initialize arrays with the total size
        electionIds = new uint256[](totalCandidates);
        candidateIds = new uint256[](totalCandidates);
        names = new string[](totalCandidates);
        descriptions = new string[](totalCandidates);
        voteCounts = new uint256[](totalCandidates);
        activeStates = new bool[](totalCandidates);

        // Fill arrays with candidate data
        uint256 currentIndex = 0;
        for (uint256 electionId = 1; electionId <= electionCount; electionId++) {
            ElectionData memory election = elections[electionId];
            for (uint256 candidateId = 1; candidateId <= election.candidateCount; candidateId++) {
                Candidate memory candidate = candidates[electionId][candidateId];
                electionIds[currentIndex] = electionId;
                candidateIds[currentIndex] = candidateId;
                names[currentIndex] = candidate.name;
                descriptions[currentIndex] = candidate.description;
                voteCounts[currentIndex] = candidate.voteCount;
                activeStates[currentIndex] = election.isActive;
                currentIndex++;
            }
        }
        return (electionIds, candidateIds, names, descriptions, voteCounts, activeStates);
    }

    // Function to get total candidate count across all elections
    function getTotalCandidateCount() public view returns (uint256) {
        uint256 totalCandidates = 0;
        for (uint256 i = 1; i <= electionCount; i++) {
            totalCandidates += elections[i].candidateCount;
        }
        return totalCandidates;
    }

    // Function to get total active elections count
    function getActiveElectionsCount() public view returns (uint256) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= electionCount; i++) {
            if (elections[i].isActive) {
                activeCount++;
            }
        }
        return activeCount;
    }
}
