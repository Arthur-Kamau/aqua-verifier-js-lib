
import { randomBytes } from 'crypto'
import { MerkleTree } from "merkletreejs"
import { sha256 } from "multihashes-sync/sha2"
import { bytes } from 'multiformats'
import crypto from "crypto"

function formatMwTimestamp(ts: string) {
  // Format timestamp into the timestamp format found in Mediawiki outputs
  return ts
    .replace(/-/g, "")
    .replace(/:/g, "")
    .replace("T", "")
    .replace("Z", "")
}

export function getTimestamp () : string {
  const now = new Date().toISOString()
  const timestamp = formatMwTimestamp(now.slice(0, now.indexOf(".")))

  return timestamp;

}
export function prepareNonce () : string {
  const seed = randomBytes(32)
  return Buffer.from(seed).toString("base64url")
}

export function getHashSum(content: string) {
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(content); // Convert string to Uint8Array
  const hash = bytes.toHex(sha256.digest(contentBytes).bytes);

  return hash;
}


export function dict2Leaves(obj: any) : string[] {
  return Object.keys(obj)
    .sort()  // MUST be sorted for deterministic Merkle tree
    .map((key) => {
      if (key === 'file_hash') {
        let val = obj[key].startsWith('1220') ? obj[key].slice(4) : obj[key];
        console.log("Val: ", val)
        return getHashSum(`${key}:${val}`)
      }
      else {
        return getHashSum(`${key}:${obj[key]}`)
      }
    });
}



export function sha256Hasher(data: string) : any {
  let result = crypto.createHash('sha256').update(data).digest('hex');
  return result
}