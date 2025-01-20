
import { ProtocolLogs , AquaChain} from './protocol_models'; 

export interface AquaChainResult {
    isSuccessful: boolean;
    logs: ProtocolLogs[];
    aquaChain?: AquaChain | null;
}


export interface Timestamp {
    seconds: number;
    nanos: number;
}


export interface RevisionAquaChainResult {
    successful: boolean,
    logs: ProtocolLogs[],
    revisionResults : Array<RevisionAquaChainResult>
    
}

export interface FileData {
    file_hash: string,
    file_name: string,
    file_content: string,
}



export interface VerifyFileResult {
    error_message: string | null,
    file_hash: string | null
}

export interface MerkleNode{
    left_leaf: string,
    right_leaf: string,
    successor: string,
}

export interface CheckEtherScanResult {
    verificationHashMatches: boolean
    message: string
    successful: boolean
}