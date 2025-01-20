import { ResultStatus, ResultStatusEnum } from "../models/library_models"
import { Revision } from "../models/protocol_models"
import { verifySignatureUtil } from "../utils/utils"

export function verifySignature(signature: Revision, previous_verification_hash: string): ResultStatus {

    let defaultResultStatus: ResultStatus = {
        status: ResultStatusEnum.MISSING,
        successful: false,
        message: ""
    }

    let [signatureOk, signatureMessage] = verifySignatureUtil(signature, previous_verification_hash)

    defaultResultStatus.status = ResultStatusEnum.AVAILABLE
    defaultResultStatus.successful = signatureOk
    defaultResultStatus.message = signatureMessage

    return defaultResultStatus;

}
