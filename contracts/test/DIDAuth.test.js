const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DIDAuth", function () {
  let didAuth;
  let deployer, user1, user2;

  const TEST_DID  = "did:ethr:0x7a69:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const TEST_HASH = BigInt("12345678901234567890123456789012345678901234567890");
  const NEW_HASH  = BigInt("98765432109876543210987654321098765432109876543210");

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();
    const DIDAuth = await ethers.getContractFactory("DIDAuth");
    didAuth = await DIDAuth.deploy();
    await didAuth.waitForDeployment();
  });

  // ── Deployment ─────────────────────────────────────────────────
  describe("Deployment", function () {
    it("TC-C01: Should set the correct owner", async function () {
      expect(await didAuth.owner()).to.equal(deployer.address);
    });
  });

  // ── registerUser ───────────────────────────────────────────────
  describe("registerUser", function () {
    it("TC-C02: Should register and emit UserRegistered event", async function () {
      await expect(didAuth.connect(user1).registerUser(TEST_DID, TEST_HASH))
        .to.emit(didAuth, "UserRegistered")
        .withArgs(TEST_DID, TEST_HASH, user1.address, await getTimestamp());
    });

    it("TC-C03: Should store correct hash", async function () {
      await didAuth.connect(user1).registerUser(TEST_DID, TEST_HASH);
      expect(await didAuth.getHash(TEST_DID)).to.equal(TEST_HASH);
    });

    it("TC-C04: Should reject empty DID", async function () {
      await expect(
        didAuth.connect(user1).registerUser("", TEST_HASH)
      ).to.be.revertedWith("DIDAuth: DID cannot be empty");
    });

    it("TC-C05: Should reject zero hash", async function () {
      await expect(
        didAuth.connect(user1).registerUser(TEST_DID, 0)
      ).to.be.revertedWith("DIDAuth: Hash cannot be zero");
    });

    it("TC-C06: Should reject duplicate DID registration", async function () {
      await didAuth.connect(user1).registerUser(TEST_DID, TEST_HASH);
      await expect(
        didAuth.connect(user2).registerUser(TEST_DID, TEST_HASH)
      ).to.be.revertedWith("DIDAuth: DID already registered");
    });
  });

  // ── verifyUser ─────────────────────────────────────────────────
  describe("verifyUser", function () {
    it("TC-C07: Should return true for registered active DID", async function () {
      await didAuth.connect(user1).registerUser(TEST_DID, TEST_HASH);
      expect(await didAuth.verifyUser(TEST_DID)).to.be.true;
    });

    it("TC-C08: Should return false for unregistered DID", async function () {
      expect(await didAuth.verifyUser("did:ethr:nonexistent")).to.be.false;
    });

    it("TC-C09: Should return false for revoked DID", async function () {
      await didAuth.connect(user1).registerUser(TEST_DID, TEST_HASH);
      await didAuth.connect(user1).revokeUser(TEST_DID);
      expect(await didAuth.verifyUser(TEST_DID)).to.be.false;
    });
  });

  // ── updateUser ─────────────────────────────────────────────────
  describe("updateUser", function () {
    it("TC-C10: Should update hash and emit UserUpdated event", async function () {
      await didAuth.connect(user1).registerUser(TEST_DID, TEST_HASH);
      await expect(didAuth.connect(user1).updateUser(TEST_DID, NEW_HASH))
        .to.emit(didAuth, "UserUpdated")
        .withArgs(TEST_DID, NEW_HASH, user1.address, await getTimestamp());
    });

    it("TC-C11: Should store updated hash correctly", async function () {
      await didAuth.connect(user1).registerUser(TEST_DID, TEST_HASH);
      await didAuth.connect(user1).updateUser(TEST_DID, NEW_HASH);
      expect(await didAuth.getHash(TEST_DID)).to.equal(NEW_HASH);
    });

    it("TC-C12: Should reject update from non-registrant wallet", async function () {
      await didAuth.connect(user1).registerUser(TEST_DID, TEST_HASH);
      await expect(
        didAuth.connect(user2).updateUser(TEST_DID, NEW_HASH)
      ).to.be.revertedWith("DIDAuth: Caller is not the registrant");
    });

    it("TC-C13: Should reject update with same hash", async function () {
      await didAuth.connect(user1).registerUser(TEST_DID, TEST_HASH);
      await expect(
        didAuth.connect(user1).updateUser(TEST_DID, TEST_HASH)
      ).to.be.revertedWith("DIDAuth: New hash must differ from current hash");
    });

    it("TC-C14: Should reject update with zero hash", async function () {
      await didAuth.connect(user1).registerUser(TEST_DID, TEST_HASH);
      await expect(
        didAuth.connect(user1).updateUser(TEST_DID, 0)
      ).to.be.revertedWith("DIDAuth: New hash cannot be zero");
    });
  });

  // ── revokeUser ─────────────────────────────────────────────────
  describe("revokeUser", function () {
    it("TC-C15: Should revoke DID and emit UserRevoked event", async function () {
      await didAuth.connect(user1).registerUser(TEST_DID, TEST_HASH);
      await expect(didAuth.connect(user1).revokeUser(TEST_DID))
        .to.emit(didAuth, "UserRevoked")
        .withArgs(TEST_DID, user1.address, await getTimestamp());
    });

    it("TC-C16: Should mark DID as revoked", async function () {
      await didAuth.connect(user1).registerUser(TEST_DID, TEST_HASH);
      await didAuth.connect(user1).revokeUser(TEST_DID);
      expect(await didAuth.isRevoked(TEST_DID)).to.be.true;
    });

    it("TC-C17: Should reject revoke from non-registrant wallet", async function () {
      await didAuth.connect(user1).registerUser(TEST_DID, TEST_HASH);
      await expect(
        didAuth.connect(user2).revokeUser(TEST_DID)
      ).to.be.revertedWith("DIDAuth: Caller is not the registrant");
    });

    it("TC-C18: Should reject update after revocation", async function () {
      await didAuth.connect(user1).registerUser(TEST_DID, TEST_HASH);
      await didAuth.connect(user1).revokeUser(TEST_DID);
      await expect(
        didAuth.connect(user1).updateUser(TEST_DID, NEW_HASH)
      ).to.be.revertedWith("DIDAuth: DID is revoked");
    });

    it("TC-C19: Should reject getHash after revocation", async function () {
      await didAuth.connect(user1).registerUser(TEST_DID, TEST_HASH);
      await didAuth.connect(user1).revokeUser(TEST_DID);
      await expect(
        didAuth.getHash(TEST_DID)
      ).to.be.revertedWith("DIDAuth: DID is revoked");
    });
  });

  // ── getUserInfo ────────────────────────────────────────────────
  describe("getUserInfo", function () {
    it("TC-C20: Should return correct full record for registered user", async function () {
      await didAuth.connect(user1).registerUser(TEST_DID, TEST_HASH);
      const [registered, revoked, hash, registrant] = await didAuth.getUserInfo(TEST_DID);
      expect(registered).to.be.true;
      expect(revoked).to.be.false;
      expect(hash).to.equal(TEST_HASH);
      expect(registrant).to.equal(user1.address);
    });

    it("TC-C21: Should show revoked status in getUserInfo", async function () {
      await didAuth.connect(user1).registerUser(TEST_DID, TEST_HASH);
      await didAuth.connect(user1).revokeUser(TEST_DID);
      const [registered, revoked] = await didAuth.getUserInfo(TEST_DID);
      expect(registered).to.be.true;
      expect(revoked).to.be.true;
    });
  });
});

async function getTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
}
