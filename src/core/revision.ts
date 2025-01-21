import { RevisionAquaChainResult, AquaChainResult, FileData } from "../models/library_models";
import { AquaChain, ProtocolLogs, ProtocolLogsType, Revision } from "../models/protocol_models";
import { dict2Leaves, getHashSum, getTimestamp, prepareNonce, sha256Hasher } from "../utils/utils";
import { MerkleTree } from "merkletreejs"
import { verifySignature } from "./signature";
import { verifyWitness } from "./witness";


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


    // Merklelize the dictionarfile_indexy
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

export function generateScalaRevision(aqua_chain: AquaChain): AquaChainResult {

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


export async function verifyAquaChain(aquaChain: AquaChain, linkedRevisions: Array<AquaChain>, fileData: Array<FileData>): Promise<RevisionAquaChainResult> {

    const hashChainResult: RevisionAquaChainResult = {
        successful: false,
        logs: [],
        revisionResults: []
    }

    const revisionHashes = Object.keys(aquaChain.revisions);

    for (let j = 0; j < revisionHashes.length; j++) {
        const revision = aquaChain.revisions[revisionHashes[j]]
        const revisionResult: RevisionAquaChainResult = await verifyRevision(revision, linkedRevisions, fileData)
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


export async function verifyRevision(revision: Revision, linkedChains: Array<AquaChain>, fileData: Array<FileData>): Promise<RevisionAquaChainResult> {



    let logs: ProtocolLogs[] = [];
    let hashChainResult: RevisionAquaChainResult = {
        successful: false,
        logs: [],
        revisionResults: []
    }


    logs.push({
        log:`revision is of type  ${revision.revision_type}   `,
        log_type: ProtocolLogsType.INFO
    })

    let typeOk: boolean = false
    switch (revision.revision_type) {

        case "content":
            typeOk = true
            break
        case "file_hash":
            const fileContent = fileData.find((file) => file.file_hash === revision.file_hash)
            if (fileContent == undefined) {
                logs.push({
                    log: ` file hash not found file hash: ${revision.file_hash}`,
                    log_type: ProtocolLogsType.INFO
                });

                break;
            }

            const fileHash = getHashSum(fileContent?.file_content!!)
            console.log(`Found file hash: ${fileHash}, Original file hash: ${revision.file_hash}`)
            typeOk = fileHash === revision.file_hash
            break
        case "signature":
            // Verify signature
            let [ok, logs_data] = await verifySignature(
                revision,
            )
            logs = logs.concat(logs_data)
            typeOk = ok
            break
        case "witness":
            // Verify witness
            // witness merkle proof verification is not implemented
            // its to be improved in future
            let [ok2, logs_data2] = await verifyWitness(
                revision,
                false,
            )
            logs = logs.concat(logs_data2)
            typeOk = ok2
            break
        case "link":

            let chain = undefined;

            for (const element of linkedChains) {
                // Get the keys of file_index
                const keys = Object.keys(element.file_index);

                // Access the first key
                const firstKey = keys[0];

                if (firstKey) {
                    // Use the key to get the corresponding value
                    const fileName = element.file_index[firstKey];
                    console.log("File Name:", fileName); // Output: "name.md"


                    if (revision.link_uri == fileName) {
                        chain = element;
                        break;
                    }
                } else {
                    console.log("file_index is empty");
                }

            }

            if (chain!=undefined){
              let result =  await  verifyAquaChain(chain, linkedChains, fileData);

              logs.push({
                log:`chain linked  ${revision.link_uri} verification  is ${result.successful ? "successfull" : "not successfull"} `,
                log_type: ProtocolLogsType.INFO
            })

              typeOk =  result.successful;
              result.logs.forEach((item)=>logs.push(item));

            }else{
                typeOk = false;
                logs.push({
                    log:`chain linked in revision ${revision.link_uri} not found`,
                    log_type: ProtocolLogsType.ERROR
                })
            }
            
            break

    }

    hashChainResult.successful = typeOk;
    hashChainResult.logs = logs;
    return hashChainResult;

}

