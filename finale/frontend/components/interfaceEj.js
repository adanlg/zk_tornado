import { ethers } from "ethers";

const getCommitment = async () => {
    updateDepositButtonState(ButtonState.Disabled);

    const secret = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString();
    const nullifier = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString();

    const input = {
        secret: $u.BN256ToBin(secret).split(""),
        nullifier: $u.BN256ToBin(nullifier).split("")
    };

    var res = await fetch("/deposit.wasm");
    var buffer = await res.arrayBuffer();
    var depositWC = await wc(buffer);

    const r = await depositWC.calculateWitness(input, 0);
    
    const commitment = r[1];
    const nullifierHash = r[2];

    const value = ethers.BigNumber.from("100000000000000000").toHexString();

    const tx = {
        to: tornadoAddress,
        from: account.address,
        value: value,
        data: tornadoInterface.encodeFunctionData("deposit", [commitment])
    };
} 