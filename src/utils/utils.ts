
import { Revision } from "../models/protocol_models"

export function verifySignatureUtil(data: Revision, verificationHash: string): [boolean, string] {

  let signatureOk = false
  let status = ""


  return [signatureOk, status]
}


export function verifyWitnessUtil(data: Revision,
   verification_hash: string,
  doVerifyMerkleProof: boolean,
  alchemyKey: string,
  doAlchemyKeyLookUp: boolean,): [boolean, string] {

  let signatureOk = false
  let status = ""


  return [signatureOk, status]
}