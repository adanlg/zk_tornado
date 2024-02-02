const { ethers } = require("hardhat");
const $u = require('/home/adanlg2/zero-knowledge/NFTA-Tornado-Resources/finale/frontend/utils/$u.js'); // Make sure the path is correct
const wc = require("/home/adanlg2/zero-knowledge/NFTA-Tornado-Resources/finale/frontend/circuit/witness_calculator.js"); // Adjust the path if needed
const fs = require('fs').promises; // Node.js File System module for reading files


async function main() {
    try {
        const secret = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString();
        const nullifier = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString();
        console.log("Secret generated:", secret);
        console.log("Nullifier generated:", nullifier);

        const input = {
            secret: $u.BN256ToBin(secret).split(""),
            nullifier: $u.BN256ToBin(nullifier).split("")
        };
        console.log("Input prepared:", input);

        var buffer = await fs.readFile("/home/adanlg2/zero-knowledge/NFTA-Tornado-Resources/finale/circuit/deposit_js/deposit.wasm");
        var depositWC = await wc(buffer);

        const r = await depositWC.calculateWitness(input, 0);
        console.log("Witness calculated:", r);

        const commitment = r[1];
        console.log("Commitment:", commitment);

        const nullifierHash = r[2];
        console.log("NullifierHash:", nullifierHash);
    } catch (error) {
        console.error("Error:", error);
    }
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});

