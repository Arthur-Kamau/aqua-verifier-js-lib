import { ethers } from "ethers";
import { ProtocolLogs, ProtocolLogsType, Revision } from "../models/protocol_models"
import { nip19 } from 'nostr-tools'; // Assuming you're using the `nostr-tools` library
import { Relay } from 'nostr-tools'; // Adjust imports based on your Nostr library

const verifyEth = async (
    ethNetwork: string,
    transactionHash: string,
    expectedMR: string,
    expectedTimestamp: number,
): Promise<string> => {
    const provider = ethers.getDefaultProvider(ethNetwork);
    // const provider = new ethers.JsonRpcProvider(endpoint);
    const tx = await provider.getTransaction(transactionHash);

    if (!tx) return "NOT FOUND";

    // TODO: Verify
    // tx.from
    // tx.signature

    // Timestamp checking is disabled because too expensive
    // const block = await tx.getBlock();
    // if (block.timestamp !== expectedTimestamp)
    //   return `TIMESTAMP MISMATCH: ${block.timestamp} vs ${expectedTimestamp}`;

    let actual = tx.data.split("0x9cef4ea1")[1];
    actual = actual.slice(0, 128);

    // Sleep for 200ms to avoid overloading the free endpoint
    await new Promise(resolve => setTimeout(resolve, 200));

    const mrSans0x = expectedMR.startsWith("0x") ? expectedMR.slice(2) : expectedMR;
    return `${actual === mrSans0x}`;
};

const relayUrl = 'wss://relay.damus.io'

// const verifyNostr = async (
//   transactionHash: string,
//   expectedMR: string,
//   expectedTimestamp: number,
// ): Promise<boolean> => {
//   // Decode the transaction hash using nip19
//   const { type, data } = nip19.decode(transactionHash);

//   // Ensure the decoded type is "nevent"
//   if (type !== "nevent") {
//     return false;
//   }

//   // Connect to the Nostr relay
//   const relay = await Relay.connect(relayUrl);

//   // Wait for the event with the given ID
//   const publishEvent = await waitForEventId(relay, data.id);

//   // Close the relay connection
//   relay.close();

//   // Verify the event's timestamp matches the expected timestamp
//   if (expectedTimestamp !== publishEvent.created_at) {
//     return false;
//   }

//   // Verify the Merkle root in the event's content matches the expected MR
//   const merkleRoot = publishEvent.content;
//   return merkleRoot === expectedMR;
// };

// // Helper function to wait for an event by ID (assuming it exists in your codebase)
// const waitForEventId = async (relay: Relay, eventId: string): Promise<any> => {
//   // Implement logic to wait for and return the event with the given ID
//   // This is a placeholder and should be replaced with actual logic
//   return new Promise((resolve) => {
//     relay.subscribe([{ ids: [eventId] }], (event: any) => {
//       resolve(event);
//     });
//   });
// };

// Example usage
// verify("nevent1...", "expectedMerkleRoot", 1234567890).then(console.log);



export async function verifyWitness(witness: Revision, doVerifyMerkleProof: boolean): Promise<[boolean, ProtocolLogs[]]> {

    let isOk = false;
    let logs: ProtocolLogs[] = [];

    if (witness.witness_network === "nostr") {
        // TODO
    }

    else if (witness.witness_network === "TSA_RFC3161") {
        // TODOD
    }

    else {
        const _result = await verifyEth(
            `${witness.witness_network}`,
            `${witness.witness_transaction_hash}`,
            `${witness.witness_merkle_root}`,
            witness.witness_timestamp as any,
        )
        let log: ProtocolLogs = {
            log_type: ProtocolLogsType.INFO,
            log: "Successful"
        }
        if (_result === 'true') {
            logs.push(log)
            isOk = _result === 'true'
        }
        if (_result === 'false') {
            log.log = "Verification hashes mismatch"
            log.log_type = ProtocolLogsType.ERROR
            logs.push(log)
            isOk = false
        }
        else{
            log.log = "Transaction not found"
            log.log_type = ProtocolLogsType.ERROR
            logs.push(log)
            isOk = false
        }
    }

    return [isOk, logs];
}
