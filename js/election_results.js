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

        // Check if connected to the correct network
        if (networkId !== 5777) {
            throw new Error('Please connect to the Ganache network (Network ID: 5777)');
        }

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

            // Load election results
            await loadElectionResults();

        } catch (error) {
            console.error('Error loading contract:', error);
            showError('Failed to load contract. Please make sure the contract is deployed: ' + error.message);
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showError(error.message);
    }
}

// Load election results
async function loadElectionResults() {
    try {
        const resultsDiv = document.getElementById('electionResults');
        resultsDiv.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div><p class="text-muted">Loading election results...</p></div>';

        // Get total number of elections
        const electionCount = await contract.methods.electionCount().call();
        console.log('Total elections:', electionCount);

        if (electionCount === 0) {
            resultsDiv.innerHTML = '<div class="alert alert-info">No elections found.</div>';
            return;
        }

        let html = '<div class="row">';
        let hasResults = false;

        // Loop through all elections
        for (let i = 1; i <= electionCount; i++) {
            const election = await contract.methods.getElection(i).call();
            console.log('Election data:', election);
            
            // Skip active elections
            if (election.isActive) continue;

            hasResults = true;
            const startTime = new Date(election.startTime * 1000);
            const endTime = new Date(election.endTime * 1000);

            // Get candidates for this election
            const candidates = await contract.methods.getCandidatesByElection(i).call();
            console.log('Candidates data:', candidates);
            
            // Calculate total votes and find winner
            let totalVotes = 0;
            let maxVotes = 0;
            let winnerIndex = -1;
            let isTie = false;
            
            candidates.voteCounts.forEach((votes, index) => {
                const voteCount = parseInt(votes);
                totalVotes += voteCount;
                
                if (voteCount > maxVotes) {
                    maxVotes = voteCount;
                    winnerIndex = index;
                    isTie = false;
                } else if (voteCount === maxVotes) {
                    isTie = true;
                }
            });

            html += `
                <div class="col-md-6 mb-4">
                    <div class="card">
                        <div class="card-header bg-primary text-white">
                            <h5 class="card-title mb-0">${election.name}</h5>
                        </div>
                        <div class="card-body">
                            <p class="card-text">${election.description}</p>
                            <p class="text-muted">
                                <small>
                                    <i class="fas fa-calendar"></i> ${startTime.toLocaleDateString()} - ${endTime.toLocaleDateString()}
                                </small>
                            </p>
                            ${totalVotes > 0 ? `
                                <div class="alert ${isTie ? 'alert-warning' : 'alert-success'} mb-3">
                                    <h6 class="mb-0">
                                        <i class="fas ${isTie ? 'fa-exclamation-triangle' : 'fa-trophy'}"></i>
                                        ${isTie ? 'Election Result: TIE' : `Congratulations! ${candidates.names[winnerIndex]} is the winner`}
                                    </h6>
                                    ${!isTie ? `<small>with ${maxVotes} votes (${((maxVotes/totalVotes)*100).toFixed(2)}%)</small>` : ''}
                                </div>
                            ` : `
                                <div class="alert alert-info mb-3">
                                    <h6 class="mb-0">
                                        <i class="fas fa-info-circle"></i>
                                        No votes cast in this election
                                    </h6>
                                </div>
                            `}
                            <h6 class="mt-3">Detailed Results:</h6>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Candidate</th>
                                            <th>Votes</th>
                                            <th>Percentage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
            `;

            // Add candidate results
            for (let j = 0; j < candidates.candidateIds.length; j++) {
                const votes = parseInt(candidates.voteCounts[j]);
                const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(2) : 0;
                const isWinner = !isTie && j === winnerIndex;
                
                html += `
                    <tr class="${isWinner ? 'table-success' : ''}">
                        <td>
                            ${candidates.names[j]}
                            ${isWinner ? ' <i class="fas fa-crown text-warning"></i>' : ''}
                        </td>
                        <td>${votes}</td>
                        <td>${percentage}%</td>
                    </tr>
                `;
            }

            html += `
                                    </tbody>
                                </table>
                            </div>
                            <div class="mt-3">
                                <p class="text-muted">
                                    <small>Total Votes Cast: ${totalVotes}</small>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';

        if (!hasResults) {
            resultsDiv.innerHTML = '<div class="alert alert-info">No completed elections found.</div>';
        } else {
            resultsDiv.innerHTML = html;
        }

    } catch (error) {
        console.error('Error loading election results:', error);
        showError('Failed to load election results: ' + error.message);
    }
}

// Show error message
function showError(message) {
    const resultsDiv = document.getElementById('electionResults');
    resultsDiv.innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-circle"></i>
            <strong>Error:</strong> ${message}
            <div class="mt-2">
                <button class="btn btn-outline-danger btn-sm" onclick="init()">
                    <i class="fas fa-sync"></i> Retry
                </button>
            </div>
        </div>
    `;
}

// Initialize when the page loads
window.addEventListener('load', init);

// Add search functionality
document.getElementById('searchButton').addEventListener('click', async function() {
    const searchTerm = document.getElementById('searchElection').value.toLowerCase();
    const electionCards = document.querySelectorAll('.card');
    
    electionCards.forEach(card => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        const description = card.querySelector('.card-text').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            card.parentElement.style.display = '';
        } else {
            card.parentElement.style.display = 'none';
        }
    });
}); 