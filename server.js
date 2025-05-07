const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use('/build', express.static(path.join(__dirname, 'build')));

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin_dashboard.html'));
});

app.get('/voter', (req, res) => {
    res.sendFile(path.join(__dirname, 'voter_dashboard.html'));
});

app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin_login.html'));
});

app.get('/voter-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'voter_login.html'));
});

// Catch-all route for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server with error handling
const server = app.listen(port, () => {
    console.log('\n✓ Server is running on:');
    console.log(`➜ Local:   http://localhost:${port}`);
}).on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please try a different port or kill the process using that port.`);
    } else {
        console.error('Error starting server:', error);
    }
    process.exit(1);
}); 