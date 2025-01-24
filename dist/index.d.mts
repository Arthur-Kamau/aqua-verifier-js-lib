interface AquaChain {
    file_index: Record<string, string>;
    revisions: Record<string, Revision>;
}
interface Revision {
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
declare enum ProtocolLogsType {
    ERROR = "ERROR",
    WARNING = "WARNING",
    INFO = "INFO"
}
interface ProtocolLogs {
    log: string;
    log_type: ProtocolLogsType;
}

interface AquaChainResult {
    isSuccessful: boolean;
    logs: ProtocolLogs[];
    aquaChain?: AquaChain | null;
}
interface Timestamp {
    seconds: number;
    nanos: number;
}
interface RevisionAquaChainResult {
    successful: boolean;
    logs: ProtocolLogs[];
    revisionResults: Array<RevisionAquaChainResult>;
}
interface FileData {
    file_hash: string;
    file_name: string;
    file_content: string;
}
interface VerifyFileResult {
    error_message: string | null;
    file_hash: string | null;
}
interface MerkleNode {
    left_leaf: string;
    right_leaf: string;
    successor: string;
}
interface CheckEtherScanResult {
    verificationHashMatches: boolean;
    message: string;
    successful: boolean;
}

interface VerificationOptions {
    version: number;
    strict?: boolean;
    allowNull?: boolean;
    customMessages?: Record<string, string>;
    alchemyKey: string;
    doAlchemyKeyLookUp: boolean;
}
declare class AquaProtocol {
    private options;
    constructor(options?: VerificationOptions);
    fetchVerificationOptions(): VerificationOptions;
    generateGenesisRevision(file_name: string, file_data: string): AquaChainResult;
    generateContentRevision(aqua_chain: AquaChain, file_name: string, file_data: string): AquaChainResult;
    generateScalaRevision(aqua_chain: AquaChain): AquaChainResult;
    removeLastRevision(aqua_chain: AquaChain): AquaChainResult;
    verifyRevision(revision: Revision, linkedRevisions: Array<AquaChain>, fileData: Array<FileData>): Promise<RevisionAquaChainResult>;
    verifySignature(signature: Revision): Promise<[boolean, ProtocolLogs[]]>;
    verifyWitness(witness: Revision, verification_hash: string, doVerifyMerkleProof: boolean): Promise<[boolean, ProtocolLogs[]]>;
    verifyAquaChain(aquaChain: AquaChain, linkedRevisions: Array<AquaChain>, fileData: Array<FileData>): Promise<RevisionAquaChainResult>;
}

export { type AquaChainResult, type CheckEtherScanResult, type FileData, type MerkleNode, type RevisionAquaChainResult, type Timestamp, type VerificationOptions, type VerifyFileResult, AquaProtocol as default };
