// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IFakeNFTMarketplace {
        function getPrice() external view returns(uint256); //returns price of nft from fakemarketplace in Wei denomination
        function available(uint256 _tokenId) external view returns(bool); //returns whether or not _tokenId is already purchased, returns bool. true means not sold.
        function purchase(uint256 _tokenId) external payable; // purchases _tokenId from fakemarketplace
    }
    
    interface IProfitUnity {
        function balanceOf(address owner) external view returns (uint256); //returns number of NFTs ('uint256') owned by 'owner', a given address.
        function tokenOfOwnerByIndex(address owner, uint256 index) external view returns(uint256);
        //returns a tokenId of a specific nft at given 'index'(in owned tokens array) for 'owner'.
    }

contract ProfitUnityDAO is Ownable {
    struct Proposal { //struct that contains info relevant for proposals
        uint256 nftTokenId; //tokenId of the nft to purchase from fakemarketplace if proposal passes 
        uint256 deadline; //unix timestamp until which proposal is active. proposal can be executed after deadline has passed
        uint256 yayVotes; //votes for
        uint256 nayVotes; //votes against
        bool executed; //has the proposal been executed yet? only possible if deadline has passed
        mapping (uint256 => bool) voters; //mapping of ProfitUnity tokenIds to booleans, indicating whether that specific nft has already casted a vote or not.
    }

    //mapping of proposalIds to Proposal that holds all created proposals
    mapping (uint256 => Proposal) public proposals; 
    uint256 public numProposals; // number of proposals that have been created

    IFakeNFTMarketplace nftMarketplace; //initaliase variable for FakeNFTMarketplace contract so that we can use its functions
    IProfitUnity cryptoDevsNFT; //^^

    //constructor that initialises contract variables and accepts ETH deposit from deployer to fill the DAO treasury. Deployer = owner because we imported 'Ownable'.
    constructor (address _nftMarketplace, address _cryptoDevsNFT) payable { 
        nftMarketplace = IFakeNFTMarketplace(_nftMarketplace); //initialises contract instance FakeNFTMarketplace
        cryptoDevsNFT = IProfitUnity(_cryptoDevsNFT);
    }

    //modifier that only lets users who hold at least 1 nft call functions
    modifier nftHolderOnly() { 
        require(cryptoDevsNFT.balanceOf(msg.sender) > 0, "NOT_A_DAO_MEMBER"); //number of nft's in msg.sender's wallet must be greater than 0
        _; //indicates that we want the modifier to run check first and then execute the function. 
    }

    //modifier that makes sure users can only vote on proposals which's deadline hasnt passed yet
    modifier activeProposalOnly(uint256 proposalIndex) {
        require(block.timestamp < proposals[proposalIndex].deadline, "DEADLINE_EXCEEDED"); // current time must be smaller than the proposals with proposalIndex's deadline.
        _;
    }

    //modifier that executes a proposal when it has passed, but not yet executed, and deadline has passed.
    modifier inactiveProposalOnly(uint256 proposalIndex) {
        require(block.timestamp >= proposals[proposalIndex].deadline, "DEADLINE_NOT_EXCEEDED");
        _;
    }
    
    //vote can only be YAY[0] or NAY[1], so the enum 'Vote' represents the possible options.
    enum Vote { 
        YAY, 
        NAY
    } 

    //function that lets holders vote on active proposals
    function voteOnProposal(uint256 proposalIndex, Vote vote) /// proposalIndex is the index of proposal to be voted on in the 'proposals' array (mapping). vote is the type of vote the holder wants to cast.
    external nftHolderOnly activeProposalOnly(proposalIndex) {
        Proposal storage proposal = proposals[proposalIndex];
        uint256 voterNFTBalance = cryptoDevsNFT.balanceOf(msg.sender); //amount of nft's msg.sender holds
        uint256 numVotes = 0; //amount of votes on proposal
        for(uint256 i = 0; i < voterNFTBalance; i++) { //for loop that goes through nft's in msg.sender address and calculates how many nfts havent been used to vote on this proposal yet
            uint256 tokenId = cryptoDevsNFT.tokenOfOwnerByIndex(msg.sender, i); //get tokenId for specific nft i in their wallet
            if (proposal.voters[tokenId] == false){ //if the tokenId's value is false, it means the nft hasnt been used to vote yet so we can ++ numVote
                numVotes++;
                proposal.voters[tokenId] == true; // set to true because user just used the nft to vote on a proposal
            } 
        }
        require(numVotes > 0, "ALREADY_VOTED");
        if(vote == Vote.YAY) {
            proposal.yayVotes += numVotes; //if yay, add 1 to yay. 
        } else {
            proposal.nayVotes += numVotes;
        }
    }

    //function that lets nft holders create a proposal.
    function createProposal(uint256 _nftTokenId) /// _nftTokenId is the tokenId of the nft to be purchased from fakemarketplace if proposal passes
    external nftHolderOnly returns(uint256) { //return newly created proposal's index
        require(nftMarketplace.available(_nftTokenId), "NFT_NOT_FOR_SALE");
        Proposal storage proposal = proposals[numProposals]; // create new variable called 'proposal' inside Proposal struct. Assign it's value to a specific proposal inside the mapping 'proposals'.
        proposal.nftTokenId = _nftTokenId;
        proposal.deadline = block.timestamp + 5 minutes; //set deadline to 5 minutes from current time
        numProposals++;
        return numProposals - 1; // return number of current proposal
    }

    //function that allows holders to execute the proposal after deadline has passed
    function executeProposal(uint256 proposalIndex) external nftHolderOnly inactiveProposalOnly(proposalIndex) {
        Proposal storage proposal = proposals[proposalIndex];
        if (proposal.yayVotes > proposal.nayVotes) { // if yay > nay, purchase the nft from fakemarketplace
            uint256 nftPrice = nftMarketplace.getPrice();  //get price of nft
            require(address(this).balance >= nftPrice, "NOT_ENOUGH_FUNDS"); // address must hold enough eth to purchase. The Error shows up in metamask/etherscan.
            nftMarketplace.purchase{value: nftPrice}(proposal.nftTokenId); //purchase function, giving it the eth amount (price) and nftTokenId
        }
        proposal.executed = true;
    }

    //function that allows owner of contract to withdraw the contract's eth
    function withdrawEther() external onlyOwner {
        payable(owner()).transfer(address(this).balance); //transfer entire eth balance of contract to owner's address
    }

    receive() external payable {} //msg.data is empty. allows the contract to accept eth deposits directly from a wallet without calling a function
    fallback() external payable {} //msg.data isnt empty
} 