// Global variables
let web3;
let contract;
let account;

// Initialize Web3 and contract
async function init() {
    try {
        // Check if MetaMask is installed
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
        }

        // Initialize Web3
        web3 = new Web3(window.ethereum);
        console.log('Web3 initialized');

        // Get network ID
        const networkId = await web3.eth.net.getId();
        console.log('Network ID:', networkId);

        // Load contract ABI
        try {
            const response = await fetch('./build/contracts/Election.json');
            if (!response.ok) {
                throw new Error('Failed to load contract ABI');
            }
            const data = await response.json();
            const contractABI = data.abi;
            console.log('Contract ABI loaded:', contractABI);

            // Initialize contract
            contract = new web3.eth.Contract(
                contractABI,
                config.contractAddress
            );
            console.log('Contract initialized at:', config.contractAddress);

            // Verify contract
            const code = await web3.eth.getCode(config.contractAddress);
            console.log('Contract code:', code);
            
            if (code === '0x' || code === '0x0') {
                throw new Error('No contract found at the specified address');
            }

            // Test contract connection
            const admin = await contract.methods.admin().call();
            console.log('Contract admin:', admin);

            return true;
        } catch (error) {
            console.error('Error loading contract:', error);
            throw new Error('Failed to load contract. Please make sure the contract is deployed: ' + error.message);
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showError(error.message);
        return false;
    }
}

// Load elections into the select dropdown
async function loadElections() {
    try {
        const electionSelect = document.getElementById('electionSelect');
        electionSelect.innerHTML = '<option value="">Loading elections...</option>';

        // Get total number of elections
        const electionCount = await contract.methods.electionCount().call();
        console.log('Total elections:', electionCount);

        if (electionCount === 0) {
            electionSelect.innerHTML = '<option value="">No elections found</option>';
            return;
        }

        // Populate select with elections
        electionSelect.innerHTML = '<option value="">Select an election</option>';
        for (let i = 1; i <= electionCount; i++) {
            try {
                const election = await contract.methods.getElection(i).call();
                if (election.isActive) {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = election.name;
                    electionSelect.appendChild(option);
                }
            } catch (error) {
                console.error(`Error loading election ${i}:`, error);
            }
        }

        // Add change event listener
        electionSelect.addEventListener('change', async (e) => {
            const electionIndex = e.target.value;
            if (electionIndex) {
                await loadElectionResults(electionIndex);
            } else {
                clearResults();
            }
        });
    } catch (error) {
        console.error('Error loading elections:', error);
        showError('Failed to load elections: ' + error.message);
    }
}

// Load results for a specific election
async function loadElectionResults(electionIndex) {
    try {
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = '<div class="text-center"><div class="spinner-border"></div></div>';

        // Get election details
        const election = await contract.methods.getElection(electionIndex).call();
        console.log('Election details:', election);

        // Get candidates and their vote counts
        const candidateCount = election.candidateCount;
        let candidates = [];
        let totalVotes = 0;

        for (let i = 1; i <= candidateCount; i++) {
            try {
                const candidate = await contract.methods.getCandidate(electionIndex, i).call();
                if (candidate.name !== '') { // Skip deleted candidates
                    totalVotes += parseInt(candidate.voteCount);
                    candidates.push(candidate);
                }
            } catch (error) {
                console.error(`Error loading candidate ${i}:`, error);
            }
        }

        // Update total votes display
        document.getElementById('totalVotesCount').textContent = totalVotes;

        // Sort candidates by vote count
        candidates.sort((a, b) => parseInt(b.voteCount) - parseInt(a.voteCount));

        // Display results
        let resultsHTML = '';
        candidates.forEach(candidate => {
            const voteCount = parseInt(candidate.voteCount);
            const percentage = totalVotes > 0 ? (voteCount / totalVotes * 100).toFixed(1) : 0;
            
            resultsHTML += `
                <div class="result-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="candidate-name">${candidate.name}</span>
                        <span class="vote-count">${voteCount} votes</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar bg-success" role="progressbar" 
                             style="width: ${percentage}%" 
                             aria-valuenow="${percentage}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                        </div>
                    </div>
                    <small class="text-muted">${percentage}% of total votes</small>
                </div>
            `;
        });

        resultsContainer.innerHTML = resultsHTML;
    } catch (error) {
        console.error('Error loading election results:', error);
        showError('Failed to load election results: ' + error.message);
    }
}

// Clear results display
function clearResults() {
    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.innerHTML = `
        <div class="text-center text-muted">
            <i class="fas fa-chart-bar fa-3x mb-3"></i>
            <p>Select an election to view results</p>
        </div>
    `;
    document.getElementById('totalVotesCount').textContent = '0';
}

// Show error message
function showError(message) {
    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-circle me-2"></i>
            ${message}
        </div>
    `;
}

// Logout function
function logout() {
    localStorage.removeItem('adminInfo');
    localStorage.removeItem('votingContractAddress');
    window.location.href = 'admin_login.html';
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    // Check if admin is logged in
    const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
    if (!adminInfo) {
        window.location.href = 'admin_login.html';
        return;
    }

    // Add logout handler
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Initialize Web3 and contract
    const initialized = await init();
    if (!initialized) {
        return;
    }

    // Load elections
    await loadElections();
}); 