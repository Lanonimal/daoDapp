const { ethers } = require("hardhat");
const { PROFIT_UNITY_CONTRACT_ADDRESS } = require("../constants");

async function main() {
    //deploy fakeNFTMarketplace contract
    const FakeNFTMarketplace = await ethers.getContractFactory("FakeNFTMarketplace");
    const fakeNftMarketplace = await FakeNFTMarketplace.deploy();
    await fakeNftMarketplace.deployed();
    console.log("FakeNFTMarketplace deployed to: ", fakeNftMarketplace.address);

    //deploy ProfitUnityDao contract
    const ProfitUnityDAO = await ethers.getContractFactory("ProfitUnityDAO");
    const profitUnityDAO = await ProfitUnityDAO.deploy(fakeNftMarketplace.address, PROFIT_UNITY_CONTRACT_ADDRESS, {
        value: ethers.utils.parseEther("0.01"), //assumes my account contains at least 0.01 Eth
    });
    await profitUnityDAO.deployed();
    console.log("ProfitUnityDAO deployed to: ", profitUnityDAO.address);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });