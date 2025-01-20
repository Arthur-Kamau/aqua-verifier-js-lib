import { ProtocolLogs, Revision } from "../models/protocol_models"


export async function verifyWitness(witness: Revision,     doVerifyMerkleProof: boolean): Promise<[boolean,  ProtocolLogs[]]> {

        let isOk = false;
        let logs: ProtocolLogs[] = [];
    

    return [isOk, logs];
}
