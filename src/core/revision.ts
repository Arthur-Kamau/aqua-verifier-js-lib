import { RevisionVerificationResult, ResultStatus, ResultStatusEnum, RevisionAquaChainResult, AquaChainResult } from "../models/library_models";
import { AquaChain, ProtocolLogs, ProtocolLogsType, Revision } from "../models/protocol_models";
import { dict2Leaves, getHashSum, getTimestamp, prepareNonce, sha256Hasher } from "../utils/utils";
import { MerkleTree } from "merkletreejs"


export function generateGenesisRevisionUtil(file_name: string, file_data: string): AquaChainResult {
    let logs: Array<ProtocolLogs> = []
    let result: AquaChainResult = {
        isSuccessful: false,
        logs: [],
        aquaChain: null
    }

    let file_hash_data = getHashSum(file_data);

    let genesisRevision: Revision = {
        previous_verification_hash: "",
        nonce: prepareNonce(),
        local_timestamp: getTimestamp(),
        revision_type: "file_hash",
        file_hash: file_hash_data

    }

    // Merklelize the dictionary
    const leaves = dict2Leaves(genesisRevision);
    // Clean up leaves by removing "1220" prefix if present
    const cleanedLeaves = leaves.map(leaf =>
        typeof leaf === 'string' && leaf.startsWith('1220')
            ? leaf.slice(4)  // Remove first 4 characters ("1220")
            : leaf
    )

    const tree = new MerkleTree(cleanedLeaves, sha256Hasher, {
        duplicateOdd: false,
    });


    genesisRevision.leaves = leaves

    let verification_hash = tree.getHexRoot()


    let chain: AquaChain = {
        file_index: {
            file_hash_data: file_name

        },
        revisions: {
            [verification_hash]: genesisRevision
        }
    }


    result.aquaChain = chain;
    result.logs = logs;
    return result;
}

export function generateContentRevision(aqua_chain: AquaChain, file_name: string, file_data: string): AquaChainResult {
    let logs: Array<ProtocolLogs> = []
    let result: AquaChainResult = {
        isSuccessful: false,
        logs: [],
        aquaChain: null
    }


    let revision: Revision = {
        previous_verification_hash: "",
        nonce: prepareNonce(),
        local_timestamp: getTimestamp(),
        revision_type: "content"
    }

    revision.content = file_data


    // Merklelize the dictionary
    const leaves = dict2Leaves(revision);
    // Clean up leaves by removing "1220" prefix if present
    const cleanedLeaves = leaves.map(leaf =>
        typeof leaf === 'string' && leaf.startsWith('1220')
            ? leaf.slice(4)  // Remove first 4 characters ("1220")
            : leaf
    )

    const tree = new MerkleTree(cleanedLeaves, sha256Hasher, {
        duplicateOdd: false,
    });


    revision.leaves = leaves

    let verification_hash = tree.getHexRoot()


    aqua_chain.revisions[verification_hash] = revision;


    result.aquaChain = aqua_chain;
    result.logs = logs;
    return result;
}

export function generateScalaRevision(aqua_chain: AquaChain, file_data: string): AquaChainResult {

    let logs: Array<ProtocolLogs> = []
    let result: AquaChainResult = {
        isSuccessful: false,
        logs: [],
        aquaChain: null
    }

    let revision: Revision = {
        previous_verification_hash: "",
        nonce: prepareNonce(),
        local_timestamp: getTimestamp(),
        revision_type: "file_hash",
        file_hash: aqua_chain.revisions[Object.keys(aqua_chain.revisions)[0]].file_hash

    }

    // Get the existing revisions and add the new revision
    let revision_in_chain = aqua_chain.revisions;
    let verification_hash = "0x" + getHashSum(JSON.stringify(revision));
    revision_in_chain[verification_hash] = revision;

    let chain = aqua_chain;
    chain.revisions = revision_in_chain;


    result.aquaChain = chain;
    result.logs = logs;
    return result;
}

export function removeLastRevision(aqua_chain: AquaChain): AquaChainResult {

    let logs: Array<ProtocolLogs> = []
    let result: AquaChainResult = {
        isSuccessful: false,
        logs: [],
        aquaChain: null
    }


    // Check if there are more than one revision
    if (Object.keys(aqua_chain.revisions).length > 1) {
        const newChain = { ...aqua_chain }; // Clone the AquaChain
        const revisions = { ...aqua_chain.revisions }; // Clone revisions

        // Get the last revision
        const revisionKeys = Object.keys(revisions);
        const lastKey = revisionKeys[revisionKeys.length - 1];

        if (lastKey) {
            // Remove the last revision
            delete revisions[lastKey];
            newChain.revisions = revisions;

            // Add a log for the removed revision
            logs.push({
                log: `Removed revision with hash: ${lastKey}`,
                log_type: ProtocolLogsType.INFO
            });

            // Update result
            result.isSuccessful = true;
            result.aquaChain = newChain;
        } else {
            // Add a log if no revisions to remove
            logs.push({
                log: "No revisions to remove",
                log_type: ProtocolLogsType.ERROR
            });
        }
    } else {
        // Add a log if trying to delete the genesis revision
        logs.push({
            log: "Cannot delete file hash (genesis revision)",
            log_type: ProtocolLogsType.ERROR
        });
    }


    result.logs = logs;
    return result;
}


export async function verifyAquaChain(aquaChain: AquaChain, alchemyKey: string, doAlchemyKeyLookUp: boolean): Promise<RevisionAquaChainResult> {

    const hashChainResult: RevisionAquaChainResult = {
        successful: true,
        revisionResults: []
    }

    const revisionHashes = Object.keys(aquaChain.revisions);

    for (let j = 0; j < revisionHashes.length; j++) {
        const revision = aquaChain.revisions[revisionHashes[j]]
        const revisionResult: RevisionVerificationResult = await verifyRevision(revision, alchemyKey, doAlchemyKeyLookUp)
        hashChainResult.revisionResults.push(revisionResult)
    }

    for (let i = 0; i < hashChainResult.revisionResults.length; i++) {
        const revisionResult = hashChainResult.revisionResults[i];
        if (!revisionResult.successful) {
            hashChainResult.successful = false
            break;
        }
    }
    return Promise.resolve(hashChainResult);
}


export async function verifyRevision(revision: Revision, alchemyKey: string, doAlchemyKeyLookUp: boolean): Promise<RevisionVerificationResult> {
    let defaultResultStatus: ResultStatus = {
        status: ResultStatusEnum.MISSING,
        successful: false,
        message: ""
    }

    let revisionResult: RevisionVerificationResult = {
        successful: false,
        file_verification: JSON.parse(JSON.stringify(defaultResultStatus)),
        content_verification: JSON.parse(JSON.stringify(defaultResultStatus)),
        witness_verification: JSON.parse(JSON.stringify(defaultResultStatus)),
        signature_verification: JSON.parse(JSON.stringify(defaultResultStatus)),
        metadata_verification: JSON.parse(JSON.stringify(defaultResultStatus))
    }

    // const [fileIsCorrect, fileOut] = verifyFileUtil(revision.content);
    // revisionResult.file_verification.status = ResultStatusEnum.AVAILABLE;
    // revisionResult.file_verification.successful = fileIsCorrect;
    // revisionResult.file_verification.message = fileOut.error_message ?? "";

    // Verify Content
    // let [verifyContentIsOkay, resultMessage] = verifyContentUtil(revision.content);
    // revisionResult.content_verification.status = ResultStatusEnum.AVAILABLE;
    // revisionResult.content_verification.successful = verifyContentIsOkay;
    // revisionResult.content_verification.message = resultMessage;

    // // Verify Metadata 
    // let [metadataOk, metadataHashMessage] = verifyMetadataUtil(revision.metadata);
    // revisionResult.metadata_verification.status = ResultStatusEnum.AVAILABLE;
    // revisionResult.metadata_verification.successful = metadataOk;
    // revisionResult.metadata_verification.message = metadataHashMessage;

    // // Verify Signature
    // if (revision.signature) {
    //     let [signatureOk, signatureMessage] = verifySignatureUtil(revision.signature, revision.metadata.previous_verification_hash ?? "");
    //     revisionResult.signature_verification.status = ResultStatusEnum.AVAILABLE;
    //     revisionResult.signature_verification.successful = signatureOk;
    //     revisionResult.signature_verification.message = signatureMessage;
    // }

    // // Verify Witness (asynchronous)
    // if (revision.witness) {
    //     try {
    //         const [success, message] = await verifyWitnessUtil(
    //             revision.witness,
    //             revision.metadata.previous_verification_hash ?? "",
    //             revision.witness.structured_merkle_proof.length > 1,
    //             alchemyKey,
    //             doAlchemyKeyLookUp

    //         );
    //         revisionResult.witness_verification.status = ResultStatusEnum.AVAILABLE;
    //         revisionResult.witness_verification.successful = success;
    //         revisionResult.witness_verification.message = message // message if needed
    //     } catch (err) {
    //         console.log("Witnessing error: ", err);
    //     }
    // }

    // Check the overall status
    let allSuccessful = true;
    for (const verification of Object.values(revisionResult)) {
        if (verification.status === ResultStatusEnum.AVAILABLE && !verification.successful) {
            allSuccessful = false;
            break;
        }
    }

    // Update the overall successful status
    revisionResult.successful = allSuccessful;

    return revisionResult;
}
