const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("CharityDonationV2", function () {
    let charityDonationV1;
    let charityDonationV2;
    let owner;
    let admin;
    let user;

    beforeEach(async function () {
        [owner, admin, user] = await ethers.getSigners();

        // Deploy V1 first (simulating existing deployment)
        const CharityDonationV1 = await ethers.getContractFactory("CharityDonation");
        charityDonationV1 = await upgrades.deployProxy(CharityDonationV1, [], {
            initializer: "initialize",
            kind: "uups"
        });
        await charityDonationV1.waitForDeployment();
    });

    describe("Upgrade Process", function () {
        beforeEach(async function () {
            // Upgrade to V2
            const CharityDonationV2 = await ethers.getContractFactory("CharityDonationV2");
            charityDonationV2 = await upgrades.upgradeProxy(
                await charityDonationV1.getAddress(),
                CharityDonationV2
            );
        });

        it("Should return v2.0.0 from getVersion()", async function () {
            expect(await charityDonationV2.getVersion()).to.equal("v2.0.0");
        });

        it("Should preserve V1 data after upgrade", async function () {
            // V1 initializes with 1 charity (UNICEF)
            expect(await charityDonationV2.charityCount()).to.equal(1);

            // Admin role should still be set
            const ADMIN_ROLE = await charityDonationV2.ADMIN_ROLE();
            expect(await charityDonationV2.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
        });

        it("Should allow admin to set custom version", async function () {
            await expect(charityDonationV2.connect(owner).setVersion("v2.0.1-beta"))
                .to.emit(charityDonationV2, "VersionUpdated")
                .withArgs("", "v2.0.1-beta");

            expect(await charityDonationV2.contractVersion()).to.equal("v2.0.1-beta");
        });

        it("Should prevent non-admin from setting version", async function () {
            await expect(charityDonationV2.connect(user).setVersion("hacked"))
                .to.be.revertedWith("Caller is not an admin");
        });

        it("Should preserve donations made before upgrade", async function () {
            // Make a donation on V1
            const donationAmount = ethers.parseEther("0.5");
            await charityDonationV1.connect(user).donate(1, { value: donationAmount });

            // Upgrade to V2
            const CharityDonationV2 = await ethers.getContractFactory("CharityDonationV2");
            const upgraded = await upgrades.upgradeProxy(
                await charityDonationV1.getAddress(),
                CharityDonationV2
            );

            // Verify donation data is preserved
            expect(await upgraded.totalDonations()).to.equal(donationAmount);
            expect(await upgraded.getDonorTotal(user.address)).to.equal(donationAmount);
        });
    });

    describe("V2 Specific Functionality", function () {
        beforeEach(async function () {
            const CharityDonationV2 = await ethers.getContractFactory("CharityDonationV2");
            charityDonationV2 = await upgrades.upgradeProxy(
                await charityDonationV1.getAddress(),
                CharityDonationV2
            );
        });

        it("Should allow donations after upgrade", async function () {
            const donationAmount = ethers.parseEther("0.1");

            await expect(charityDonationV2.connect(user).donate(1, { value: donationAmount }))
                .to.emit(charityDonationV2, "DonationReceived");

            expect(await charityDonationV2.totalDonations()).to.equal(donationAmount);
        });

        it("Should allow new admins to be added after upgrade", async function () {
            const ADMIN_ROLE = await charityDonationV2.ADMIN_ROLE();

            await charityDonationV2.connect(owner).grantRole(ADMIN_ROLE, admin.address);
            expect(await charityDonationV2.hasRole(ADMIN_ROLE, admin.address)).to.be.true;

            // New admin should be able to set version
            await charityDonationV2.connect(admin).setVersion("v2.1.0");
            expect(await charityDonationV2.contractVersion()).to.equal("v2.1.0");
        });
    });
});
