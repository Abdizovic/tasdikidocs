import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { CertificateRegistry } from "../typechain-types";

describe("CertificateRegistry", function () {
  let registry: CertificateRegistry;
  let admin: HardhatEthersSigner;
  let institutionA: HardhatEthersSigner;
  let institutionB: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  const CERT_HASH_1 = ethers.keccak256(ethers.toUtf8Bytes("certificate-1"));
  const CERT_HASH_2 = ethers.keccak256(ethers.toUtf8Bytes("certificate-2"));
  const METADATA_URI_1 = "ipfs://bafybeigdyrzt-cert-1";
  const METADATA_URI_2 = "ipfs://bafybeigdyrzt-cert-2";

  let ISSUER_ROLE: string;
  let DEFAULT_ADMIN_ROLE: string;

  beforeEach(async function () {
    [admin, institutionA, institutionB, stranger] = await ethers.getSigners();

    const CertificateRegistryFactory = await ethers.getContractFactory("CertificateRegistry");
    registry = (await CertificateRegistryFactory.deploy()) as unknown as CertificateRegistry;
    await registry.waitForDeployment();

    ISSUER_ROLE = await registry.ISSUER_ROLE();
    DEFAULT_ADMIN_ROLE = await registry.DEFAULT_ADMIN_ROLE();
  });

  describe("Deployment", function () {
    it("grants DEFAULT_ADMIN_ROLE to the deployer", async function () {
      expect(await registry.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.equal(true);
    });

    it("does not grant ISSUER_ROLE to the deployer by default", async function () {
      expect(await registry.hasRole(ISSUER_ROLE, admin.address)).to.equal(false);
    });
  });

  describe("Institution approval", function () {
    it("allows admin to approve an institution, granting ISSUER_ROLE", async function () {
      await expect(registry.approveInstitution(institutionA.address))
        .to.emit(registry, "InstitutionApproved")
        .withArgs(institutionA.address, admin.address);

      expect(await registry.hasRole(ISSUER_ROLE, institutionA.address)).to.equal(true);
    });

    it("reverts if a non-admin tries to approve an institution", async function () {
      await expect(registry.connect(stranger).approveInstitution(institutionA.address)).to.be.reverted;
    });
  });

  describe("issueCertificate", function () {
    beforeEach(async function () {
      await registry.approveInstitution(institutionA.address);
    });

    it("issues a certificate and emits CertificateIssued", async function () {
      const tx = await registry
        .connect(institutionA)
        .issueCertificate(CERT_HASH_1, METADATA_URI_1);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(registry, "CertificateIssued")
        .withArgs(1, CERT_HASH_1, institutionA.address, METADATA_URI_1, block!.timestamp);

      const cert = await registry.verifyCertificate(1);
      expect(cert.certificateHash).to.equal(CERT_HASH_1);
      expect(cert.metadataURI).to.equal(METADATA_URI_1);
      expect(cert.issuer).to.equal(institutionA.address);
      expect(cert.revoked).to.equal(false);
      expect(cert.revokedAt).to.equal(0);
    });

    it("auto-increments certificate ids across multiple issuances", async function () {
      await registry.connect(institutionA).issueCertificate(CERT_HASH_1, METADATA_URI_1);
      const tx2 = await registry.connect(institutionA).issueCertificate(CERT_HASH_2, METADATA_URI_2);

      await expect(tx2).to.emit(registry, "CertificateIssued").withArgs(
        2,
        CERT_HASH_2,
        institutionA.address,
        METADATA_URI_2,
        (await ethers.provider.getBlock((await tx2.wait())!.blockNumber))!.timestamp
      );
    });

    it("reverts when called by an address without ISSUER_ROLE", async function () {
      await expect(
        registry.connect(stranger).issueCertificate(CERT_HASH_1, METADATA_URI_1)
      ).to.be.reverted;
    });

    it("reverts with InvalidCertificateHash when hash is zero", async function () {
      await expect(
        registry.connect(institutionA).issueCertificate(ethers.ZeroHash, METADATA_URI_1)
      ).to.be.revertedWithCustomError(registry, "InvalidCertificateHash");
    });

    it("reverts with DuplicateCertificateHash when issuing the same hash twice", async function () {
      await registry.connect(institutionA).issueCertificate(CERT_HASH_1, METADATA_URI_1);

      await expect(
        registry.connect(institutionA).issueCertificate(CERT_HASH_1, METADATA_URI_2)
      )
        .to.be.revertedWithCustomError(registry, "DuplicateCertificateHash")
        .withArgs(CERT_HASH_1);
    });
  });

  describe("revokeCertificate", function () {
    beforeEach(async function () {
      await registry.approveInstitution(institutionA.address);
      await registry.connect(institutionA).issueCertificate(CERT_HASH_1, METADATA_URI_1);
    });

    it("allows the original issuer to revoke their certificate", async function () {
      const tx = await registry.connect(institutionA).revokeCertificate(1, "student misconduct");
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(registry, "CertificateRevoked")
        .withArgs(1, institutionA.address, "student misconduct", block!.timestamp);

      const cert = await registry.verifyCertificate(1);
      expect(cert.revoked).to.equal(true);
      expect(cert.revokedAt).to.equal(block!.timestamp);
    });

    it("allows an admin to revoke a certificate issued by someone else", async function () {
      const tx = await registry.connect(admin).revokeCertificate(1, "fraud detected");
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(registry, "CertificateRevoked")
        .withArgs(1, admin.address, "fraud detected", block!.timestamp);

      const cert = await registry.verifyCertificate(1);
      expect(cert.revoked).to.equal(true);
    });

    it("reverts when an unrelated address tries to revoke", async function () {
      await expect(registry.connect(stranger).revokeCertificate(1, "no reason"))
        .to.be.revertedWithCustomError(registry, "NotAuthorizedForCertificate")
        .withArgs(1, stranger.address);
    });

    it("reverts when another issuer (not the original) tries to revoke", async function () {
      await registry.approveInstitution(institutionB.address);
      await expect(registry.connect(institutionB).revokeCertificate(1, "no reason"))
        .to.be.revertedWithCustomError(registry, "NotAuthorizedForCertificate")
        .withArgs(1, institutionB.address);
    });

    it("reverts when revoking an already-revoked certificate", async function () {
      await registry.connect(institutionA).revokeCertificate(1, "first revocation");

      await expect(registry.connect(institutionA).revokeCertificate(1, "second revocation"))
        .to.be.revertedWithCustomError(registry, "CertificateAlreadyRevoked")
        .withArgs(1);
    });

    it("reverts when revoking a certificate that does not exist", async function () {
      await expect(registry.connect(admin).revokeCertificate(999, "no reason"))
        .to.be.revertedWithCustomError(registry, "CertificateNotFound")
        .withArgs(999);
    });
  });

  describe("verifyCertificate", function () {
    it("reverts with CertificateNotFound for a non-existent certificate id", async function () {
      await expect(registry.verifyCertificate(42))
        .to.be.revertedWithCustomError(registry, "CertificateNotFound")
        .withArgs(42);
    });

    it("is publicly callable with no role requirement", async function () {
      await registry.approveInstitution(institutionA.address);
      await registry.connect(institutionA).issueCertificate(CERT_HASH_1, METADATA_URI_1);

      const cert = await registry.connect(stranger).verifyCertificate(1);
      expect(cert.certificateHash).to.equal(CERT_HASH_1);
    });
  });

  describe("verifyByHash", function () {
    beforeEach(async function () {
      await registry.approveInstitution(institutionA.address);
      await registry.connect(institutionA).issueCertificate(CERT_HASH_1, METADATA_URI_1);
    });

    it("returns the correct certificate id and record for a known hash", async function () {
      const [certificateId, cert] = await registry.verifyByHash(CERT_HASH_1);
      expect(certificateId).to.equal(1);
      expect(cert.certificateHash).to.equal(CERT_HASH_1);
      expect(cert.metadataURI).to.equal(METADATA_URI_1);
      expect(cert.issuer).to.equal(institutionA.address);
    });

    it("reverts with CertificateNotFound for an unknown hash", async function () {
      await expect(registry.verifyByHash(CERT_HASH_2)).to.be.revertedWithCustomError(
        registry,
        "CertificateNotFound"
      );
    });
  });

  describe("suspendInstitution", function () {
    it("revokes ISSUER_ROLE so a subsequent issue attempt reverts", async function () {
      await registry.approveInstitution(institutionA.address);
      expect(await registry.hasRole(ISSUER_ROLE, institutionA.address)).to.equal(true);

      await expect(registry.suspendInstitution(institutionA.address))
        .to.emit(registry, "InstitutionSuspended")
        .withArgs(institutionA.address, admin.address);

      expect(await registry.hasRole(ISSUER_ROLE, institutionA.address)).to.equal(false);

      await expect(
        registry.connect(institutionA).issueCertificate(CERT_HASH_1, METADATA_URI_1)
      ).to.be.reverted;
    });

    it("reverts if a non-admin tries to suspend an institution", async function () {
      await registry.approveInstitution(institutionA.address);
      await expect(registry.connect(stranger).suspendInstitution(institutionA.address)).to.be.reverted;
    });

    it("does not affect certificates already issued before suspension", async function () {
      await registry.approveInstitution(institutionA.address);
      await registry.connect(institutionA).issueCertificate(CERT_HASH_1, METADATA_URI_1);
      await registry.suspendInstitution(institutionA.address);

      const cert = await registry.verifyCertificate(1);
      expect(cert.revoked).to.equal(false);
    });
  });
});
