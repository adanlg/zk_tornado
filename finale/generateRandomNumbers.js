const crypto = require('crypto');

function generateRandomNumber(size) {
    // size is the number of digits in the random number
    // Generate a random byte and convert it to a decimal string
    // Repeat this process until the string reaches the desired size
    let randomNumber = '';
    while (randomNumber.length < size) {
        const randomByte = crypto.randomBytes(1).toString('hex');
        randomNumber += parseInt(randomByte, 16).toString();
    }
    // Trim the string to the exact size and return
    return randomNumber.slice(0, size);
}

// Example usage:
const size = 20; // size of the random number
const randomNumber = generateRandomNumber(size);
console.log('Random Number:', randomNumber);
