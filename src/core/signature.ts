import { ethers } from "ethers";
import { RevisionAquaChainResult } from "../models/library_models"
import { ProtocolLogs, ProtocolLogsType, Revision } from "../models/protocol_models"
import MerkleTree from "merkletreejs";
import { sha256Hasher } from "../utils/utils";

export async function verifySignature(signature: Revision): Promise<[boolean, ProtocolLogs[]]> {

    let isOk = false;
    let logs: ProtocolLogs[] = [];

    const cleanedLeaves = signature.leaves?.map(leaf =>
        typeof leaf === 'string' && leaf.startsWith('1220')
            ? leaf.slice(4)  // Remove first 4 characters ("1220")
            : leaf
    )
    // const tree = new MerkleTree(cleanedLeaves, getHashSum)

    const tree = new MerkleTree(cleanedLeaves as any, sha256Hasher, {
        duplicateOdd: false,
    });

    let verificationHash = tree.getHexRoot();

    let signatureOk = false
    if (verificationHash === "") {
        // The verificationHash MUST NOT be empty. This also implies that a genesis revision cannot
        // contain a signature.
        let log: ProtocolLogs = {
            log: "INVALID",
            log_type: ProtocolLogsType.ERROR
        }
        logs.push(log)
        return [signatureOk, logs]
    }

    // Signature verification
    switch (signature.signature_type) {
        case "did:key":
            // TODO
            // signatureOk = await did.signature.verify(data.signature, data.signature_public_key, verificationHash)
            break
        case "ethereum:eip-191":
            // The padded message is required
            const paddedMessage = `I sign the following page verification_hash: [0x${verificationHash}]`
            try {
                const recoveredAddress = ethers.recoverAddress(
                    ethers.hashMessage(paddedMessage),
                    signature.signature as any,
                )
                signatureOk =
                    recoveredAddress.toLowerCase() ===
                    signature.signature_wallet_address?.toLowerCase()
                let log: ProtocolLogs = {
                    log: signatureOk ? "VALID" : "INVALID",
                    log_type: ProtocolLogsType.INFO
                }
                logs.push(log)
            } catch (e) {
                // continue regardless of error
            }
            break
    }


    return [isOk, logs];
}
