import { RevisionAquaChainResult } from "../models/library_models"
import { ProtocolLogs, Revision } from "../models/protocol_models"

export async function  verifySignature(signature: Revision): Promise <[boolean, ProtocolLogs[]] > {

    let isOk = false;
    let logs: ProtocolLogs[] = [];


    return [isOk, logs];
}
