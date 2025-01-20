import { ResultStatus, ResultStatusEnum } from "../models/library_models"
import { Revision } from "../models/protocol_models"


export async function verifyWitness(witness: Revision, verification_hash: string,
    doVerifyMerkleProof: boolean, alchemyKey: string,doAlchemyKeyLookUp: boolean): Promise<ResultStatus> {

    let defaultResultStatus: ResultStatus = {
        status: ResultStatusEnum.MISSING,
        successful: false,
        message: ""
    }


    // let [witnessOk, witnessMessage] = await verifyWitnessUtil(witness, verification_hash, doVerifyMerkleProof, alchemyKey, doAlchemyKeyLookUp)

    // defaultResultStatus.status = ResultStatusEnum.AVAILABLE
    // defaultResultStatus.successful = witnessOk
    // defaultResultStatus.message = witnessMessage

    return defaultResultStatus;
}
