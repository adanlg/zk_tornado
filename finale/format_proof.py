import json
import sys

def main():
    # Check if the correct number of arguments is passed
    if len(sys.argv) != 6:
        print("Usage: script.py <nullifierHash> <secret> <nullifier> <commitment> <txHash>")
        sys.exit(1)

    # Extract arguments
    nullifier_hash = sys.argv[1]
    secret = sys.argv[2]
    nullifier = sys.argv[3]
    commitment = sys.argv[4]
    tx_hash = sys.argv[5]

    # Create proof elements object
    proof_elements = {
        "nullifierHash": nullifier_hash,
        "secret": secret,
        "nullifier": nullifier,
        "commitment": commitment,
        "txHash": tx_hash
    }

    # Print the formatted JSON object
    print(json.dumps(proof_elements, indent=4))

if __name__ == "__main__":
    main()
