const ethers = require('ethers');
require('dotenv').config();

// Load your private key securely
const privateKey = process.env.PRIVATE_KEY;
const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');

const wallet = new ethers.Wallet(privateKey, provider);

const tornadoAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const tornadoABI = /* ABI of the Tornado contract */;
const tornadoContract = new ethers.Contract(tornadoAddress, tornadoABI, wallet);

// Example function to interact with the contract
async function depositToTornado(commitment) {
    const tx = await tornadoContract.deposit(commitment);
    await tx.wait();
    console.log(`Transaction successful: ${tx.hash}`);
}
