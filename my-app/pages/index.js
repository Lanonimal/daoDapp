import { Contract, providers } from "ethers";
import { formatEther } from "ethers/lib/utils";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import { PROFITUNITY_DAO_ABI, PROFITUNITY_DAO_CONTRACT_ADDRESS, PROFIT_UNITY_CONTRACT_ADDRESS, NFT_CONTRACT_ABI }from "../constants";
import styles from "../styles/Home.module.css";

export default function Home() {
  const [treasuryBalance, setTreasuryBalance] = useState("0"); //dao contract eth balance
  const [numProposals, setNumProposals] = useState("0"); //number of proposals created in dao
  const [proposals, setProposals] = useState([]); //array of all the created proposals
  const [nftBalance, setNftBalance] = useState(0); //amount of nfts the user holds
  const [fakeNftTokenId, setFakeNftTokenId] = useState(""); //tokenId to purchase if proposal passes
  const [selectedTab, setSelectedTab] = useState(""); //create or view
  const [loading, setLoading] = useState(false); //true when waiting for tx to get mined
  const [walletConnected, setWalletConnected] = useState(false); // true if connected
  const web3ModalRef = useRef();

  const connectWallet = async () => {
    try { 
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch(err) {
      console.error(err)
    }
  };

  //function that gets dao's eth balance and sets 'treasuryBalance'
  const getDAOTreasuryBalance = async () => {
    try{ 
      const provider = await getProviderOrSigner(); // write tx so provider
      const balance = await provider.getBalance(PROFITUNITY_DAO_CONTRACT_ADDRESS); //get contract's balance
      setTreasuryBalance(balance.toString()) //set treasuryBalance value, to string
    } catch(err) {
      console.error(err)
    }
  };

  //function that gets number of created proposals 
  const getNumProposalsInDAO = async () => {
    try{
      const provider = await getProviderOrSigner();
      const contract = getDAOContractInstance(provider);
      const daoNumProposals = await contract.numProposals();
      setNumProposals(daoNumProposals.toString());

    } catch(err) {
      console.error(err)
    }
  };

  //function that gets amount of nfts in users wallet
  const getUserNFTBalance = async () => {
    try{
      const signer = await getProviderOrSigner(true);
      const nftContract = getCryptodevsNFTContractInstance(signer);
      const balance = await nftContract.balanceOf(signer.getAddress());
      setNftBalance(parseInt(balance.toString()));

    }catch(err) {
      console.error(err)
    }
  };

  //function that lets user create a proposal
  const createProposal = async () => {
    try{
      const signer = await getProviderOrSigner(true);
      const daoContract = getDAOContractInstance(signer); //create instance of contract so that we can call a function from it on the next line
      const txn = await daoContract.createProposal(fakeNftTokenId); //call a function from the instance we created
      setLoading(true);
      await txn.wait();
      await getNumProposalsInDAO();
      setLoading(false);

    }catch(error) {
      console.error(error)
      //window.alert(error.data.message);
    }
  };

  //function that fetches and parses a proposal from the contract given the proposalId and then converts it into a JS object with values we can use.
  const fetchProposalById = async(id) => {
    try{
      const provider = await getProviderOrSigner();
      const daoContract = getDaoContractInstance(provider);
      const proposal = await daoContract.proposals(id); // get the proposal with given ID from the proposals mapping/array from the dao contract instance
      const parsedProposal = { //create the JS object with values we can use. 
        proposalId: id,
        nftTokenId: proposal.nftTokenId.toString(),
        deadline: new Date(parseInt(proposal.deadline.string()) * 1000),
        yayVotes: proposal.yayVotes.toString(),
        nayVotes: proposal.nayVotes.toString(),
        executed: proposal.executed,
      };
      return parsedProposal

    }catch(err) {
      console.error(err)
    }
  };

  //function that runs a loop 'numProposals' times to fetch all the proposals
  const fetchAllProposals = async () => {
    try{
      const proposals = [];
      for (let i = 0; i < numProposals; i++){
        const proposal = await fetchProposalById(i); // get 1 proposal with given i
        proposals.push(proposal); // add the fetched proposal to the proposals array 
      }
      setProposals(proposals);
      return proposals;
    } catch(err) {
      console.error(err)
    }
  };

  // function that calls the voteOnProposal function in contract
  const voteOnProposal = async(proposalId, _vote) => {
    try{
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      let vote = _vote === "YAY" ? 0 : 1; //if _vote = yay, vote = 0, if _vote = nay, vote = 1
      const txn = await daoContract.voteOnProposal(proposalId, vote); //call function from contract instance and pass parameters
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
    }catch(err) {
    console.error(err)
    }
  };

  //function that calls the executeProposal function from contrat
  const executeProposal = async(proposalId) => {
    try{
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      const txn = await daoContract.executeProposal(proposalId);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
    } catch(error) {
      console.error(error)
      //window.alert(error.data.message);
    }
  };

  //function that returns signer or provider
  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Please switch to the Rinkeby network!");
      throw new Error("Please switch to the Rinkeby network");
    }
    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  //function that returns DAO contract instance given provider/signer
  const getDAOContractInstance = (providerOrSigner) => {
    return new Contract(PROFITUNITY_DAO_CONTRACT_ADDRESS, PROFITUNITY_DAO_ABI, providerOrSigner);
  };

  //function that returns NFT contract instance given provider/signer
  const getCryptodevsNFTContractInstance = (providerOrSigner) => {
    return new Contract(PROFIT_UNITY_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, providerOrSigner);
  };
 
  //code that runs everytime value of walletConnected changes. everytime user connects/disconnects. will ask user to connect if disconnected. also fetches data
  useEffect(() => {
    if (!walletConnected){
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet().then(() =>{
        getDAOTreasuryBalance();
        getUserNFTBalance();
        getNumProposalsInDAO();
      })
    }}, [walletConnected]);

  //code that runs everytime value of 'selectedTab' changes. re-fetches all proposals when user clicks on view.  
  useEffect(() => {
    if (selectedTab === "View Proposals"){
      fetchAllProposals()
    }
  }, [selectedTab]);

  //function that renders contents of appropriate tab based on 'selectedTab'
  function renderTabs() {
    if (selectedTab === "Create Proposal"){
      return renderCreateProposalTab();
    } else if (selectedTab === "View Proposals"){
      return renderViewProposalsTab();
    } return null;
  }

  //function that renders create proposal tab
  function renderCreateProposalTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    } else if (nftBalance === 0) {
      return (
        <div className={styles.description}>
          You dont own any Profit Unity NFTs. <br/>
          <b>You cant create or vote on proposals</b>
        </div>
      );
    } else {
      return (
        <div className={styles.container}>
          <label>Fake NFT Token ID To Purchase: </label>
          <input className={styles.input}placeholder="0" type="number" onChange={(e) => setFakeNftTokenId(e.target.value)}></input>
          <button className={styles.button2} onClick={createProposal}>Create</button>
        </div>
      ); 
    }
  }

  // function that renders view proposals tab
  function renderViewProposalsTab(){
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
        );
      } else if (proposals.length === 0){
        return (
          <div className={styles.description}>
            No proposals have been created yet
          </div>
        );
      } else {
        return (
          <div>
            {proposals.map((p, index) => (
              <div key={index} className={styles.proposalCard}>
                {console.log(p)}
                <p>Proposal ID: {p.proposalId}</p>
                <p>Fake NFT To Purchase: {p.nftTokenId}</p>
                <p>Deadline: {p.deadline.toLocaleString()}</p>
                <p>Yay Votes: {p.yayVotes}</p>
                <p>Nay Votes: {p.nayVotes}</p>
                <p>Executed?: {p.executed.toString()}</p>
                {p.deadline.getTime() > Date.now() && !p.executed ? (
                  <div className={styles.flex}>
                    <button className={styles.button2} onClick={() => voteOnProposal(p.proposalId, "YAY")}>Vote YAY</button>
                    <button className={styles.button2} onClick={() => voteOnProposal(p.proposalId, "NAY")}>Vote NAY</button>
                  </div>
                ) : p.deadline.getTime() < Date.now() && !p.executed ? (
                  <div className={styles.flex}>
                    <button className={styles.button2} onClick={() => executeProposal(p.proposalId)}>
                      Execute Proposal{""}
                      {p.yayVotes > p.nayVotes ? "(YAY)" : "(NAY)"}
                    </button>
                  </div>
                ) : (<div className={styles.description}>Proposal Executed</div>)}
              </div>
            ))}
          </div>
        );
      }
    }

    return (
      <div>
        <Head>
        <title>ProfitUnity DAO</title>
        <meta name="description" content="CryptoDevs DAO" />
        <link rel="icon" href="/favicon.ico" />
        </Head>
        <div className={styles.main}>
          <div>
          <h1 className={styles.title}>Welcome to Profit Unity!</h1>
          <div className={styles.description}>Welcome to the DAO!</div>
          <div className={styles.description}>
            Your ProfitUnity NFT Balance: {nftBalance}
            <br />
              Treasury Balance: {formatEther(treasuryBalance)} ETH
            <br />
              Total Number of Proposals: {numProposals}
          </div>
          <div className={styles.flex}>
            <button
              className={styles.button}
              onClick={() => setSelectedTab("Create Proposal")}
            >
              Create Proposal
            </button>
            <button
              className={styles.button}
              onClick={() => setSelectedTab("View Proposals")}
            >
              View Proposals
            </button>
            </div>
            {renderTabs()}
          </div>
          <div>
            <img className={styles.image} src="/cryptodevs/0.svg" />
          </div>
        </div>
        <footer className={styles.footer}>
          Made with &#10084; by Zizou (Beloved Profit Unity Member) 
        </footer>
      </div>
    )
  }






