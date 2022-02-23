// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FakeNFTMarketplace {
    mapping(uint256 => address) public tokens; //mapping of fake tokenId to owner's address
    uint256 nftPrice = 0.1 ether; //set price of 1 fake nft
   
    // function that lets user purchase 1 fake nft. Function accepts eth and marks owner of tokenId as caller address.
    function purchase(uint256 _tokenId) external payable { //external because function is meant to be called by other contracts
        require(msg.value == nftPrice, "This NFT costs 0.1 eth");
        tokens[_tokenId] = msg.sender; //_tokenId is the fake nft to be purchased. Here we mark the owner as caller. tokens[_tokenId] returns the address of the owner of the tokenId.
    }

    //function that returns the price of 1 nft
    function getPrice() external view returns (uint256){
        return nftPrice;
    }

    //function that checks whether the given tokenId has already been sold or not
    function available(uint256 _tokenId) external view returns (bool){
        if ((tokens[_tokenId]) == address(0)) { //if owner's address == solidity's default value for addresses, 0x00000000... then it means that nobody owns the tokenId, so the function should return true.
            return true;
        }  return false;
    }
}