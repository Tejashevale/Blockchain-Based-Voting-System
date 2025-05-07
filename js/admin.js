// Global variables
let web3;
let contract;
let account;

// Contract ABI - this will be loaded from the JSON file
let contractABI;

// Initialize Web3 and contract
async function init() {
    try {
        // Show loading message
        showStatusMessage('Connecting to blockchain...', 'info');

        // Check if MetaMask is installed
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask is not installed. Please install MetaMask and refresh the page.');
        }

        // Request account access
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
        } catch (error) {
            throw new Error('Please connect your MetaMask wallet to continue.');
        }

        // Initialize Web3
        web3 = new Web3(window.ethereum);
        console.log('Web3 initialized');

        // Get network ID and chain ID
        const networkId = await web3.eth.net.getId();
        const chainId = await web3.eth.getChainId();
        console.log('Network ID:', networkId);
        console.log('Chain ID:', chainId);

        if (networkId !== 5777) {
            throw new Error('Please connect to the Ganache network (Network ID: 5777)');
        }

        // Get current account
        const accounts = await web3.eth.getAccounts();
        account = accounts[0];
        console.log('Connected account:', account);

        if (!account) {
            throw new Error('No account found. Please unlock your MetaMask wallet.');
        }

        try {
            // Load contract ABI
            const response = await fetch('../build/contracts/Election.json');
            if (!response.ok) {
                throw new Error('Failed to load contract ABI');
            }
            const data = await response.json();
            contractABI = data.abi;
            console.log('Contract ABI loaded');

            // Initialize contract with ABI and address
            contract = new web3.eth.Contract(
                contractABI,
                config.contractAddress
            );

            // Verify contract
            const code = await web3.eth.getCode(config.contractAddress);
            console.log('Contract address:', config.contractAddress);
            console.log('Contract code:', code);
            
            if (code === '0x' || code === '0x0') {
                throw new Error('No contract found at the specified address. Please ensure the contract is deployed.');
            }

            // Test contract connection
            try {
                const adminAddress = await contract.methods.admin().call();
                console.log('Contract admin:', adminAddress);
                console.log('Current account:', account);
                
                if (adminAddress.toLowerCase() !== account.toLowerCase()) {
                    throw new Error('Connected account is not the contract admin. Please use the admin account.');
                }
            } catch (error) {
                console.error('Error testing contract connection:', error);
                throw new Error('Failed to connect to the contract. Please check your configuration.');
            }

            // Listen for account changes
            window.ethereum.on('accountsChanged', function (accounts) {
                account = accounts[0];
                showStatusMessage('Account changed. Reloading...', 'info');
                setTimeout(() => window.location.reload(), 1500);
            });

            // Listen for network changes
            window.ethereum.on('networkChanged', function () {
                showStatusMessage('Network changed. Reloading...', 'info');
                setTimeout(() => window.location.reload(), 1500);
            });

            console.log('Contract initialized successfully');
            showStatusMessage('Connected successfully!', 'success');
            
            // Initialize event listeners
            initializeEventListeners();
            
            // Load initial dashboard data
            await loadDashboard();

        } catch (error) {
            console.error('Contract loading error:', error);
            throw new Error('Could not load contract data. Please ensure the contract is properly compiled and deployed.');
        }

    } catch (error) {
        console.error('Initialization error:', error);
        showStatusMessage('Error: ' + error.message, 'error', true);
        
        // Add retry button if there's an error
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="alert alert-danger">
                <h4>Connection Error</h4>
                <p>${error.message}</p>
                <p>Please make sure:</p>
                <ul>
                    <li>MetaMask is installed and unlocked</li>
                    <li>You are connected to Ganache (Network ID: 5777)</li>
                    <li>You are using the admin account (${config.contractAddress})</li>
                    <li>The contract is properly deployed</li>
                </ul>
                <div class="mt-3">
                    <button class="btn btn-primary" onclick="init()">
                        <i class="fas fa-sync"></i> Retry Connection
                    </button>
                    <button class="btn btn-secondary ms-2" onclick="window.location.reload()">
                        <i class="fas fa-redo"></i> Refresh Page
                    </button>
                </div>
            </div>
        `;
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Add click event listeners for sidebar navigation
    document.querySelectorAll('.sidebar a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Show status message
function showStatusMessage(message, type = 'info', persistent = false) {
    const statusDiv = document.getElementById('statusMessage');
    if (!statusDiv) {
        const div = document.createElement('div');
        div.id = 'statusMessage';
        div.style.position = 'fixed';
        div.style.top = '20px';
        div.style.right = '20px';
        div.style.zIndex = '1000';
        document.body.appendChild(div);
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.getElementById('statusMessage').appendChild(alertDiv);

    if (!persistent) {
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

// Initialize button event listeners
function initializeButtons() {
    document.getElementById('dashboardBtn').addEventListener('click', showDashboard);
    document.getElementById('addElectionBtn').addEventListener('click', showAddElectionForm);
    document.getElementById('addCandidateBtn').addEventListener('click', showAddCandidateForm);
    document.getElementById('addVoterBtn').addEventListener('click', showAddVoterForm);
    document.getElementById('viewVotersBtn').addEventListener('click', showVotersList);
    document.getElementById('viewCandidatesBtn').addEventListener('click', showCandidatesList);
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// Show add candidate form
function showAddCandidateForm() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="container mt-4">
            <h2 class="mb-4">Add New Candidate</h2>
            <form id="addCandidateForm">
                <div class="mb-3">
                    <label for="electionSelect" class="form-label">Select Election</label>
                    <select class="form-select" id="electionSelect" required>
                        <option value="">Choose an election...</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="candidateName" class="form-label">Candidate Name</label>
                    <input type="text" class="form-control" id="candidateName" required
                           placeholder="Enter candidate's full name">
                </div>
                <div class="mb-3">
                    <label for="candidateDescription" class="form-label">Candidate Description</label>
                    <textarea class="form-control" id="candidateDescription" required rows="3"
                            placeholder="Enter candidate's description, qualifications, etc."></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Add Candidate</button>
                <button type="button" class="btn btn-secondary" onclick="showDashboard()">Cancel</button>
            </form>
        </div>
    `;

    // Load elections into select
    loadElectionsIntoSelect();
    
    // Add form submit handler
    document.getElementById('addCandidateForm').addEventListener('submit', handleAddCandidate);
}

// Show add election form
function showAddElectionForm() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="container">
            <h2 class="mb-4">Create New Election</h2>
            <form id="addElectionForm" class="needs-validation" novalidate>
                <div class="mb-3">
                    <label for="electionName" class="form-label">Election Name</label>
                    <input type="text" class="form-control" id="electionName" required
                           placeholder="Enter election name (e.g., Student Council Election 2024)">
                    <div class="invalid-feedback">Please enter an election name.</div>
                </div>
                <div class="mb-3">
                    <label for="electionDescription" class="form-label">Election Description</label>
                    <textarea class="form-control" id="electionDescription" required rows="3"
                            placeholder="Enter detailed description of the election"></textarea>
                    <div class="invalid-feedback">Please enter an election description.</div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="startDate" class="form-label">Start Date</label>
                            <input type="date" class="form-control" id="startDate" required
                                   min="${new Date().toISOString().split('T')[0]}">
                            <div class="invalid-feedback">Please select a valid start date.</div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="startTime" class="form-label">Start Time</label>
                            <div class="input-group">
                                <input type="time" class="form-control" id="startTime" required
                                       pattern="[0-9]{2}:[0-9]{2}">
                                <select class="form-select" id="startAmPm" style="max-width: 80px;">
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                </select>
                                <div class="invalid-feedback">Please enter a valid start time.</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="endDate" class="form-label">End Date</label>
                            <input type="date" class="form-control" id="endDate" required
                                   min="${new Date().toISOString().split('T')[0]}">
                            <div class="invalid-feedback">Please select a valid end date.</div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="endTime" class="form-label">End Time</label>
                            <div class="input-group">
                                <input type="time" class="form-control" id="endTime" required
                                       pattern="[0-9]{2}:[0-9]{2}">
                                <select class="form-select" id="endAmPm" style="max-width: 80px;">
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                </select>
                                <div class="invalid-feedback">Please enter a valid end time.</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> 
                    <strong>Note:</strong> All times are in your local timezone. Make sure to set appropriate start and end times.
                </div>
                <div class="mt-3">
                    <button type="submit" class="btn btn-primary">Create Election</button>
                    <button type="button" class="btn btn-secondary" onclick="showDashboard()">Cancel</button>
                </div>
            </form>
        </div>
    `;

    // Set minimum date for the date inputs to today
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    startDateInput.min = todayStr;
    startDateInput.value = todayStr;
    endDateInput.min = todayStr;
    endDateInput.value = tomorrowStr;

    // Set current time as default
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15; // Round to next 15 minutes
    const nextHour = new Date(now.setMinutes(roundedMinutes));
    
    const formattedHours = nextHour.getHours() % 12 || 12;
    const formattedMinutes = nextHour.getMinutes().toString().padStart(2, '0');
    const ampm = nextHour.getHours() >= 12 ? 'PM' : 'AM';

    // Set default values for time inputs
    document.getElementById('startTime').value = `${formattedHours.toString().padStart(2, '0')}:${formattedMinutes}`;
    document.getElementById('endTime').value = `${formattedHours.toString().padStart(2, '0')}:${formattedMinutes}`;
    document.getElementById('startAmPm').value = ampm;
    document.getElementById('endAmPm').value = ampm;

    // Add form validation
    const form = document.getElementById('addElectionForm');
    form.addEventListener('submit', function(event) {
        if (!form.checkValidity()) {
            event.preventDefault();
            event.stopPropagation();
        }
        form.classList.add('was-validated');
        handleAddElection(event);
    });

    // Add event listeners for date/time validation
    startDateInput.addEventListener('change', validateDates);
    endDateInput.addEventListener('change', validateDates);
    document.getElementById('startTime').addEventListener('change', validateDates);
    document.getElementById('endTime').addEventListener('change', validateDates);
    document.getElementById('startAmPm').addEventListener('change', validateDates);
    document.getElementById('endAmPm').addEventListener('change', validateDates);
}

// Function to validate dates
function validateDates() {
    const startDate = document.getElementById('startDate').value;
    const startTime = document.getElementById('startTime').value;
    const startAmPm = document.getElementById('startAmPm').value;
    const endDate = document.getElementById('endDate').value;
    const endTime = document.getElementById('endTime').value;
    const endAmPm = document.getElementById('endAmPm').value;

    if (!startDate || !startTime || !endDate || !endTime) return;

    function convertTo24Hour(time, ampm) {
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours);
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }

    const startDateTime = new Date(startDate + 'T' + convertTo24Hour(startTime, startAmPm));
    const endDateTime = new Date(endDate + 'T' + convertTo24Hour(endTime, endAmPm));
    const now = new Date();

    const submitButton = document.querySelector('#addElectionForm button[type="submit"]');
    const errorDiv = document.getElementById('dateError');

    if (startDateTime <= now) {
        if (!errorDiv) {
            const div = document.createElement('div');
            div.id = 'dateError';
            div.className = 'alert alert-danger mt-3';
            div.innerHTML = 'Start time must be in the future';
            document.getElementById('addElectionForm').prepend(div);
        }
        submitButton.disabled = true;
        return;
    }

    if (endDateTime <= startDateTime) {
        if (!errorDiv) {
            const div = document.createElement('div');
            div.id = 'dateError';
            div.className = 'alert alert-danger mt-3';
            div.innerHTML = 'End time must be after start time';
            document.getElementById('addElectionForm').prepend(div);
        }
        submitButton.disabled = true;
        return;
    }

    if (errorDiv) {
        errorDiv.remove();
    }
    submitButton.disabled = false;
}

// Handle add election form submission
async function handleAddElection(event) {
    event.preventDefault();
    
    try {
        // Check if contract is initialized
        if (!contract || !contract.methods) {
            throw new Error('Contract not initialized. Please refresh the page and try again.');
        }

        // Get form data
        const electionName = document.getElementById('electionName').value;
        const electionDescription = document.getElementById('electionDescription').value;
        
        // Get start date and time
        const startDate = document.getElementById('startDate').value;
        const startTime = document.getElementById('startTime').value;
        const startAmPm = document.getElementById('startAmPm').value;
        
        // Get end date and time
        const endDate = document.getElementById('endDate').value;
        const endTime = document.getElementById('endTime').value;
        const endAmPm = document.getElementById('endAmPm').value;

        // Validate inputs
        if (!electionName || !electionDescription) {
            throw new Error('Please enter election name and description');
        }

        if (!startDate || !startTime || !endDate || !endTime) {
            throw new Error('Please enter both start and end dates and times');
        }

        // Convert 12-hour format to 24-hour format
        function convertTo24Hour(timeStr, ampm) {
            let [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
            
            if (ampm === 'PM' && hours !== 12) {
                hours += 12;
            } else if (ampm === 'AM' && hours === 12) {
                hours = 0;
            }
            
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }

        // Parse dates and times
        const startDateTime = new Date(`${startDate}T${convertTo24Hour(startTime, startAmPm)}`);
        const endDateTime = new Date(`${endDate}T${convertTo24Hour(endTime, endAmPm)}`);
        
        // Get current date/time
        const now = new Date();

        // Validate dates
        if (startDateTime <= now) {
            throw new Error('Start time must be in the future');
        }

        if (endDateTime <= startDateTime) {
            throw new Error('End time must be after start time');
        }

        // Convert to Unix timestamp (seconds)
        const startTimestamp = Math.floor(startDateTime.getTime() / 1000);
        const endTimestamp = Math.floor(endDateTime.getTime() / 1000);

        console.log('Creating election with parameters:', {
            name: electionName,
            description: electionDescription,
            startTime: startTimestamp,
            endTime: endTimestamp,
            startDateTime: startDateTime.toLocaleString(),
            endDateTime: endDateTime.toLocaleString()
        });

        showStatusMessage('Creating election...', 'info');

        // Create election with fixed gas parameters
        const result = await contract.methods.createElection(
            electionName,
            electionDescription,
            startTimestamp,
            endTimestamp
        ).send({ 
            from: account,
            gas: 500000  // Fixed gas limit
        });

        console.log('Election created:', result);
        showStatusMessage('Election created successfully!', 'success');
        
        // Clear form
        document.getElementById('addElectionForm').reset();
        
        // Show success message with details
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="alert alert-success">
                <h4>Election Created Successfully!</h4>
                <p>Name: ${electionName}</p>
                <p>Description: ${electionDescription}</p>
                <p>Start: ${startDateTime.toLocaleString()}</p>
                <p>End: ${endDateTime.toLocaleString()}</p>
                <div class="mt-3">
                    <button class="btn btn-primary" onclick="showDashboard()">
                        Return to Dashboard
                    </button>
                    <button class="btn btn-secondary ms-2" onclick="showAddCandidateForm()">
                        Add Candidates
                    </button>
                </div>
            </div>
        `;

        // Refresh dashboard in the background
        setTimeout(() => loadDashboard(), 1000);

    } catch (error) {
        console.error('Error creating election:', error);
        showStatusMessage('Error creating election: ' + error.message, 'error', true);
        
        // Show error in form
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger mt-3';
        errorDiv.innerHTML = `
            <strong>Error:</strong> ${error.message}
            <button type="button" class="btn-close float-end" data-bs-dismiss="alert"></button>
        `;
        document.getElementById('addElectionForm').prepend(errorDiv);
    }
}

// Handle add candidate form submission
async function handleAddCandidate(e) {
    e.preventDefault();
    try {
        const electionId = document.getElementById('electionSelect').value;
        const candidateName = document.getElementById('candidateName').value;
        const candidateDescription = document.getElementById('candidateDescription').value;

        // Validate inputs
        if (!electionId || !candidateName || !candidateDescription) {
            throw new Error('Please fill in all fields');
        }

        // Check if election exists and is active
        const election = await contract.methods.getElection(electionId).call();
        if (!election.isActive) {
            throw new Error('This election is not active');
        }

        console.log('Adding candidate:', {
            electionId,
            candidateName,
            candidateDescription
        });

        showStatusMessage('Adding candidate...', 'info');

        // Add candidate
        const result = await contract.methods.addCandidate(
            electionId,
            candidateName,
            candidateDescription
        ).send({ from: account });

        console.log('Candidate added:', result);
        showStatusMessage('Candidate added successfully!', 'success');
        
        // Reset form
        document.getElementById('addCandidateForm').reset();
        
        // Show success message with details
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="alert alert-success">
                <h4>Candidate Added Successfully!</h4>
                <p>Name: ${candidateName}</p>
                <p>Description: ${candidateDescription}</p>
                <p>Election ID: ${electionId}</p>
                <div class="mt-3">
                    <button class="btn btn-primary me-2" onclick="showAddCandidateForm()">
                        Add Another Candidate
                    </button>
                    <button class="btn btn-secondary" onclick="showCandidatesList()">
                        View All Candidates
                    </button>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error adding candidate:', error);
        showStatusMessage('Error adding candidate: ' + error.message, 'error');
    }
}

// Show add voter form
function showAddVoterForm() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="container mt-4">
            <h2 class="mb-4">Add New Voter</h2>
            <form id="addVoterForm">
                <div class="mb-3">
                    <label for="voterName" class="form-label">Voter Name</label>
                    <input type="text" class="form-control" id="voterName" required
                           placeholder="Enter voter's full name">
                </div>
                <div class="mb-3">
                    <label for="voterId" class="form-label">Voter ID</label>
                    <input type="text" class="form-control" id="voterId" required
                           placeholder="Enter unique voter ID (e.g., Aadhar number)">
                </div>
                <div class="mb-3">
                    <label for="voterAddress" class="form-label">Voter's Ethereum Address</label>
                    <input type="text" class="form-control" id="voterAddress" required
                           placeholder="Enter voter's Ethereum wallet address">
                    <div class="form-text">This should be the Ethereum address the voter will use to cast their vote</div>
                </div>
                <button type="submit" class="btn btn-primary">Register Voter</button>
                <button type="button" class="btn btn-secondary" onclick="showDashboard()">Cancel</button>
            </form>
        </div>
    `;

    // Add form submit handler
    document.getElementById('addVoterForm').addEventListener('submit', handleAddVoter);
}

// Handle add voter form submission
async function handleAddVoter(e) {
    e.preventDefault();
    try {
        const voterName = document.getElementById('voterName').value;
        const voterId = document.getElementById('voterId').value;
        const voterAddress = document.getElementById('voterAddress').value.trim();

        // Validate inputs
        if (!voterName || !voterId || !voterAddress) {
            throw new Error('Please fill in all fields');
        }

        // Validate Ethereum address format
        if (!web3.utils.isAddress(voterAddress)) {
            throw new Error('Please enter a valid Ethereum address');
        }

        showStatusMessage('Checking voter status...', 'info');

        // First check if voter is already registered
        try {
            const existingVoter = await contract.methods.getVoter(voterAddress).call();
            if (existingVoter.isRegistered) {
                throw new Error('This Ethereum address is already registered as a voter');
            }
        } catch (error) {
            if (!error.message.includes('not registered')) {
                console.error('Error checking voter:', error);
            }
        }

        showStatusMessage('Registering voter...', 'info');

        // Register voter with fixed gas parameters
        console.log('Registering voter with:', {
            name: voterName,
            voterId: voterId,
            address: voterAddress
        });

        const result = await contract.methods.registerVoter(
            voterName,
            voterId,
            voterAddress
        ).send({ 
            from: account,
            gas: 300000  // Fixed gas limit
        });

        console.log('Voter registration transaction:', result);

        // Wait for the transaction to be mined
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify the registration
        const verifyVoter = await contract.methods.getVoter(voterAddress).call();
        console.log('Verified voter data:', verifyVoter);
        if (!verifyVoter.isRegistered) {
            throw new Error('Voter registration failed verification. Please try again.');
        }

        showStatusMessage('Voter registered successfully!', 'success');

        // Clear the form
        document.getElementById('voterName').value = '';
        document.getElementById('voterId').value = '';
        document.getElementById('voterAddress').value = '';

        // Show success message and refresh voters list
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="alert alert-success">
                <h4>Voter Registered Successfully!</h4>
                <p>Name: ${voterName}</p>
                <p>Voter ID: ${voterId}</p>
                <p>Ethereum Address: ${voterAddress}</p>
                <div class="mt-3">
                    <button class="btn btn-primary me-2" onclick="showAddVoterForm()">
                        Register Another Voter
                    </button>
                    <button class="btn btn-secondary" onclick="showVotersList()">
                        View All Voters
                    </button>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error registering voter:', error);
        showStatusMessage('Error registering voter: ' + error.message, 'error');
    }
}

// Load elections into select
async function loadElectionsIntoSelect() {
    try {
        const totalElections = await contract.methods.electionCount().call();
        const select = document.getElementById('electionSelect');
        select.innerHTML = '<option value="">Choose an election...</option>';
        
        for (let i = 1; i <= totalElections; i++) {
            const election = await contract.methods.getElection(i).call();
            if (election.isActive) {
                select.innerHTML += `
                    <option value="${i}">${election.name}</option>
                `;
            }
        }

        if (select.options.length === 1) {
            select.innerHTML += '<option value="" disabled>No active elections available</option>';
        }
    } catch (error) {
        console.error('Error loading elections:', error);
        showStatusMessage('Error loading elections: ' + error.message, 'error');
    }
}

// Show dashboard
async function showDashboard() {
    const mainContent = document.getElementById('mainContent');
    const template = document.getElementById('dashboardTemplate');
    
    // Clear existing content
    mainContent.innerHTML = '';
    
    // Clone and append template content
    const content = template.content.cloneNode(true);
    mainContent.appendChild(content);
    
    // Load dashboard data
    await loadDashboard();
}

// Show candidates list
async function showCandidatesList() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="container mt-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2>Candidates List</h2>
                <button class="btn btn-primary" onclick="showAddCandidateForm()">
                    <i class="fas fa-plus"></i> Add New Candidate
                </button>
            </div>
            <div id="candidatesList">
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="text-muted">Loading candidates...</p>
                </div>
            </div>
        </div>
    `;

    try {
        const result = await contract.methods.getAllCandidates().call();
        const candidatesList = document.getElementById('candidatesList');
        
        if (result.candidateIds.length === 0) {
            candidatesList.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> No candidates have been added yet.
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Election</th>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Votes</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (let i = 0; i < result.candidateIds.length; i++) {
            // Skip deleted candidates (those with empty names)
            if (!result.names[i]) continue;
            
            const election = await contract.methods.getElection(result.electionIds[i]).call();
            const statusBadge = result.activeStates[i] 
                ? '<span class="badge bg-success">Active</span>'
                : '<span class="badge bg-secondary">Inactive</span>';

            html += `
                <tr>
                    <td>${election.name}</td>
                    <td>${result.candidateIds[i]}</td>
                    <td>${result.names[i]}</td>
                    <td>${result.descriptions[i]}</td>
                    <td>${result.voteCounts[i]}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-danger btn-sm" 
                                onclick="deleteCandidate(${result.electionIds[i]}, ${result.candidateIds[i]})"
                                ${!result.activeStates[i] ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        candidatesList.innerHTML = html;

    } catch (error) {
        console.error('Error loading candidates:', error);
        document.getElementById('candidatesList').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i>
                <strong>Error loading candidates:</strong> ${error.message}
                <button class="btn btn-outline-danger btn-sm float-end" onclick="showCandidatesList()">
                    <i class="fas fa-sync"></i> Retry
                </button>
            </div>
        `;
    }
}

// Function to delete a candidate
async function deleteCandidate(electionId, candidateId) {
    try {
        if (!confirm('Are you sure you want to delete this candidate? This action cannot be undone.')) {
            return;
        }

        showStatusMessage('Deleting candidate...', 'info');

        const result = await contract.methods.deleteCandidate(electionId, candidateId)
            .send({ from: account });

        console.log('Candidate deleted:', result);
        showStatusMessage('Candidate deleted successfully!', 'success');

        // Refresh the candidates list
        await showCandidatesList();

    } catch (error) {
        console.error('Error deleting candidate:', error);
        showStatusMessage('Error deleting candidate: ' + error.message, 'error');
    }
}

// Show voters list
async function showVotersList() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="container mt-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2>Registered Voters</h2>
                <button class="btn btn-primary" onclick="showAddVoterForm()">
                    <i class="fas fa-plus"></i> Add New Voter
                </button>
            </div>
            <div id="votersList">
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="text-muted">Loading voters...</p>
                </div>
            </div>
        </div>
    `;

    try {
        console.log('Fetching voters list...');
        
        // Add delay to ensure transaction is mined
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get the contract's admin address
        const adminAddress = await contract.methods.admin().call();
        console.log('Contract admin address:', adminAddress);
        console.log('Current account:', account);

        const result = await contract.methods.getAllVoters().call({
            from: account
        });
        
        console.log('Voters data received:', result);
        const votersList = document.getElementById('votersList');
        
        if (!result || !result.voterAddresses || result.voterAddresses.length === 0) {
            votersList.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> No registered voters found.
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Name</th>
                            <th>Voter ID</th>
                            <th>Ethereum Address</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        let hasValidVoters = false;
        for (let i = 0; i < result.voterAddresses.length; i++) {
            // Skip empty or invalid addresses
            if (!result.voterAddresses[i] || 
                result.voterAddresses[i] === '0x0000000000000000000000000000000000000000' ||
                !result.names[i]) continue;
            
            hasValidVoters = true;
            const statusBadge = result.isRegistered[i]
                ? '<span class="badge bg-success">Active</span>'
                : '<span class="badge bg-secondary">Inactive</span>';

            html += `
                <tr>
                    <td>${result.names[i] || 'N/A'}</td>
                    <td>${result.voterIds[i] || 'N/A'}</td>
                    <td><small class="text-muted">${result.voterAddresses[i]}</small></td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-danger btn-sm" 
                                onclick="deleteVoter('${result.voterAddresses[i]}')"
                                ${!result.isRegistered[i] ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }
        
        html += `
                    </tbody>
                </table>
            </div>
        `;

        if (!hasValidVoters) {
            votersList.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> No registered voters found.
                </div>
            `;
            return;
        }

        votersList.innerHTML = html;

        // Update the dashboard count
        const registeredVoters = document.querySelector('.registered-voters');
        if (registeredVoters) {
            const activeVoters = result.isRegistered.filter(status => status).length;
            registeredVoters.textContent = activeVoters;
        }

    } catch (error) {
        console.error('Error loading voters:', error);
        document.getElementById('votersList').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i>
                <strong>Error loading voters:</strong> ${error.message}
                <div class="mt-3">
                    <button class="btn btn-outline-danger btn-sm" onclick="showVotersList()">
                        <i class="fas fa-sync"></i> Retry
                    </button>
                    <button class="btn btn-outline-primary btn-sm ms-2" onclick="showAddVoterForm()">
                        <i class="fas fa-plus"></i> Add New Voter
                    </button>
                </div>
            </div>
        `;
    }
}

// Function to delete a voter
async function deleteVoter(voterAddress) {
    try {
        if (!confirm('Are you sure you want to delete this voter? This action cannot be undone.')) {
            return;
        }

        showStatusMessage('Deleting voter...', 'info');

        const result = await contract.methods.deleteVoter(voterAddress)
            .send({ from: account });

        console.log('Voter deleted:', result);
        showStatusMessage('Voter deleted successfully!', 'success');

        // Refresh the voters list
        await showVotersList();

    } catch (error) {
        console.error('Error deleting voter:', error);
        showStatusMessage('Error deleting voter: ' + error.message, 'error');
    }
}

// Logout function
function logout() {
    // Clear any user session data if needed
    window.location.href = 'index.html';
}

// Load dashboard data
async function loadDashboard() {
    try {
        // Get contract statistics
        const electionCount = await contract.methods.electionCount().call();
        const totalCandidates = await contract.methods.getTotalCandidateCount().call();
        const activeElections = await contract.methods.getActiveElectionsCount().call();
        const votersList = await contract.methods.getAllVoters().call();

        // Update statistics
        document.querySelector('.total-elections').textContent = electionCount;
        document.querySelector('.active-elections').textContent = activeElections;
        document.querySelector('.total-candidates').textContent = totalCandidates;
        document.querySelector('.registered-voters').textContent = votersList[0].length;

        // Load recent elections
        const recentElectionsDiv = document.querySelector('.recent-elections');
        let electionsHtml = '<div class="table-responsive"><table class="table table-hover">';
        electionsHtml += `
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
        `;

        let hasElections = false;
        for (let i = electionCount; i > 0; i--) {
            const election = await contract.methods.getElection(i).call();
            
            // Skip deleted elections
            if (!election.isActive) {
                continue;
            }

            hasElections = true;
            const startTime = new Date(election.startTime * 1000);
            const endTime = new Date(election.endTime * 1000);
            const now = new Date();

            let status;
            let statusClass;
            if (now < startTime) {
                status = 'Upcoming';
                statusClass = 'warning';
            } else if (now > endTime) {
                status = 'Ended';
                statusClass = 'secondary';
            } else {
                status = 'Active';
                statusClass = 'success';
            }

            electionsHtml += `
                <tr>
                    <td>${election.name}</td>
                    <td>${election.description}</td>
                    <td>${startTime.toLocaleString()}</td>
                    <td>${endTime.toLocaleString()}</td>
                    <td><span class="badge bg-${statusClass}">${status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-warning me-2" onclick="editElection(${i})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteElection(${i})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }

        electionsHtml += '</tbody></table></div>';
        
        if (!hasElections) {
            electionsHtml = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> No active elections found.
                    <button class="btn btn-primary btn-sm float-end" onclick="showAddElectionForm()">
                        <i class="fas fa-plus"></i> Create Election
                    </button>
                </div>
            `;
        }
        
        recentElectionsDiv.innerHTML = electionsHtml;

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showStatusMessage('Error loading dashboard data: ' + error.message, 'error');
        
        // Show error state in dashboard
        const recentElectionsDiv = document.querySelector('.recent-elections');
        recentElectionsDiv.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i>
                <strong>Error loading elections:</strong> ${error.message}
                <button class="btn btn-outline-danger btn-sm float-end" onclick="loadDashboard()">
                    <i class="fas fa-sync"></i> Retry
                </button>
            </div>
        `;
    }
}

// Delete election function
async function deleteElection(electionId) {
    try {
        // Get election details first
        const election = await contract.methods.getElection(electionId).call();
        const startTime = new Date(election.startTime * 1000);
        const now = new Date();

        // Check if election has already started
        if (now >= startTime) {
            showStatusMessage('Cannot delete an election that has already started or ended.', 'error');
            return;
        }

        // Show detailed confirmation dialog
        if (!confirm(`Are you sure you want to delete the election "${election.name}"?\n\nThis action will:\n- Mark the election as inactive\n- Prevent future votes\n- Keep historical data intact\n\nThis action cannot be undone.`)) {
            return;
        }

        showStatusMessage('Deleting election...', 'info');

        // Call the contract's deleteElection function
        const result = await contract.methods.deleteElection(electionId).send({
            from: account,
            gas: 200000
        });

        console.log('Election deletion transaction:', result);

        showStatusMessage(`Election "${election.name}" has been successfully deleted!`, 'success');

        // Reload both dashboard and elections list
        await Promise.all([
            loadDashboard(),
            loadElectionsIntoSelect()
        ]);

    } catch (error) {
        console.error('Error deleting election:', error);
        let errorMessage = 'Error deleting election: ';
        
        if (error.message.includes('gas')) {
            errorMessage += 'Transaction failed due to gas estimation. The election may be locked or already deleted.';
        } else if (error.message.includes('denied')) {
            errorMessage += 'Transaction was denied by user.';
        } else {
            errorMessage += error.message;
        }
        
        showStatusMessage(errorMessage, 'error');
    }
}

// Show results page
async function showResults() {
    try {
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h4 class="mb-0">
                        <i class="fas fa-chart-bar me-2"></i>
                        Election Results
                    </h4>
                </div>
                <div class="card-body">
                    <div class="mb-4">
                        <label for="electionSelect" class="form-label">Select Election</label>
                        <select id="electionSelect" class="form-select">
                            <option value="">Loading elections...</option>
                        </select>
                    </div>

                    <div class="total-votes text-center mb-4">
                        <h5 class="text-muted mb-2">Total Votes</h5>
                        <div class="total-votes-count h2" id="totalVotesCount">0</div>
                    </div>

                    <div id="resultsContainer">
                        <div class="text-center text-muted">
                            <i class="fas fa-chart-bar fa-3x mb-3"></i>
                            <p>Select an election to view results</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Load elections into select
        const electionSelect = document.getElementById('electionSelect');
        const electionCount = await contract.methods.electionCount().call();
        
        if (electionCount === 0) {
            electionSelect.innerHTML = '<option value="">No elections found</option>';
            return;
        }

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
        console.error('Error showing results:', error);
        showStatusMessage('Error loading results: ' + error.message, 'error');
    }
}

// Load election results
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
                <div class="result-item mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="candidate-name h5 mb-0">${candidate.name}</span>
                        <span class="vote-count h5 mb-0">${voteCount} votes</span>
                    </div>
                    <div class="progress mt-2">
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
        showStatusMessage('Error loading election results: ' + error.message, 'error');
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

// Add the editElection function
function editElection(electionId) {
    contract.methods.getElection(electionId).call().then(election => {
        const mainContent = document.getElementById('mainContent');
        // Convert timestamps to local date and time strings
        const start = new Date(election.startTime * 1000);
        const end = new Date(election.endTime * 1000);
        const startDate = start.toISOString().split('T')[0];
        const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endDate = end.toISOString().split('T')[0];
        const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        mainContent.innerHTML = `
            <div class="container mt-4">
                <h2 class="mb-4">Edit Election Timing</h2>
                <form id="editElectionForm">
                    <div class="mb-3">
                        <label for="editStartDate" class="form-label">Start Date</label>
                        <input type="date" class="form-control" id="editStartDate" value="${startDate}" required>
                    </div>
                    <div class="mb-3">
                        <label for="editStartTime" class="form-label">Start Time</label>
                        <input type="time" class="form-control" id="editStartTime" value="${startTime}" required>
                    </div>
                    <div class="mb-3">
                        <label for="editEndDate" class="form-label">End Date</label>
                        <input type="date" class="form-control" id="editEndDate" value="${endDate}" required>
                    </div>
                    <div class="mb-3">
                        <label for="editEndTime" class="form-label">End Time</label>
                        <input type="time" class="form-control" id="editEndTime" value="${endTime}" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                    <button type="button" class="btn btn-secondary ms-2" onclick="showDashboard()">Cancel</button>
                </form>
            </div>
        `;
        document.getElementById('editElectionForm').addEventListener('submit', async function(event) {
            event.preventDefault();
            const newStartDate = document.getElementById('editStartDate').value;
            const newStartTime = document.getElementById('editStartTime').value;
            const newEndDate = document.getElementById('editEndDate').value;
            const newEndTime = document.getElementById('editEndTime').value;
            const newStart = new Date(`${newStartDate}T${newStartTime}`);
            const newEnd = new Date(`${newEndDate}T${newEndTime}`);
            if (newEnd <= newStart) {
                showStatusMessage('End time must be after start time', 'danger');
                return;
            }
            try {
                await contract.methods.modifyElection(
                    electionId,
                    election.name,
                    election.description,
                    Math.floor(newStart.getTime() / 1000),
                    Math.floor(newEnd.getTime() / 1000)
                ).send({ from: account });
                showStatusMessage('Election timing updated successfully!', 'success');
                showDashboard();
            } catch (err) {
                showStatusMessage('Failed to update election: ' + err.message, 'danger');
            }
        });
    });
}

// Initialize the application when the page loads
window.addEventListener('load', init);