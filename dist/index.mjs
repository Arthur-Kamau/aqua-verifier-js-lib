// src/utils/utils.ts
import { randomBytes } from "crypto";
import { sha256 } from "multihashes-sync/sha2";
import { bytes } from "multiformats";
import crypto from "crypto";
function formatMwTimestamp(ts) {
  return ts.replace(/-/g, "").replace(/:/g, "").replace("T", "").replace("Z", "");
}
function getTimestamp() {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const timestamp = formatMwTimestamp(now.slice(0, now.indexOf(".")));
  return timestamp;
}
function prepareNonce() {
  const seed = randomBytes(32);
  return Buffer.from(seed).toString("base64url");
}
function getHashSum(content) {
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(content);
  const hash = bytes.toHex(sha256.digest(contentBytes).bytes);
  return hash;
}
function dict2Leaves(obj) {
  return Object.keys(obj).sort().map((key) => {
    if (key === "file_hash") {
      let val = obj[key].startsWith("1220") ? obj[key].slice(4) : obj[key];
      console.log("Val: ", val);
      return getHashSum(`${key}:${val}`);
    } else {
      return getHashSum(`${key}:${obj[key]}`);
    }
  });
}
function sha256Hasher(data) {
  let result = crypto.createHash("sha256").update(data).digest("hex");
  return result;
}

// src/core/revision.ts
import { MerkleTree as MerkleTree2 } from "merkletreejs";

// src/core/signature.ts
import { ethers } from "ethers";
import MerkleTree from "merkletreejs";
async function verifySignature(signature) {
  let isOk = false;
  let logs = [];
  const cleanedLeaves = signature.leaves?.map(
    (leaf) => typeof leaf === "string" && leaf.startsWith("1220") ? leaf.slice(4) : leaf
  );
  const tree = new MerkleTree(cleanedLeaves, sha256Hasher, {
    duplicateOdd: false
  });
  let verificationHash = tree.getHexRoot();
  let signatureOk = false;
  if (verificationHash === "") {
    let log = {
      log: "INVALID",
      log_type: "ERROR" /* ERROR */
    };
    logs.push(log);
    return [signatureOk, logs];
  }
  switch (signature.signature_type) {
    case "did:key":
      break;
    case "ethereum:eip-191":
      const paddedMessage = `I sign the following page verification_hash: [0x${verificationHash}]`;
      try {
        const recoveredAddress = ethers.recoverAddress(
          ethers.hashMessage(paddedMessage),
          signature.signature
        );
        signatureOk = recoveredAddress.toLowerCase() === signature.signature_wallet_address?.toLowerCase();
        let log = {
          log: signatureOk ? "VALID" : "INVALID",
          log_type: "INFO" /* INFO */
        };
        logs.push(log);
      } catch (e) {
      }
      break;
  }
  return [isOk, logs];
}

// src/core/witness.ts
import { ethers as ethers2 } from "ethers";
var verifyEth = async (ethNetwork, transactionHash, expectedMR, expectedTimestamp) => {
  const provider = ethers2.getDefaultProvider(ethNetwork);
  const tx = await provider.getTransaction(transactionHash);
  if (!tx) return "NOT FOUND";
  let actual = tx.data.split("0x9cef4ea1")[1];
  actual = actual.slice(0, 128);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const mrSans0x = expectedMR.startsWith("0x") ? expectedMR.slice(2) : expectedMR;
  return `${actual === mrSans0x}`;
};
async function verifyWitness(witness, doVerifyMerkleProof) {
  let isOk = false;
  let logs = [];
  if (witness.witness_network === "nostr") {
  } else if (witness.witness_network === "TSA_RFC3161") {
  } else {
    const _result = await verifyEth(
      `${witness.witness_network}`,
      `${witness.witness_transaction_hash}`,
      `${witness.witness_merkle_root}`,
      witness.witness_timestamp
    );
    let log = {
      log_type: "INFO" /* INFO */,
      log: "Successful"
    };
    if (_result === "true") {
      logs.push(log);
      isOk = _result === "true";
    }
    if (_result === "false") {
      log.log = "Verification hashes mismatch";
      log.log_type = "ERROR" /* ERROR */;
      logs.push(log);
      isOk = false;
    } else {
      log.log = "Transaction not found";
      log.log_type = "ERROR" /* ERROR */;
      logs.push(log);
      isOk = false;
    }
  }
  return [isOk, logs];
}

// src/core/revision.ts
function generateGenesisRevisionUtil(file_name, file_data) {
  let logs = [];
  let result = {
    isSuccessful: false,
    logs: [],
    aquaChain: null
  };
  let file_hash_data = getHashSum(file_data);
  let genesisRevision = {
    previous_verification_hash: "",
    nonce: prepareNonce(),
    local_timestamp: getTimestamp(),
    revision_type: "file_hash",
    file_hash: file_hash_data
  };
  const leaves = dict2Leaves(genesisRevision);
  const cleanedLeaves = leaves.map(
    (leaf) => typeof leaf === "string" && leaf.startsWith("1220") ? leaf.slice(4) : leaf
  );
  const tree = new MerkleTree2(cleanedLeaves, sha256Hasher, {
    duplicateOdd: false
  });
  genesisRevision.leaves = leaves;
  let verification_hash = tree.getHexRoot();
  let chain = {
    file_index: {
      file_hash_data: file_name
    },
    revisions: {
      [verification_hash]: genesisRevision
    }
  };
  result.aquaChain = chain;
  result.logs = logs;
  return result;
}
function generateContentRevision(aqua_chain, file_name, file_data) {
  let logs = [];
  let result = {
    isSuccessful: false,
    logs: [],
    aquaChain: null
  };
  let revision = {
    previous_verification_hash: "",
    nonce: prepareNonce(),
    local_timestamp: getTimestamp(),
    revision_type: "content"
  };
  revision.content = file_data;
  const leaves = dict2Leaves(revision);
  const cleanedLeaves = leaves.map(
    (leaf) => typeof leaf === "string" && leaf.startsWith("1220") ? leaf.slice(4) : leaf
  );
  const tree = new MerkleTree2(cleanedLeaves, sha256Hasher, {
    duplicateOdd: false
  });
  revision.leaves = leaves;
  let verification_hash = tree.getHexRoot();
  aqua_chain.revisions[verification_hash] = revision;
  result.aquaChain = aqua_chain;
  result.logs = logs;
  return result;
}
function generateScalaRevision(aqua_chain) {
  let logs = [];
  let result = {
    isSuccessful: false,
    logs: [],
    aquaChain: null
  };
  let revision = {
    previous_verification_hash: "",
    nonce: prepareNonce(),
    local_timestamp: getTimestamp(),
    revision_type: "file_hash",
    file_hash: aqua_chain.revisions[Object.keys(aqua_chain.revisions)[0]].file_hash
  };
  let revision_in_chain = aqua_chain.revisions;
  let verification_hash = "0x" + getHashSum(JSON.stringify(revision));
  revision_in_chain[verification_hash] = revision;
  let chain = aqua_chain;
  chain.revisions = revision_in_chain;
  result.aquaChain = chain;
  result.logs = logs;
  return result;
}
function removeLastRevision(aqua_chain) {
  let logs = [];
  let result = {
    isSuccessful: false,
    logs: [],
    aquaChain: null
  };
  if (Object.keys(aqua_chain.revisions).length > 1) {
    const newChain = { ...aqua_chain };
    const revisions = { ...aqua_chain.revisions };
    const revisionKeys = Object.keys(revisions);
    const lastKey = revisionKeys[revisionKeys.length - 1];
    if (lastKey) {
      delete revisions[lastKey];
      newChain.revisions = revisions;
      logs.push({
        log: `Removed revision with hash: ${lastKey}`,
        log_type: "INFO" /* INFO */
      });
      result.isSuccessful = true;
      result.aquaChain = newChain;
    } else {
      logs.push({
        log: "No revisions to remove",
        log_type: "ERROR" /* ERROR */
      });
    }
  } else {
    logs.push({
      log: "Cannot delete file hash (genesis revision)",
      log_type: "ERROR" /* ERROR */
    });
  }
  result.logs = logs;
  return result;
}
async function verifyAquaChain(aquaChain, linkedRevisions, fileData) {
  const hashChainResult = {
    successful: false,
    logs: [],
    revisionResults: []
  };
  const revisionHashes = Object.keys(aquaChain.revisions);
  for (let j = 0; j < revisionHashes.length; j++) {
    const revision = aquaChain.revisions[revisionHashes[j]];
    const revisionResult = await verifyRevision(revision, linkedRevisions, fileData);
    hashChainResult.revisionResults.push(revisionResult);
  }
  for (let i = 0; i < hashChainResult.revisionResults.length; i++) {
    const revisionResult = hashChainResult.revisionResults[i];
    if (!revisionResult.successful) {
      hashChainResult.successful = false;
      break;
    }
  }
  return Promise.resolve(hashChainResult);
}
async function verifyRevision(revision, linkedChains, fileData) {
  let logs = [];
  let hashChainResult = {
    successful: false,
    logs: [],
    revisionResults: []
  };
  logs.push({
    log: `revision is of type  ${revision.revision_type}   `,
    log_type: "INFO" /* INFO */
  });
  let typeOk = false;
  switch (revision.revision_type) {
    case "content":
      typeOk = true;
      break;
    case "file_hash":
      const fileContent = fileData.find((file) => file.file_hash === revision.file_hash);
      if (fileContent == void 0) {
        logs.push({
          log: ` file hash not found file hash: ${revision.file_hash}`,
          log_type: "INFO" /* INFO */
        });
        break;
      }
      const fileHash = getHashSum(fileContent?.file_content);
      console.log(`Found file hash: ${fileHash}, Original file hash: ${revision.file_hash}`);
      typeOk = fileHash === revision.file_hash;
      break;
    case "signature":
      let [ok, logs_data] = await verifySignature(
        revision
      );
      logs = logs.concat(logs_data);
      typeOk = ok;
      break;
    case "witness":
      let [ok2, logs_data2] = await verifyWitness(
        revision,
        false
      );
      logs = logs.concat(logs_data2);
      typeOk = ok2;
      break;
    case "link":
      let chain = void 0;
      for (const element of linkedChains) {
        const keys = Object.keys(element.file_index);
        const firstKey = keys[0];
        if (firstKey) {
          const fileName = element.file_index[firstKey];
          console.log("File Name:", fileName);
          if (revision.link_uri == fileName) {
            chain = element;
            break;
          }
        } else {
          console.log("file_index is empty");
        }
      }
      if (chain != void 0) {
        let result = await verifyAquaChain(chain, linkedChains, fileData);
        logs.push({
          log: `chain linked  ${revision.link_uri} verification  is ${result.successful ? "successfull" : "not successfull"} `,
          log_type: "INFO" /* INFO */
        });
        typeOk = result.successful;
        result.logs.forEach((item) => logs.push(item));
      } else {
        typeOk = false;
        logs.push({
          log: `chain linked in revision ${revision.link_uri} not found`,
          log_type: "ERROR" /* ERROR */
        });
      }
      break;
  }
  hashChainResult.successful = typeOk;
  hashChainResult.logs = logs;
  return hashChainResult;
}

// src/index.ts
var AquaProtocol = class {
  options;
  constructor(options = { version: 1.2, alchemyKey: "", doAlchemyKeyLookUp: false }) {
    this.options = {
      ...options,
      strict: false,
      allowNull: false,
      customMessages: {}
    };
  }
  fetchVerificationOptions() {
    return this.options;
  }
  generateGenesisRevision(file_name, file_data) {
    return generateGenesisRevisionUtil(file_name, file_data);
  }
  generateContentRevision(aqua_chain, file_name, file_data) {
    return generateContentRevision(aqua_chain, file_name, file_data);
  }
  generateScalaRevision(aqua_chain) {
    return generateScalaRevision(aqua_chain);
  }
  removeLastRevision(aqua_chain) {
    return removeLastRevision(aqua_chain);
  }
  verifyRevision(revision, linkedRevisions, fileData) {
    if (this.options.doAlchemyKeyLookUp && this.options.alchemyKey === "") {
      throw new Error("ALCHEMY KEY NOT SET");
    }
    return verifyRevision(revision, linkedRevisions, fileData);
  }
  verifySignature(signature) {
    return verifySignature(signature);
  }
  verifyWitness(witness, verification_hash, doVerifyMerkleProof) {
    return verifyWitness(witness, false);
  }
  verifyAquaChain(aquaChain, linkedRevisions, fileData) {
    return verifyAquaChain(aquaChain, linkedRevisions, fileData);
  }
};
export {
  AquaProtocol as default
};
