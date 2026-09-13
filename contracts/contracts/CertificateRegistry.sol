// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title CertificateRegistry
/// @author TasdikiDocs
/// @notice On-chain registry for tamper-proof academic certificates issued by
///         approved institutions. Only a hash of the certificate's canonical
///         data and a pointer to the off-chain document (an IPFS URI) are
///         stored on-chain, keeping gas costs low while still allowing anyone
///         to publicly verify whether a certificate is genuine, and whether
///         it has since been revoked by its issuer or a platform admin.
/// @dev Access is controlled with OpenZeppelin `AccessControl`:
///      - `DEFAULT_ADMIN_ROLE` is granted to the deployer (the platform
///        owner) and can approve/suspend institutions and revoke any
///        certificate.
///      - `ISSUER_ROLE` is granted to approved institution wallets and is
///        required to issue new certificates.
contract CertificateRegistry is AccessControl {
    /// @notice Role required to issue certificates. Granted per approved
    ///         institution wallet address by an admin.
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    /// @notice On-chain record of a single issued certificate.
    /// @param certificateHash Hash of the certificate's canonical off-chain
    ///        data (e.g. keccak256 of the student/course/date payload).
    /// @param metadataURI IPFS URI pointing at the full certificate document
    ///        / metadata JSON.
    /// @param issuer Wallet address of the institution that issued the
    ///        certificate.
    /// @param issuedAt Unix timestamp (block time) the certificate was
    ///        issued.
    /// @param revoked Whether the certificate has been revoked.
    /// @param revokedAt Unix timestamp (block time) the certificate was
    ///        revoked, or 0 if it has not been revoked.
    struct Certificate {
        bytes32 certificateHash;
        string metadataURI;
        address issuer;
        uint256 issuedAt;
        bool revoked;
        uint256 revokedAt;
    }

    /// @dev Auto-incrementing certificate id counter. Starts at 1 so that 0
    ///      can safely mean "no certificate" when used as a sentinel value.
    uint256 private _nextCertificateId = 1;

    /// @dev certificateId => Certificate record.
    mapping(uint256 => Certificate) private _certificates;

    /// @dev certificateHash => certificateId. Used both to look up a
    ///      certificate by its hash and to prevent duplicate issuance of the
    ///      same hash. A value of 0 means the hash has not been used yet.
    mapping(bytes32 => uint256) private _certificateIdByHash;

    /// @notice Emitted when a new certificate is issued.
    event CertificateIssued(
        uint256 indexed certificateId,
        bytes32 indexed certificateHash,
        address indexed issuer,
        string metadataURI,
        uint256 timestamp
    );

    /// @notice Emitted when a certificate is revoked.
    event CertificateRevoked(
        uint256 indexed certificateId,
        address indexed revokedBy,
        string reason,
        uint256 timestamp
    );

    /// @notice Emitted when an institution wallet is approved as an issuer.
    event InstitutionApproved(address indexed wallet, address indexed approvedBy);

    /// @notice Emitted when an institution wallet's issuer privileges are
    ///         suspended.
    event InstitutionSuspended(address indexed wallet, address indexed suspendedBy);

    /// @notice Thrown when querying a certificate id that does not exist.
    error CertificateNotFound(uint256 id);

    /// @notice Thrown when trying to revoke a certificate that has already
    ///         been revoked.
    error CertificateAlreadyRevoked(uint256 id);

    /// @notice Thrown when trying to issue a certificate whose hash has
    ///         already been used by a previous certificate.
    error DuplicateCertificateHash(bytes32 hash);

    /// @notice Thrown when `certificateHash` is the zero hash.
    error InvalidCertificateHash();

    /// @notice Thrown when `msg.sender` is neither the original issuer of a
    ///         certificate nor a platform admin.
    error NotAuthorizedForCertificate(uint256 id, address caller);

    /// @notice Deploys the registry and grants `DEFAULT_ADMIN_ROLE` to the
    ///         deployer, who acts as the platform owner.
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Issues a new certificate on-chain.
    /// @dev Only callable by an approved institution wallet holding
    ///      `ISSUER_ROLE`. Reverts with `InvalidCertificateHash` if
    ///      `certificateHash` is zero, or `DuplicateCertificateHash` if the
    ///      hash has already been used by another certificate.
    /// @param certificateHash Hash of the certificate's canonical data.
    /// @param metadataURI IPFS URI of the full certificate document/metadata.
    /// @return certificateId The auto-incrementing id assigned to the new
    ///         certificate.
    function issueCertificate(bytes32 certificateHash, string calldata metadataURI)
        external
        onlyRole(ISSUER_ROLE)
        returns (uint256 certificateId)
    {
        if (certificateHash == bytes32(0)) {
            revert InvalidCertificateHash();
        }
        if (_certificateIdByHash[certificateHash] != 0) {
            revert DuplicateCertificateHash(certificateHash);
        }

        certificateId = _nextCertificateId++;

        _certificates[certificateId] = Certificate({
            certificateHash: certificateHash,
            metadataURI: metadataURI,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            revoked: false,
            revokedAt: 0
        });
        _certificateIdByHash[certificateHash] = certificateId;

        emit CertificateIssued(certificateId, certificateHash, msg.sender, metadataURI, block.timestamp);
    }

    /// @notice Revokes an existing certificate.
    /// @dev Only callable by the original issuer of the certificate or an
    ///      account holding `DEFAULT_ADMIN_ROLE`. Reverts with
    ///      `CertificateNotFound` if the certificate does not exist,
    ///      `CertificateAlreadyRevoked` if it has already been revoked, or
    ///      `NotAuthorizedForCertificate` if the caller is neither the
    ///      issuer nor an admin.
    /// @param certificateId Id of the certificate to revoke.
    /// @param reason Human-readable reason for the revocation, emitted in the
    ///        `CertificateRevoked` event.
    function revokeCertificate(uint256 certificateId, string calldata reason) external {
        Certificate storage cert = _certificates[certificateId];
        if (cert.issuedAt == 0) {
            revert CertificateNotFound(certificateId);
        }
        if (cert.revoked) {
            revert CertificateAlreadyRevoked(certificateId);
        }
        if (msg.sender != cert.issuer && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert NotAuthorizedForCertificate(certificateId, msg.sender);
        }

        cert.revoked = true;
        cert.revokedAt = block.timestamp;

        emit CertificateRevoked(certificateId, msg.sender, reason, block.timestamp);
    }

    /// @notice Returns the full on-chain record for a certificate.
    /// @dev Publicly callable, no access control. Reverts with
    ///      `CertificateNotFound` if the certificate does not exist.
    /// @param certificateId Id of the certificate to look up.
    /// @return The `Certificate` record.
    function verifyCertificate(uint256 certificateId) external view returns (Certificate memory) {
        Certificate memory cert = _certificates[certificateId];
        if (cert.issuedAt == 0) {
            revert CertificateNotFound(certificateId);
        }
        return cert;
    }

    /// @notice Looks up a certificate by its hash instead of its id.
    /// @dev Publicly callable, no access control. Reverts with
    ///      `CertificateNotFound` if no certificate with this hash exists.
    /// @param certificateHash Hash of the certificate's canonical data.
    /// @return certificateId The id of the matching certificate.
    /// @return certificate The `Certificate` record.
    function verifyByHash(bytes32 certificateHash)
        external
        view
        returns (uint256 certificateId, Certificate memory certificate)
    {
        certificateId = _certificateIdByHash[certificateHash];
        if (certificateId == 0) {
            revert CertificateNotFound(0);
        }
        certificate = _certificates[certificateId];
    }

    /// @notice Approves an institution wallet, granting it `ISSUER_ROLE` so
    ///         it can issue certificates.
    /// @dev Only callable by an account holding `DEFAULT_ADMIN_ROLE`. Thin
    ///      domain-specific wrapper around `grantRole` that also emits an
    ///      `InstitutionApproved` event for easier off-chain indexing.
    /// @param wallet Address of the institution wallet to approve.
    function approveInstitution(address wallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ISSUER_ROLE, wallet);
        emit InstitutionApproved(wallet, msg.sender);
    }

    /// @notice Suspends an institution wallet, revoking its `ISSUER_ROLE` so
    ///         it can no longer issue certificates.
    /// @dev Only callable by an account holding `DEFAULT_ADMIN_ROLE`. Thin
    ///      domain-specific wrapper around `revokeRole` that also emits an
    ///      `InstitutionSuspended` event for easier off-chain indexing.
    ///      Certificates already issued by the wallet are unaffected and
    ///      remain valid unless separately revoked.
    /// @param wallet Address of the institution wallet to suspend.
    function suspendInstitution(address wallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(ISSUER_ROLE, wallet);
        emit InstitutionSuspended(wallet, msg.sender);
    }
}
