const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("CharityDonation", function () {
    let charityDonation;
    let owner;
    let donor1;
    let donor2;
    let charityWallet;

    beforeEach(async function () {
        [owner, donor1, donor2, charityWallet] = await ethers.getSigners();

        const CharityDonation = await ethers.getContractFactory("CharityDonation");
        charityDonation = await upgrades.deployProxy(CharityDonation, [], {
            initializer: "initialize",
            kind: "uups"
        });
        await charityDonation.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the correct admin role", async function () {
            const ADMIN_ROLE = await charityDonation.ADMIN_ROLE();
            expect(await charityDonation.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
        });

        it("Should initialize with 1 pre-defined charities", async function () {
            expect(await charityDonation.charityCount()).to.equal(1);
        });

        it("Should have active charities", async function () {
            const charities = await charityDonation.getActiveCharities();
            expect(charities.length).to.equal(1);
        });
    });

    describe("Donations", function () {
        it("Should accept donations to valid charities", async function () {
            const donationAmount = ethers.parseEther("0.1");

            const tx = await charityDonation.connect(donor1).donate(1, { value: donationAmount });
            const receipt = await tx.wait();

            // Verify event was emitted with correct donor, charity, and amount
            await expect(tx)
                .to.emit(charityDonation, "DonationReceived");
        });

        it("Should track total donations", async function () {
            const donationAmount = ethers.parseEther("0.5");
            await charityDonation.connect(donor1).donate(1, { value: donationAmount });

            expect(await charityDonation.totalDonations()).to.equal(donationAmount);
        });

        it("Should track donor totals", async function () {
            const amount1 = ethers.parseEther("0.1");
            const amount2 = ethers.parseEther("0.2");

            await charityDonation.connect(donor1).donate(1, { value: amount1 });
            await charityDonation.connect(donor1).donate(1, { value: amount2 });

            expect(await charityDonation.getDonorTotal(donor1.address)).to.equal(amount1 + amount2);
        });

        it("Should reject donations of 0 ETH", async function () {
            await expect(charityDonation.connect(donor1).donate(1, { value: 0 }))
                .to.be.revertedWith("Donation amount must be greater than 0");
        });

        it("Should reject donations to invalid charity", async function () {
            await expect(charityDonation.connect(donor1).donate(999, { value: ethers.parseEther("0.1") }))
                .to.be.revertedWith("Invalid charity ID");
        });
    });

    describe("Charity Proposals", function () {
        it("Should allow anyone to propose a charity", async function () {
            await expect(charityDonation.connect(donor1).proposeCharity(
                "New Charity",
                "A great cause",
                charityWallet.address
            ))
                .to.emit(charityDonation, "CharityProposed")
                .withArgs(donor1.address, "New Charity", charityWallet.address, 1);
        });

        it("Should reject empty charity names", async function () {
            await expect(charityDonation.connect(donor1).proposeCharity(
                "",
                "Description",
                charityWallet.address
            ))
                .to.be.revertedWith("Name cannot be empty");
        });
    });

    describe("Admin Functions", function () {
        beforeEach(async function () {
            await charityDonation.connect(donor1).proposeCharity(
                "Test Charity",
                "For testing",
                charityWallet.address
            );
        });

        it("Should allow owner to approve proposals", async function () {
            await expect(charityDonation.connect(owner).approveCharity(1))
                .to.emit(charityDonation, "CharityApproved");

            expect(await charityDonation.charityCount()).to.equal(2);
        });

        it("Should allow owner to reject proposals", async function () {
            await expect(charityDonation.connect(owner).rejectCharity(1))
                .to.emit(charityDonation, "CharityRejected");

            // Charity count should remain the same
            expect(await charityDonation.charityCount()).to.equal(1);
        });

        it("Should prevent non-admins from approving", async function () {
            await expect(charityDonation.connect(donor1).approveCharity(1))
                .to.be.revertedWith("Caller is not an admin");
        });

        it("Should prevent double processing of proposals", async function () {
            await charityDonation.connect(owner).approveCharity(1);
            await expect(charityDonation.connect(owner).approveCharity(1))
                .to.be.revertedWith("Proposal already processed");
        });

        it("Should allow a newly added admin to approve proposals", async function () {
            const ADMIN_ROLE = await charityDonation.ADMIN_ROLE();

            // 1. Grant donor2 the admin role
            await charityDonation.connect(owner).grantRole(ADMIN_ROLE, donor2.address);

            // 2. donor2 should now be able to approve
            await expect(charityDonation.connect(donor2).approveCharity(1))
                .to.emit(charityDonation, "CharityApproved");

            expect(await charityDonation.charityCount()).to.equal(2);
        });
    });

    describe("Leaderboard", function () {
        it("Should return top donors in correct order", async function () {
            await charityDonation.connect(donor1).donate(1, { value: ethers.parseEther("0.1") });
            await charityDonation.connect(donor2).donate(1, { value: ethers.parseEther("0.5") });
            await charityDonation.connect(donor1).donate(1, { value: ethers.parseEther("0.2") });

            const leaderboard = await charityDonation.getDonorLeaderboard(10);

            expect(leaderboard[0].donorAddress).to.equal(donor2.address);
            expect(leaderboard[1].donorAddress).to.equal(donor1.address);
        });
    });

    describe("Security", function () {
        it("Should reject direct ETH transfers", async function () {
            await expect(owner.sendTransaction({
                to: await charityDonation.getAddress(),
                value: ethers.parseEther("1.0")
            })).to.be.revertedWith("Please use the donate function");
        });

        it("Should check admin correctly", async function () {
            expect(await charityDonation.isOwner(owner.address)).to.be.true;
            expect(await charityDonation.isOwner(donor1.address)).to.be.false;
        });
    });

    // Helper function to get block timestamp
    async function getBlockTimestamp() {
        const block = await ethers.provider.getBlock("latest");
        return block.timestamp;
    }
});
