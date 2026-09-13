import https from "node:https";
import { ethers } from "ethers";
import abi from "./contracts/CertificateRegistry.abi.json";

const rpcUrl = process.env.POLYGON_AMOY_RPC_URL;
const privateKey = process.env.PLATFORM_WALLET_PRIVATE_KEY;
const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY;
const chainId = Number(process.env.POLYGON_AMOY_CHAIN_ID) || 80002;

if (!rpcUrl) throw new Error("POLYGON_AMOY_RPC_URL must be set in the environment");
if (!privateKey) throw new Error("PLATFORM_WALLET_PRIVATE_KEY must be set in the environment");
if (!thirdwebSecretKey) throw new Error("THIRDWEB_SECRET_KEY must be set in the environment");

// staticNetwork skips ethers' "detect network" round trip, which otherwise
// hangs indefinitely on this environment's flaky IPv6 routing.
const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
  staticNetwork: ethers.Network.from(chainId),
});

/**
 * The single platform signer that mints/revokes on-chain on behalf of every
 * approved institution. Institution attribution is enforced off-chain
 * (requireRole("institution") + status === "approved" before this is ever
 * reached) — the same trust boundary as every other privileged action in
 * this API — rather than via a per-institution wallet.
 */
const platformWallet = new ethers.Wallet(privateKey, provider);

function getRegistryContract(): ethers.Contract {
  const address = process.env.CERTIFICATE_REGISTRY_ADDRESS;
  if (!address) {
    throw new Error("CERTIFICATE_REGISTRY_ADDRESS is not set — deploy the contract first (see contracts/README.md)");
  }
  return new ethers.Contract(address, abi, platformWallet);
}

/**
 * Uploads a certificate's metadata JSON to IPFS via Thirdweb Storage's
 * upload API directly, using a raw https.request rather than fetch —
 * Node's native fetch (undici) hangs indefinitely against this endpoint on
 * this network regardless of IP family forced, while a plain https.request
 * (same primitives curl uses) responds in a few seconds. Returns the
 * ipfs:// URI the contract stores on-chain and that `certificates.ipfs_uri`
 * points at.
 */
export function uploadCertificateMetadata(metadata: Record<string, unknown>): Promise<string> {
  return new Promise((resolve, reject) => {
    const boundary = `----tasdikidocs-${Date.now()}`;
    const json = JSON.stringify(metadata, null, 2);
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="certificate.json"\r\nContent-Type: application/json\r\n\r\n`,
      ),
      Buffer.from(json),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const req = https.request(
      "https://storage.thirdweb.com/ipfs/upload",
      {
        method: "POST",
        family: 4,
        headers: {
          "x-secret-key": thirdwebSecretKey!,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(data) as { IpfsHash: string };
              resolve(`ipfs://${parsed.IpfsHash}`);
            } catch {
              reject(new Error(`Failed to parse IPFS upload response: ${data}`));
            }
          } else {
            reject(new Error(`IPFS upload failed: ${res.statusCode} ${data}`));
          }
        });
      },
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * Mints a certificate on-chain via CertificateRegistry.issueCertificate.
 * Waits for the transaction to actually be mined and throws if it reverted,
 * so a bad tx_hash never gets persisted.
 *
 * The on-chain auto-incrementing certificateId isn't returned/stored —
 * certificates are looked up on-chain by their hash (verifyByHash), which
 * off-chain code already has via certificate_hash.
 */
export async function mintCertificateOnChain(
  certificateHashHex: string,
  metadataUri: string,
): Promise<{ txHash: string }> {
  const contract = getRegistryContract();

  const tx = await contract.issueCertificate(`0x${certificateHashHex}`, metadataUri);
  const receipt = await tx.wait();

  if (!receipt || receipt.status !== 1) {
    throw new Error(`On-chain certificate mint failed (tx ${receipt?.hash})`);
  }

  return { txHash: receipt.hash };
}
