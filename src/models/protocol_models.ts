// Import necessary types if needed (adjust based on your setup)
// import { Revision } from './revision';

import { Timestamp } from "./library_models";

export interface AquaChain {
    file_index: Record<string, string>;
    revisions: Record<string, Revision>;
}

export interface Revision {
    previous_verification_hash: string;
    nonce: string;
    local_timestamp: string;
    revision_type: string;
    file_hash?: string | null;
    content?: string | null;
    link_type?: string | null;
    link_require_indepth_verification?: boolean | null;
    link_verification_hash?: string | null;
    link_uri?: string | null;
    signature?: string | null;
    signature_public_key?: string | null;
    signature_wallet_address?: string | null;
    signature_type?: string | null;
    witness_merkle_root?: string | null;
    witness_timestamp?: Timestamp | null;
    witness_network?: string | null;
    witness_smart_contract_address?: string | null;
    witness_transaction_hash?: string | null;
    witness_sender_account_address?: string | null;
    leaves?: string[] | null;
}

// Utility function to serialize a Revision object
export function toJSONWithoutNulls<T extends Record<string, any>>(obj: T): string {
    const filteredObj = Object.fromEntries(
        Object.entries(obj).filter(([_, value]) => value !== null)
    );
    return JSON.stringify(filteredObj);
}


export enum ProtocolLogsType {
    ERROR = "ERROR",
    WARNING = "WARNING",
    INFO = "INFO",
}

export interface ProtocolLogs {
    log: string;
    log_type: ProtocolLogsType;
}
