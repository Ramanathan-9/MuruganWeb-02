// Bitcoin Mining Simulator - Main JavaScript with Real Bitcoin Integration
class BitcoinMiner {
    constructor() {
        this.isMining = false;
        this.totalBTCFound = 0;
        this.btcPrice = 65000; // USD per BTC
        this.networkFee = 0.00001; // BTC
        this.miningInterval = null;
        this.progressInterval = null;
        this.currentProgress = 0;
        
        // Real Bitcoin integration
        this.bitcoinAPI = new BitcoinAPI();
        this.userWallet = null;
        this.realMode = true; // Enable real Bitcoin functionality
        this.miningWorker = null;
        this.realMiningActive = false;
        
        this.initializeElements();
        this.initializeRealBitcoin();
        this.updateBTCPrice();
        this.updateDisplay();
        
        // Update BTC price every 30 seconds with real data
        setInterval(() => this.updateBTCPrice(), 30000);
    }
    
    async initializeRealBitcoin() {
        try {
            // Wait for API keys to be loaded
            await this.bitcoinAPI.initializeAPIKeys();
            
            // Verify API keys are available
            if (!this.bitcoinAPI.blockcypherToken) {
                throw new Error('BlockCypher API key required for real Bitcoin functionality');
            }
            
            // Create or load user wallet
            const savedWallet = localStorage.getItem('bitcoinWallet');
            if (savedWallet) {
                this.userWallet = JSON.parse(savedWallet);
                this.showNotification('Bitcoin wallet loaded', 'success');
                this.updateWalletDisplay();
            } else {
                this.showNotification('Creating real Bitcoin wallet...', 'info');
                this.userWallet = await this.bitcoinAPI.createWallet();
                localStorage.setItem('bitcoinWallet', JSON.stringify(this.userWallet));
                this.showNotification(`Real Bitcoin wallet created: ${this.userWallet.address.substring(0, 15)}...`, 'success');
                this.updateWalletDisplay();
            }
            
            // Load real wallet balance from Bitcoin network
            await this.updateWalletBalance();
            
        } catch (error) {
            console.error('Real Bitcoin initialization failed:', error);
            this.showNotification(`Real Bitcoin mode failed: ${error.message}`, 'error');
            throw error; // Don't fall back to simulation
        }
    }
    
    updateWalletDisplay() {
        const walletAddressElement = document.getElementById('userWalletAddress');
        const walletModeElement = document.getElementById('walletMode');
        
        if (this.userWallet && this.realMode) {
            walletAddressElement.textContent = this.userWallet.address;
            walletModeElement.innerHTML = '🟢 Real Bitcoin Mode';
        } else {
            walletAddressElement.textContent = 'Simulation mode - no real wallet';
            walletModeElement.innerHTML = '🟡 Simulation Mode';
        }
    }
    
    async updateWalletBalance() {
        if (!this.realMode || !this.userWallet) return;
        
        try {
            const balance = await this.bitcoinAPI.getWalletBalance(this.userWallet.address);
            this.totalBTCFound = balance.balance + balance.unconfirmed;
            this.updateDisplay();
        } catch (error) {
            console.error('Error updating wallet balance:', error);
        }
    }
    
    initializeElements() {
        this.elements = {
            statusDot: document.getElementById('statusDot'),
            miningStatus: document.getElementById('miningStatus'),
            mineBtn: document.getElementById('mineBtn'),
            btcFound: document.getElementById('btcFound'),
            progressFill: document.getElementById('progressFill'),
            progressText: document.getElementById('progressText'),
            btcBtn: document.getElementById('btcBtn'),
            usdBtn: document.getElementById('usdBtn'),
            btcButtonText: document.getElementById('btcButtonText'),
            usdButtonText: document.getElementById('usdButtonText'),
            walletAddress: document.getElementById('walletAddress'),
            transferAmount: document.getElementById('transferAmount'),
            networkFee: document.getElementById('networkFee'),
            transferUSD: document.getElementById('transferUSD'),
            transferBtn: document.getElementById('transferBtn'),
            historyList: document.getElementById('historyList')
        };
        
        // Add event listeners
        this.elements.transferAmount.addEventListener('input', () => this.updateTransferInfo());
        this.elements.walletAddress.addEventListener('input', () => this.validateTransfer());
    }
    
    async updateBTCPrice() {
        try {
            if (this.realMode) {
                // Get real Bitcoin price from market data
                this.btcPrice = await this.bitcoinAPI.getRealBTCPrice();
                this.updateDisplay();
            } else {
                // Fallback to simulation if real mode fails
                const fluctuation = (Math.random() - 0.5) * 2000;
                this.btcPrice = Math.max(30000, Math.min(100000, this.btcPrice + fluctuation));
                this.updateDisplay();
            }
        } catch (error) {
            console.error('Error updating BTC price:', error);
        }
    }
    
    async startMining() {
        if (this.realMiningActive) {
            this.stopMining();
            return;
        }
        
        if (!this.userWallet || !this.bitcoinAPI.blockcypherToken) {
            this.showNotification('Real Bitcoin wallet and API key required for mining', 'error');
            return;
        }
        
        this.realMiningActive = true;
        this.currentProgress = 0;
        
        // Update UI for real mining state
        this.elements.statusDot.classList.add('active');
        this.elements.miningStatus.textContent = 'Real Bitcoin Mining Active...';
        this.elements.mineBtn.textContent = 'Stop Mining';
        this.elements.mineBtn.classList.add('mining');
        
        try {
            this.showNotification('Connecting to Bitcoin network for mining...', 'info');
            
            // Start real Bitcoin mining with Web Workers
            this.miningWorker = await this.bitcoinAPI.startRealMining(
                this.userWallet.address,
                (progress) => this.onMiningProgress(progress),
                (result) => this.onMiningSuccess(result)
            );
            
            this.addHistoryItem('Mining', 'Real Bitcoin mining started', 'now');
            
        } catch (error) {
            console.error('Real mining failed to start:', error);
            this.showNotification(`Mining failed: ${error.message}`, 'error');
            this.stopMining();
        }
    }
    
    stopMining() {
        this.realMiningActive = false;
        
        // Stop real mining worker
        if (this.miningWorker) {
            this.miningWorker.terminate();
            this.miningWorker = null;
        }
        
        // Clear simulation intervals if any
        clearInterval(this.miningInterval);
        clearInterval(this.progressInterval);
        
        // Reset UI
        this.elements.statusDot.classList.remove('active');
        this.elements.miningStatus.textContent = 'Mining Stopped';
        this.elements.mineBtn.textContent = 'Start Mining';
        this.elements.mineBtn.classList.remove('mining');
        
        this.currentProgress = 0;
        this.elements.progressFill.style.width = '0%';
        this.elements.progressText.textContent = '0%';
        
        this.addHistoryItem('Mining', 'Real Bitcoin mining stopped', 'now');
    }
    
    // Real mining progress callback
    onMiningProgress(progress) {
        const { hash, nonce, attempts } = progress;
        
        // Update progress based on attempts
        const progressPercent = (attempts % 1000000) / 10000; // Show progress over 1M attempts
        this.currentProgress = Math.min(progressPercent, 99);
        
        this.elements.progressFill.style.width = `${this.currentProgress}%`;
        this.elements.progressText.textContent = `${this.currentProgress.toFixed(1)}% - ${attempts.toLocaleString()} hashes`;
        
        // Show current hash being worked on
        this.elements.miningStatus.textContent = `Mining: ${hash.substring(0, 16)}...`;
    }
    
    // Real mining success callback
    async onMiningSuccess(result) {
        const { hash, nonce, blockHeight, reward, address } = result;
        
        // Add mined Bitcoin to wallet
        this.totalBTCFound += reward;
        this.updateDisplay();
        
        // Show success notification
        this.showNotification(`Block found! Earned ${reward} BTC`, 'success');
        
        // Add to transaction history
        this.addHistoryItem('Mining', `+${reward} BTC (Block ${blockHeight})`, 'now');
        
        // Update wallet balance from network
        await this.updateWalletBalance();
        
        // Reset mining progress
        this.currentProgress = 100;
        this.elements.progressFill.style.width = '100%';
        this.elements.progressText.textContent = `Block found! Nonce: ${nonce}`;
        
        // Continue mining for next block
        setTimeout(() => {
            if (this.realMiningActive) {
                this.startMining();
            }
        }, 2000);
    }
    
    simulateMining() {
        // Random chance to find BTC (realistic mining simulation)
        const findChance = Math.random();
        
        if (findChance < 0.15) { // 15% chance per second
            const btcFound = this.generateRandomBTC();
            this.totalBTCFound += btcFound;
            
            // Animate the BTC found display
            this.elements.btcFound.classList.add('btc-found-animation');
            setTimeout(() => {
                this.elements.btcFound.classList.remove('btc-found-animation');
            }, 800);
            
            this.updateDisplay();
            this.addHistoryItem('Mining', `+${btcFound.toFixed(8)} BTC`, 'now');
        }
    }
    
    generateRandomBTC() {
        // Generate realistic random BTC amounts
        const scenarios = [
            { amount: () => Math.random() * 0.00001, weight: 60 },     // Very small: 0.00000001-0.00001
            { amount: () => Math.random() * 0.0001, weight: 25 },      // Small: 0.00001-0.0001
            { amount: () => Math.random() * 0.001, weight: 10 },       // Medium: 0.0001-0.001
            { amount: () => Math.random() * 0.01, weight: 4 },         // Large: 0.001-0.01
            { amount: () => Math.random() * 0.1, weight: 1 }           // Very large: 0.01-0.1
        ];
        
        const totalWeight = scenarios.reduce((sum, scenario) => sum + scenario.weight, 0);
        const random = Math.random() * totalWeight;
        
        let currentWeight = 0;
        for (const scenario of scenarios) {
            currentWeight += scenario.weight;
            if (random <= currentWeight) {
                return scenario.amount();
            }
        }
        
        return scenarios[0].amount(); // Fallback
    }
    
    updateProgress() {
        if (!this.isMapping) return;
        
        this.currentProgress += Math.random() * 2; // Random progress increment
        if (this.currentProgress > 100) {
            this.currentProgress = 0; // Reset for continuous mining
        }
        
        this.elements.progressFill.style.width = `${this.currentProgress}%`;
        this.elements.progressText.textContent = `${Math.floor(this.currentProgress)}%`;
    }
    
    updateDisplay() {
        // Update BTC display
        this.elements.btcFound.textContent = this.totalBTCFound.toFixed(8);
        
        // Update button texts
        this.elements.btcButtonText.textContent = `${this.totalBTCFound.toFixed(8)} BTC`;
        this.elements.usdButtonText.textContent = `$${(this.totalBTCFound * this.btcPrice).toFixed(2)} USD`;
        
        // Update network fee
        this.elements.networkFee.textContent = `${this.networkFee.toFixed(8)} BTC`;
        
        // Update transfer info
        this.updateTransferInfo();
    }
    
    showBTCAmount() {
        // Animate BTC button
        this.elements.btcBtn.style.transform = 'scale(1.1)';
        setTimeout(() => {
            this.elements.btcBtn.style.transform = 'scale(1)';
        }, 200);
        
        // Show notification
        this.showNotification(`You have ${this.totalBTCFound.toFixed(8)} BTC`, 'success');
    }
    
    showUSDAmount() {
        // Animate USD button
        this.elements.usdBtn.style.transform = 'scale(1.1)';
        setTimeout(() => {
            this.elements.usdBtn.style.transform = 'scale(1)';
        }, 200);
        
        const usdValue = (this.totalBTCFound * this.btcPrice).toFixed(2);
        this.showNotification(`Your BTC is worth $${usdValue} USD`, 'success');
    }
    
    setMaxAmount() {
        const maxAmount = Math.max(0, this.totalBTCFound - this.networkFee);
        this.elements.transferAmount.value = maxAmount.toFixed(8);
        this.updateTransferInfo();
    }
    
    updateTransferInfo() {
        const amount = parseFloat(this.elements.transferAmount.value) || 0;
        const usdValue = (amount * this.btcPrice).toFixed(2);
        this.elements.transferUSD.textContent = `$${usdValue}`;
        this.validateTransfer();
    }
    
    validateTransfer() {
        const amount = parseFloat(this.elements.transferAmount.value) || 0;
        const address = this.elements.walletAddress.value.trim();
        const totalRequired = amount + this.networkFee;
        
        let isValid = true;
        let errorMessage = '';
        
        if (!address) {
            isValid = false;
            errorMessage = 'Please enter a wallet address';
        } else if (!this.isValidBitcoinAddress(address)) {
            isValid = false;
            errorMessage = 'Invalid Bitcoin address format';
        } else if (amount <= 0) {
            isValid = false;
            errorMessage = 'Amount must be greater than 0';
        } else if (totalRequired > this.totalBTCFound) {
            isValid = false;
            errorMessage = `Insufficient balance. Required: ${totalRequired.toFixed(8)} BTC`;
        }
        
        this.elements.transferBtn.disabled = !isValid;
        this.elements.transferBtn.textContent = isValid ? 'Transfer Bitcoin' : errorMessage;
    }
    
    isValidBitcoinAddress(address) {
        if (this.realMode) {
            return this.bitcoinAPI.validateAddress(address);
        } else {
            // Basic Bitcoin address validation for simulation mode
            const legacyPattern = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
            const segwitPattern = /^bc1[a-z0-9]{39,59}$/;
            const testnetPattern = /^[2mn][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
            
            return legacyPattern.test(address) || segwitPattern.test(address) || testnetPattern.test(address);
        }
    }
    
    async initiateTransfer() {
        const amount = parseFloat(this.elements.transferAmount.value);
        const address = this.elements.walletAddress.value.trim();
        
        if (!amount || !address) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }
        
        // Disable transfer button during processing
        this.elements.transferBtn.disabled = true;
        this.elements.transferBtn.innerHTML = '<div class="loading"></div> Processing...';
        
        try {
            // Simulate transfer processing
            await this.processTransfer(amount, address);
            
            // Update balance
            this.totalBTCFound -= (amount + this.networkFee);
            this.updateDisplay();
            
            // Show success message
            this.showNotification(`Successfully transferred ${amount.toFixed(8)} BTC`, 'success');
            
            // Add to history
            this.addHistoryItem('Transfer', `-${amount.toFixed(8)} BTC`, 'now');
            
            // Reset form
            this.elements.transferAmount.value = '';
            this.elements.walletAddress.value = '';
            
        } catch (error) {
            this.showNotification('Transfer failed. Please try again.', 'error');
        } finally {
            this.elements.transferBtn.disabled = false;
            this.elements.transferBtn.textContent = 'Transfer Bitcoin';
        }
    }
    
    async processTransfer(amount, address) {
        if (this.realMode && this.userWallet) {
            try {
                // Real Bitcoin transaction using BlockCypher API
                this.showNotification('Broadcasting transaction to Bitcoin network...', 'info');
                
                const result = await this.bitcoinAPI.sendBitcoin(
                    this.userWallet.address,
                    address,
                    amount,
                    this.userWallet.private
                );
                
                if (result.success) {
                    this.showNotification(`Transaction broadcast! TXID: ${result.txid.substring(0, 10)}...`, 'success');
                    return { txid: result.txid, amount, address, fee: result.fee };
                } else {
                    throw new Error(result.error || 'Transaction failed');
                }
            } catch (error) {
                console.error('Real transfer failed:', error);
                throw error;
            }
        } else {
            // Fallback simulation mode
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
            
            if (Math.random() < 0.05) {
                throw new Error('Transfer failed');
            }
            
            const txid = this.generateTransactionId();
            console.log(`Simulated transfer: ${amount} BTC to ${address} - TXID: ${txid}`);
            
            return { txid, amount, address };
        }
    }
    
    generateTransactionId() {
        const chars = '0123456789abcdef';
        let txid = '';
        for (let i = 0; i < 64; i++) {
            txid += chars[Math.floor(Math.random() * chars.length)];
        }
        return txid;
    }
    
    addHistoryItem(type, amount, time) {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const timestamp = time === 'now' ? new Date().toLocaleTimeString() : time;
        
        historyItem.innerHTML = `
            <span class="history-type">${type}</span>
            <span class="history-amount">${amount}</span>
            <span class="history-time">${timestamp}</span>
        `;
        
        // Add to top of history list
        const firstItem = this.elements.historyList.firstChild;
        if (firstItem) {
            this.elements.historyList.insertBefore(historyItem, firstItem);
        } else {
            this.elements.historyList.appendChild(historyItem);
        }
        
        // Keep only last 10 items
        const items = this.elements.historyList.children;
        if (items.length > 10) {
            this.elements.historyList.removeChild(items[items.length - 1]);
        }
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 'bold',
            zIndex: '1000',
            transform: 'translateX(400px)',
            transition: 'transform 0.3s ease'
        });
        
        // Set background color based on type
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            info: '#2196f3'
        };
        notification.style.background = colors[type] || colors.info;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Global functions for HTML onclick events
let miner;

function startMining() {
    miner.startMining();
}

function showBTCAmount() {
    miner.showBTCAmount();
}

function showUSDAmount() {
    miner.showUSDAmount();
}

function setMaxAmount() {
    miner.setMaxAmount();
}

function initiateTransfer() {
    miner.initiateTransfer();
}

// Utility function to copy wallet address
function copyWalletAddress() {
    const addressElement = document.getElementById('userWalletAddress');
    const address = addressElement.textContent;
    
    if (address && address !== 'Generating wallet...' && address !== 'Simulation mode - no real wallet') {
        navigator.clipboard.writeText(address).then(() => {
            miner.showNotification('Wallet address copied!', 'success');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = address;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            miner.showNotification('Wallet address copied!', 'success');
        });
    }
}

// Initialize the Bitcoin miner when page loads
document.addEventListener('DOMContentLoaded', function() {
    miner = new BitcoinMiner();
});

// Add some additional styling for notifications
const style = document.createElement('style');
style.textContent = `
    .notification {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border-left: 4px solid rgba(255, 255, 255, 0.3);
    }
    
    .notification.success {
        border-left-color: #81c784;
    }
    
    .notification.error {
        border-left-color: #e57373;
    }
    
    .notification.info {
        border-left-color: #64b5f6;
    }
`;
document.head.appendChild(style);