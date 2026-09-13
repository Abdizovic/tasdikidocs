import { ethers, network } from "hardhat";

/**
 * Deploys CertificateRegistry and logs the deployed address.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network hardhat
 *   npx hardhat run scripts/deploy.ts --network polygonAmoy
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`Deploying CertificateRegistry to network "${network.name}"`);
  console.log(`Deployer address: ${deployer.address}`);

  const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
  const registry = await CertificateRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`CertificateRegistry deployed to: ${address}`);

  // The deployer doubles as the platform's single signer for minting on
  // behalf of every approved institution (see server/src/lib/contract.ts) —
  // self-grant ISSUER_ROLE so it can call issueCertificate/revokeCertificate
  // immediately without a separate manual step.
  const approveTx = await registry.approveInstitution(deployer.address);
  await approveTx.wait();
  console.log(`Granted ISSUER_ROLE to deployer/platform wallet: ${deployer.address}`);

  console.log(`\nSet this in server/.env:`);
  console.log(`  CERTIFICATE_REGISTRY_ADDRESS=${address}`);

  const isLocalNetwork = network.name === "hardhat" || network.name === "localhost";
  const polygonscanApiKey = process.env.POLYGONSCAN_API_KEY;

  if (!isLocalNetwork && polygonscanApiKey) {
    console.log("\nTo verify this contract on Polygonscan, run:");
    console.log(`  npx hardhat verify --network ${network.name} ${address}`);
  } else if (!isLocalNetwork) {
    console.log(
      "\nPOLYGONSCAN_API_KEY not set - skipping verification instructions. " +
        "Set it in your .env file if you want to verify the contract on Polygonscan."
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
