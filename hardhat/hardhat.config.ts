// SPDX-License-Identifier: Apache-2.0

import { task, types } from "hardhat/config";
import { AbiCoder } from "ethers/lib/utils";
import { PostgresDBService, QueryBundle, Product } from '@blockchain-carbon-accounting/data-postgres';

import { Contract } from 'ethers';

import "@nomiclabs/hardhat-waffle";
import "solidity-coverage";
import "hardhat-gas-reporter";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "@openzeppelin/hardhat-upgrades";
import "@ethersproject/bignumber";

import * as dotenv from 'dotenv'
dotenv.config({path:'../.env'})

// Make sure to run `npx hardhat clean` before recompiling and testing
if (process.env.OVM) {
  import("@eth-optimism/plugins/hardhat/compiler");
  // TODO: not found ..
  // import("@eth-optimism/plugins/hardhat/ethers");
}

// eslint-disable-next-line
const encodeParameters = function (abi: AbiCoder, types: string[], values: any[]) {
  // const abi = new ethers.utils.AbiCoder();
  return abi.encode(types, values);
};

// Uncomment and populate .ethereum-config.js if deploying contract to Goerli, Kovan, xDai, or verifying with Etherscan
// const ethereumConfig = require("./.ethereum-config");

// Task to set limited mode on NetEmissionsTokenNetwork
task("setLimitedMode", "Set limited mode on a NetEmissionsTokenNetwork contract")
  .addParam("value", "True or false to set limited mode")
  .addParam("contract", "The CLM8 contract")
  .setAction(async (taskArgs, hre) => {
    const [admin] = await hre.ethers.getSigners();
    const NetEmissionsTokenNetwork = await hre.ethers.getContractFactory("NetEmissionsTokenNetwork");
    const contract = NetEmissionsTokenNetwork.attach(taskArgs.contract);
    await contract.connect(admin).setLimitedMode( (taskArgs.value) == "true" ? true : false );
  })

// Task to set quorum on Governor
task("setQuorum", "Set the quorum value on a Governor contract")
  .addParam("value", "The new quorum value in votes")
  .addParam("contract", "The Governor contract")
  .setAction(async (taskArgs, hre) => {
    const [admin] = await hre.ethers.getSigners();
    const Governor = await hre.ethers.getContractFactory("Governor");
    const contract = Governor.attach(taskArgs.contract);
    // since the dCLM8 token has 18 decimals places and the sqrt function cuts this in half, so 9 zeros must be padded on the value in order to get the correct order of magnitude.
    await contract.connect(admin).setQuorum(hre.ethers.BigNumber.from(taskArgs.value).mul(hre.ethers.BigNumber.from("1000000000")));
  })

// Task to set proposal threshold on Governor
task("setProposalThreshold", "Set the proposal threshold on a Governor contract")
  .addParam("value", "The minimum amount of dCLM8 required to lock with a proposal")
  .addParam("contract", "The Governor contract")
  .setAction(async (taskArgs, hre) => {
    const [admin] = await hre.ethers.getSigners();
    const Governor = await hre.ethers.getContractFactory("Governor");
    const contract = Governor.attach(taskArgs.contract);
    await contract.connect(admin).setProposalThreshold( String(taskArgs.value) );
  })

task("getQuorum", "Return the quorum value (minimum number of votes for a proposal to pass)")
  .addParam("contract", "The Governor contract")
  .setAction(async (taskArgs, hre) => {
    const [admin] = await hre.ethers.getSigners();
    const Governor = await hre.ethers.getContractFactory("Governor");
    const contract = Governor.attach(taskArgs.contract);
    const quorum = (await contract.connect(admin).quorumVotes()).toString();
    console.log(hre.ethers.BigNumber.from(quorum).div(hre.ethers.BigNumber.from("1000000000")).toString());
  })
task("getProposalThreshold", "Return the proposal threshold (amount of dCLM8 required to stake with a proposal)")
  .addParam("contract", "The Governor contract")
  .setAction(async (taskArgs, hre) => {
    const [admin] = await hre.ethers.getSigners();
    const Governor = await hre.ethers.getContractFactory("Governor");
    const contract = Governor.attach(taskArgs.contract);
    console.log((await contract.connect(admin).proposalThreshold()).toString());
  })
task("setTestAccountRoles", "Set default account roles for testing")
  .addParam("contract", "The CLM8 contract")
  .setAction(async (taskArgs, hre) => {
    const {dealer1, dealer2, dealer3, consumer1, consumer2, industry1, industry2, industry3, industry4, registry, building, investor1, dealer4, dealer5, dealer6, dealer7, ups, airfrance} = await hre.getNamedAccounts();

    const [admin] = await hre.ethers.getSigners();
    const NetEmissionsTokenNetwork = await hre.ethers.getContractFactory("NetEmissionsTokenNetwork");
    const contract = await NetEmissionsTokenNetwork.attach(taskArgs.contract);
    
    const {get} = hre.deployments;
    let carbonTracker = await get("CarbonTracker");
    
    await contract.connect(admin).registerDealer(dealer1, 1); // REC dealer
    console.log("Account " + dealer1 + " is now a REC dealer");
    await contract.connect(admin).registerDealer(dealer2, 3); // emissions auditor
    console.log("Account " + dealer2 + " is now an emissions auditor");
    await contract.connect(admin).registerDealer(dealer4, 3); // emissions auditor
    console.log("Account " + dealer4 + " is now an emissions auditor");
    await contract.connect(admin).registerDealer(dealer5, 3); // emissions auditor
    console.log("Account " + dealer5 + " is now an emissions auditor");
    await contract.connect(admin).registerDealer(dealer6, 3); // emissions auditor
    console.log("Account " + dealer6 + " is now an emissions auditor");
    await contract.connect(admin).registerDealer(dealer7, 2); // offsets dealer
    console.log("Account " + dealer7 + " is now an offsets  dealer");

    await contract.connect(admin).registerIndustry(industry1);
    console.log("Account " + industry1 + " is now an industry")
    // self registered industry dealer
    await contract.connect(admin).registerIndustry(industry2);
    console.log("Account " + industry2 + " is now an industry")
    await contract.connect(admin).registerIndustry(industry3);
    console.log("Account " + industry3 + " is now an industry")
    await contract.connect(admin).registerIndustry(industry4);
    console.log("Account " + industry4 + " is now an industry")
    await contract.connect(admin).registerIndustry(registry);
    console.log("Account " + registry + " is now an energy utility (industry) ")
    await contract.connect(admin).registerIndustry(building);
    console.log("Account " + building + " is now a building owner (industry")

    await contract.connect(admin).registerConsumer(investor1);
    console.log("Account " + investor1 + " is now an consumer (investor)")


    await contract.connect(await hre.ethers.getSigner(dealer1)).registerConsumer(consumer1);
    console.log("Account " + consumer1 + " is now a consumer");
    await contract.connect(admin).registerConsumer(consumer2);
    console.log("Account " + consumer2 + " is now a consumer");
    // special carrier accounts
    await contract.connect(admin).registerIndustry(ups);
    console.log("Account " + ups + " is now an industry")
    await contract.connect(admin).registerIndustry(airfrance);
    console.log("Account " + airfrance + " is now an industry")
  });
task("issueTestTokens", "Create some test issued tokens")
  .addParam("contract", "The CLM8 contract")
  .addParam("count", "Number of token to issue in each loop")
  .setAction(async (taskArgs, hre) => {
    const { dealer7, dealer1, dealer2, consumer1, consumer2 } = await hre.getNamedAccounts();

    const n = parseInt(taskArgs.count);
    if (n < 1) {
      console.error('Number of token should be greater than 0')
      return;
    }
    const NetEmissionsTokenNetwork = await hre.ethers.getContractFactory("NetEmissionsTokenNetwork");
    const contract = NetEmissionsTokenNetwork.attach(taskArgs.contract);
    for (let i = 1; i<n+1; i++) {
      const qty = i * 100;
      await contract
      .connect(await hre.ethers.getSigner(dealer1))
      .issue(
        dealer1,
        consumer1,
        1,
        qty,
        "1607463809",
        "1607463809",
        "",
        "",
        "Test token description " + i
      );
      console.log("Account " + consumer1 + " received " + qty + " tokens from " + dealer1);
      await contract
      .connect(await hre.ethers.getSigner(dealer7))
      .issue(
        dealer7,
        consumer2,
        2,
        qty,
        "1607463809",
        "1607463809",
        "",
        "",
        "Test token description " + i
      );
      console.log("Account " + consumer2 + " received " + qty + " tokens from " + dealer7);
      await contract
      .connect(await hre.ethers.getSigner(dealer2))
      .issue(
        dealer2,
        consumer2,
        3,
        qty,
        "1607463809",
        "1607463809",
        "",
        "",
        "Test token description " + i
      );
      console.log("Account " + consumer1 + " received " + qty + " tokens from " + dealer2);
    }
  });
task("createTestProposal", "Create a test proposal using the default account roles for testing")
  .addParam("governor", "The Governor contract")
  .addParam("contract", "The CLM8 contract")
  .setAction(async (taskArgs, hre) => {
    const { dealer1, dealer2 } = await hre.getNamedAccounts();

    const [admin] = await hre.ethers.getSigners();
    const NetEmissionsTokenNetwork = await hre.ethers.getContractFactory("NetEmissionsTokenNetwork");
    const contract = NetEmissionsTokenNetwork.attach(taskArgs.contract);
    const Governor = await hre.ethers.getContractFactory("Governor");
    const govContract = Governor.attach(taskArgs.governor);

    const calldatas = [
      encodeParameters(new hre.ethers.utils.AbiCoder(),
        // types of params
        ["address","uint160","uint8","uint256","uint256","uint256","string","string","string",],
        // value of params
        [
          dealer2, // account
          dealer1, // proposer
          1, // tokenTypeId
          50, // qty
          0, // fromDate
          0, // thruDate
          "some metadata",
          "a manifest",
          "some action inside a test proposal",
        ]
      ),
    ];

    await govContract.connect(admin).propose(
      [contract.address], // targets
      [0], // values
      ["issueOnBehalf(address,uint160,uint8,uint256,uint256,uint256,string,string,string)",], // signatures
      calldatas,
      "a test proposal"
    );
  });
task("createTestMultiProposal", "Create a test multi proposal using the default account roles for testing")
  .addParam("governor", "The Governor contract")
  .addParam("contract", "The CLM8 contract")
  .addOptionalParam("children", "The number of children to add, defaults to 3", 3, types.int)
  .setAction(async (taskArgs, hre) => {
    const { dealer1, dealer2 } = await hre.getNamedAccounts();

    const [admin] = await hre.ethers.getSigners();
    const NetEmissionsTokenNetwork = await hre.ethers.getContractFactory("NetEmissionsTokenNetwork");
    const contract = NetEmissionsTokenNetwork.attach(taskArgs.contract);
    const Governor = await hre.ethers.getContractFactory("Governor");
    const govContract = Governor.attach(taskArgs.governor);

    const calldatas = [
      encodeParameters(new hre.ethers.utils.AbiCoder(),
        // types of params
        ["address","uint160","uint8","uint256","uint256","uint256","string","string","string",],
        // value of params
        [
          dealer2, // account
          dealer1, // proposer
          1, // tokenTypeId
          50, // qty
          0, // fromDate
          0, // thruDate
          "some metadata",
          "a manifest",
          "some action inside a test proposal",
        ]
      ),
    ];

    const targets = [contract.address];
    const values = [0];
    const signatures = [
      "issueOnBehalf(address,uint160,uint8,uint256,uint256,uint256,string,string,string)",
    ];
    const descriptions = ["a test proposal"];
    for (let i = 0; i < taskArgs.children; i++) {
      // except for the description, it doesn't really matter what we put here since child proposals are never executed
      targets.push("0x0000000000000000000000000000000000000000");
      values.push(0);
      signatures.push("");
      calldatas.push("0x");
      descriptions.push("A test child proposal " + i);
    }

    await govContract.connect(admin).proposeMultiAttribute(
      targets, // targets
      values, // values
      signatures, // signatures
      calldatas,
      descriptions
    );
  });
task("giveDaoTokens", "Give DAO tokens to default account roles for testing")
  .addParam("contract", "The dCLM8 token")
  .setAction(async (taskArgs, hre) => {
    const {dealer1, dealer2, dealer3, consumer1, consumer2} = await hre.getNamedAccounts();

    const [admin] = await hre.ethers.getSigners();
    const daoToken = await hre.ethers.getContractFactory("DAOToken");
    const contract = daoToken.attach(taskArgs.contract);

    const decimals = hre.ethers.BigNumber.from("1000000000000000000");
    const tokens = hre.ethers.BigNumber.from("500000");
    const i = tokens.mul(decimals);

    await contract.connect(admin).transfer(dealer1, i);
    console.log (`Gave ${tokens} DAO Tokens to ${dealer1}`);
    await contract.connect(admin).transfer(dealer2, i);
    console.log (`Gave ${tokens} DAO Tokens to ${dealer2}`);
    await contract.connect(admin).transfer(dealer3, i);
    console.log (`Gave ${tokens} DAO Tokens to ${dealer3}`);
    await contract.connect(admin).transfer(consumer1, i);
    console.log (`Gave ${tokens} DAO Tokens to ${consumer1}`);
    await contract.connect(admin).transfer(consumer2, i);
    console.log (`Gave ${tokens} DAO Tokens to ${consumer2}`);
})
task("showDaoTokenBalances", "Show the DAO tokens balances of the test users")
  .addParam("contract", "The dCLM8 token")
  .setAction(async (taskArgs, hre) => {
    const {deployer, dealer1, dealer2, dealer3, consumer1, consumer2} = await hre.getNamedAccounts();

    const [admin] = await hre.ethers.getSigners();
    const daoToken = await hre.ethers.getContractFactory("DAOToken");
    const contract = daoToken.attach(taskArgs.contract);

    console.log("DAO dCLM8 balances:");
    console.log(` deployer  ${await contract.connect(admin).balanceOf(deployer)}`);
    console.log(` dealer1   ${await contract.connect(admin).balanceOf(dealer1)}`);
    console.log(` dealer2   ${await contract.connect(admin).balanceOf(dealer2)}`);
    console.log(` dealer3   ${await contract.connect(admin).balanceOf(dealer3)}`);
    console.log(` consumer1 ${await contract.connect(admin).balanceOf(consumer1)}`);
    console.log(` consumer2 ${await contract.connect(admin).balanceOf(consumer2)}`);
})
task("getTotalSupply", "Get the total supply of DAO tokens")
  .addParam("contract", "The dCLM8 token")
  .setAction(async (taskArgs, hre) => {
    const [admin] = await hre.ethers.getSigners();
    const daoToken = await hre.ethers.getContractFactory("DAOToken");
    const contract = daoToken.attach(taskArgs.contract);

    const supply = await contract.connect(admin).getTotalSupply();
    console.log("Total supply is (dCLM8): " + supply);
  });
task("addToSupply", "Add a given amount to the total supply of DAO tokens")
  .addParam("contract", "The dCLM8 token")
  .addParam("amount", "The number of dCLM8 token to add")
  .setAction(async (taskArgs, hre) => {
    if (!taskArgs.amount || taskArgs.amount == "0") {
      console.log("Please specify the amount to add.");
      return;
    }

    const [admin] = await hre.ethers.getSigners();
    const daoToken = await hre.ethers.getContractFactory("DAOToken");
    const contract = daoToken.attach(taskArgs.contract);
    console.log(`Adding ${taskArgs.amount} to the Total supply`);
    await contract.connect(admin).addToTotalSupply(taskArgs.amount.toString());

    const supply = await contract.connect(admin).getTotalSupply();
    console.log("Total supply is (dCLM8): " + supply);
  });

task("completeTimelockAdminSwitch", "Complete a Timelock admin switch for a live DAO contract")
  .addParam("timelock", "")
  .addParam("governor", "")
  .addParam("target", "")
  .addParam("value", "")
  .addParam("signature", "")
  .addParam("data", "")
  .addParam("eta", "")
  .setAction(async (taskArgs, hre) => {
    const Timelock = await hre.ethers.getContractFactory("Timelock");
    const timelock = Timelock.attach(taskArgs.timelock);
    const Governor = await hre.ethers.getContractFactory("Governor");
    const governor = Governor.attach(taskArgs.governor);

    await timelock.executeTransaction(
      taskArgs.target,
      taskArgs.value,
      taskArgs.signature,
      taskArgs.data,
      taskArgs.eta
    );
    console.log("Executed setPendingAdmin() on Timelock.");

    await governor.__acceptAdmin();
    console.log("Called __acceptAdmin() on Governor.");

    console.log("Done performing Timelock admin switch.");
  });

// issues emissions tokens for methane emissions of all the major US regions
// then issues trackers for oil and gas products based on their amounts of production, linking production to their methane emissions 
task("issueOilAndGasTrackers", "Create C-NFT for tracking oil and gas sector emissions")
  .addParam("contract", "The CLM8 contract")
  .addParam("tracker", "The C-NFT contract")
  .setAction(async (taskArgs, hre) => {
    const { dealer2, industry1, industry2, industry3, industry4, registry, building } = await hre.getNamedAccounts();

    const NetEmissionsTokenNetwork = await hre.ethers.getContractFactory("NetEmissionsTokenNetwork");
    const CarbonTracker = await hre.ethers.getContractFactory("CarbonTracker");
    const contract = await NetEmissionsTokenNetwork.attach(taskArgs.contract);
    const {get} = hre.deployments;
    let carbonTracker = await hre.ethers.getContractFactory("CarbonTracker");
    const trackerContract = await CarbonTracker.attach(taskArgs.tracker);

    let locations = ['Bakken','Niobrara','Permian','U.S. Average','World Average'];
    let industryAddresses = [industry1,industry2,industry3,registry,building];
    // methane emission O&G in Kg
    let ventingEmissions = [42359667456,4878701472,33035904000,405270000000,2160000000000];
    let flaringEmissions = [3172353757,164659360,7191612033,24798016000,302743508000];
    let oilAmounts = [60597652,32449236,218507495,822827823,4378031482];
    let gasAmounts = [22036430,48818206,149034246,815448153,3451977203];
    // in this case, both oil and gas are already in the same units (tons of oil equivalent (toe) and thousands of cubic meters (kcm))
    // but the different amounts and unitAmounts could support oil and gas with their own units
    let oilUnitAmounts = [60597652,32449236,218507495,822827823,4378031482];
    let gasUnitAmounts = [25623756,56765356,173295635,948195526,4013926980,];

    let productTransfer = [860000,860000,860000]
    for (let i = 0; i<locations.length; i++) {
      await trackerContract.connect(await hre.ethers.getSigner(dealer2))
      .track(
        industryAddresses[i],
        [],
        [],
        JSON.stringify({'description':locations[i]+" oil and gas emissions"}),
        ''
      );
      await contract.connect(await hre.ethers.getSigner(dealer2))
      .issueAndTrack(
        dealer2,
        industryAddresses[i],
        trackerContract.address,
        i+1,
        3,
        ventingEmissions[i],
        "1577836800",
        "1609415999",
        JSON.stringify({"type": "CH4", "scope": "1", "location":  locations[i], "GWP": "30"}),
        "",//JSON.stringify({'source': "https://docs.google.com/spreadsheets/d/1PQ2qz-P9qing_3F3BmvH6g2LA1G9BdYe/edit#gid=689160760"}),
        "Methane venting and leakage"
      );
      console.log("Methane venting and leakage tokens issued for "+locations[i]);
      await contract.connect(await hre.ethers.getSigner(dealer2))
      .issueAndTrack(
        dealer2,
        industryAddresses[i],
        trackerContract.address,
        i+1,
        3,
        flaringEmissions[i],
        "1577836800",
        "1609415999",
        JSON.stringify({"type": "CO2", "scope": "1", "location":  locations[i]}),
        '',//JSON.stringify({'source': "https://docs.google.com/spreadsheets/d/1PQ2qz-P9qing_3F3BmvH6g2LA1G9BdYe/edit#gid=689160760"}),
        "Methane flaring"
      );
      console.log("Gas flaring tokens issued for "+locations[i]);

      await trackerContract.connect(await hre.ethers.getSigner(dealer2))
      .issueProducts(
        i+1,
        [0,0],
        [oilAmounts[i],gasAmounts[i]],
        [
          JSON.stringify({'name':'Oil','unit':'toe','unitAmount':oilUnitAmounts[i]}),
          JSON.stringify({'name':'Natural Gas','unit':'kcm','unitAmount':gasUnitAmounts[i]}),
        ],['','']
      );
      console.log("Oil and gas products added to tracker id "+(i+1).toString()+" for "+locations[i]);

      await trackerContract.connect(await hre.ethers.getSigner(dealer2)).issue(i+1);
      console.log("Tracker id "+(i+1).toString()+" issued");
      if(i<3){
        await trackerContract.connect(await hre.ethers.getSigner(industryAddresses[i]))
          .transferProducts(industry4,[(i+1)*2],[productTransfer[i]],[]);
        console.log("Transfer Gas Tokens (productId = "+((i+1)*2).toString()+") from "+locations[i+1]+" to Natural Gas Utility: "+industry4);
      }
    }
  }
);

// issues emissions tokens for methane emissions of all the major US regions
// then issues trackers for oil and gas products based on their amounts of production, linking production to their methane emissions 
task("issueSempraTrackers", "Create gas and electricity certificates for Sempra Energy")
  .addParam("contract", "The CLM8 contract")
  .addParam("tracker", "The C-NFT contract")
  .setAction(async (taskArgs, hre) => {
    const { deployer, registry, building } = await hre.getNamedAccounts();

    const NetEmissionsTokenNetwork = await hre.ethers.getContractFactory("NetEmissionsTokenNetwork");
    const CarbonTracker = await hre.ethers.getContractFactory("CarbonTracker");
    const contract = await NetEmissionsTokenNetwork.attach(taskArgs.contract);
    const {get} = hre.deployments;
    let carbonTracker = await hre.ethers.getContractFactory("CarbonTracker");
    const trackerContract = await CarbonTracker.attach(taskArgs.tracker);

    const db = await PostgresDBService.getInstance()
    const operator = await db.getOperatorRepo().findByName('Sempra Energy');
    if(!operator?.wallet_address){
      console.warn(`Operator Sempra Energy does not have a registered address `)
      return
    }
    let industry = operator?.wallet_address;
    console.log(industry)

    let roles = await contract.connect(await hre.ethers.getSigner(deployer)).getRoles(industry);
    if(!roles.isIndustry){
      console.warn(`Registed operator Sempra Energy as industry`)
      await contract.connect(await hre.ethers.getSigner(deployer)).registerIndustry(industry);
    }

    if(true){
      console.log("Issue emissions for Sempra natural gas production");
      await trackerContract.connect(await hre.ethers.getSigner(deployer))
      .track(
        industry,
        [],
        [],
        JSON.stringify({'description':`Sempra natural gas production 2021`,
          'operator_uuid': '3f55dd63-f619-4c4d-880f-0634b4d92ca3'}),
        ''
      );
    //}else{
      await contract.connect(await hre.ethers.getSigner(deployer))
      .issueAndTrack(
        deployer,industry,trackerContract.address,73,3,"2000000000",
        "1609484400","1640934000",
        JSON.stringify({"type": "CH4", "scope": "1", "GWP":'28'}),
        JSON.stringify({'source': "https://www.sempra.com/sites/default/files/content/files/node-report/2022/sempra_sustainability-report_2021_5.18.22.pdf"}),
        "Methane venting and leakage"
      );
      await contract.connect(await hre.ethers.getSigner(deployer))
      .issueAndTrack(
        deployer,industry,trackerContract.address,73,3,"376000000",
        "1609484400","1640934000",
        JSON.stringify({"type": "CO2e", "scope": "2"}),
        JSON.stringify({'source': "https://www.sempra.com/sites/default/files/content/files/node-report/2022/sempra_sustainability-report_2021_5.18.22.pdf"}),
        "Electricity purchased from operations"
      );
      await contract.connect(await hre.ethers.getSigner(deployer))
      .issueAndTrack(
        deployer,industry,trackerContract.address,73,3,"50000000",
        "1609484400","1640934000",
        JSON.stringify({"type": "CO2e", "scope": "1"}),
        JSON.stringify({'source': "https://www.sempra.com/sites/default/files/content/files/node-report/2022/sempra_sustainability-report_2021_5.18.22.pdf"}),
        "Vehicle fleet"
      );
      await contract.connect(await hre.ethers.getSigner(deployer))
      .issueAndTrack(
        deployer,industry,trackerContract.address,73,3,"65300000000",
        "1609484400","1640934000",
        JSON.stringify({"type": "CO2e", "scope": "3"}),
        JSON.stringify({'source': "https://www.sempra.com/sites/default/files/content/files/node-report/2022/sempra_sustainability-report_2021_5.18.22.pdf"}),
        "Downstream gas sales"
      );
      console.log("Issue product for Sempra natural gas production");
      await trackerContract.connect(await hre.ethers.getSigner(deployer))
      .issueProducts(
        73,
        [0],
        ['10048530000'],
        [JSON.stringify({'name':'natural gas','unit':'therms'})],
        [JSON.stringify({'source': "https://www.sempra.com/sites/default/files/content/files/node-report/2022/Sempra_2021_Statistical-Report.pdf"})]
      );
    }
    if(true){
      console.log("Issue emissions for Sempra electricty production");
      await trackerContract.connect(await hre.ethers.getSigner(deployer))
      .track(
        industry,
        [],
        [],
        JSON.stringify({'description':`Sempra electricity production 2021`,
        'operator_uuid': '3f55dd63-f619-4c4d-880f-0634b4d92ca3'}),
        ''
      );
    //}else{
      await contract.connect(await hre.ethers.getSigner(deployer))
      .issueAndTrack(
        deployer,industry,trackerContract.address,74,3,"4800000000",
        "1609484400","1640934000",
        JSON.stringify({"type": "CO2e", "scope": "1"}),
        JSON.stringify({'source': "https://www.sempra.com/sites/default/files/content/files/node-report/2022/sempra_sustainability-report_2021_5.18.22.pdf"}),
        "Stationary combustion"
      );
      await contract.connect(await hre.ethers.getSigner(deployer))
      .issueAndTrack(
        deployer,industry,trackerContract.address,74,3,"900000000",
        "1609484400","1640934000",
        JSON.stringify({"type": "CO2e", "scope": "2"}),
        JSON.stringify({'source': "https://www.sempra.com/sites/default/files/content/files/node-report/2022/sempra_sustainability-report_2021_5.18.22.pdf"}),
        "Other producers electricity"
      );
      console.log("Issue product for Sempra electricity production");
      await trackerContract.connect(await hre.ethers.getSigner(deployer))
      .issueProducts(
        74,
        [0],
        ['17214000000'],
        [JSON.stringify({'name':'electricity','unit':'kwh'})],
        [JSON.stringify({'source': "https://www.sempra.com/sites/default/files/content/files/node-report/2022/Sempra_2021_Statistical-Report.pdf"})]
      )
      ;
    }
    if(true){
      console.log("Tracker id 73 issued");
      await trackerContract.connect(await hre.ethers.getSigner(deployer)).issue(73);
      console.log("Tracker id 74 issued");
      await trackerContract.connect(await hre.ethers.getSigner(deployer)).issue(74);
    } 
    roles = await contract.connect(await hre.ethers.getSigner(deployer)).getRoles(building);
    if(!roles.isIndustry){
      console.warn(`Register building owner account ${building} as industry`)
      await contract.connect(await hre.ethers.getSigner(deployer)).registerIndustry(building);
    } 
    if(true){  
      await trackerContract.connect(await hre.ethers.getSigner(industry))
        .transferProducts(building,[72],[350],[]);
      await trackerContract.connect(await hre.ethers.getSigner(industry))
        .transferProducts(building,[73],[14500],[]);
      console.log("Products transferred to building owner");

      console.log("Create tracker for building emissions");
      await trackerContract.connect(await hre.ethers.getSigner(deployer))
      .track(
        building,
        [],
        [],
        JSON.stringify({'description':`Building emissions 2021`}),
        ''
      );
    }
    if(true){  
      await trackerContract.connect(await hre.ethers.getSigner(building))
        .trackProduct(building,75,72,350);
      await trackerContract.connect(await hre.ethers.getSigner(building))
        .trackProduct(building,75,73,14500);
      console.log("Products tracked to building emissions tracker");
      const trackerDetails: any = await trackerContract.connect(await hre.ethers.getSigner(building)).getTrackerDetails(3);
      console.log(trackerDetails);
    }
  });

async function addEmissionsAndProducts(hre:any,contract:Contract,trackerContract:Contract, deployer:string, products:Product[], trackerId:number){
  //let trackerId = await trackerContract.connect(await hre.ethers.getSigner(deployer)).getNumOfUniqueTrackers();
  let metadata = {}; let productType = '';
  for (const product of products){
    switch(product.name.toLowerCase()){
      case "process & equipment vented":
        productType = 'emissions'
        metadata = {"type": "CH4", "scope": "1", "GWP": "28"}
        break;
      case "process & equipment flared":
        productType = 'emissions'
        metadata= {"type": "CO2", "scope": "1"}
        break;
      case "fugitive":
        productType = 'emissions'
        metadata= {"type": "CH4", "scope": "1", "GWP": "28"}
        break;
      case "gas": case "oil":
        productType = 'production'
        break;
      default:
        continue;
    }
    if(productType==='emissions'){ 
      try{
        await contract.connect(await hre.ethers.getSigner(deployer)).issueAndTrack(
          deployer,
          deployer,
          trackerContract.address,
          trackerId,
          3,
          Math.round(product.amount*1000),
          parseInt((product?.from_date?.getTime()!/1000).toFixed(0)),
          parseInt((product?.thru_date?.getTime()!/1000).toFixed(0)),
          JSON.stringify(metadata),
          JSON.stringify({'source': 'https://www.sustainability.com/thinking/benchmarking-methane-ghg-emissions-oil-natural-gas-us/'}),
          product.name
        );
      }catch(error){
        console.error(`Error adding emissions to certificate:: ${error}`)
      }
    }else if(productType==='production'){
      try{
        await trackerContract.connect(await hre.ethers.getSigner(deployer)).issueProducts(
          trackerId,
          [0],
          [Math.round(product.amount*1000)],
          [JSON.stringify({'name': product.name,'unit':'BOE'})],
          ['']
        );
      }catch(error){
        console.error(`Error adding production to certificate:: ${error}`)
      }
    }
  }
}

async function createTrackerAndAddTokens(hre:any,contract:Contract,trackerContract:Contract,deployer:string, address: string,year: number, metadata:string, manifest:string, products:Product[],trackerId:number){
  const fromDate = (Date.UTC(year,0)/1000).toFixed(0)
  const thruDate = (Date.UTC(year+1,0)/1000).toFixed(0)
  if(false){
    // toggle between create tracker and issue tokens to tracker
    // this is used to wait for trackaction with new trackers to be confirmed 
    // before adding product and emission tokens on a live network
    await trackerContract.connect(await hre.ethers.getSigner(deployer)).track(
      address,
      [],
      [],
      metadata,
      manifest
    )
  }else{
    console.log(`Add emissions and production to tracker ID ${trackerId}: ${JSON.parse(metadata).description}`)
    await addEmissionsAndProducts(hre,contract,trackerContract,deployer,products,trackerId)
  }
}

task("oilAndGasBenchmarkOperators","Use admin account to issue demo carbon tracker tokens for a given contract using national operator data")
  .addParam("contract","")
  .addParam("tracker","")
  .setAction(async (taskArgs, hre) => {
    

    const { deployer } = await hre.getNamedAccounts();
    //const netEmissionsTokenNetwork = await deployments.get('NetEmissionsTokenNetwork');
    const NetEmissionsTokenNetwork = await hre.ethers.getContractFactory("NetEmissionsTokenNetwork");
    const CarbonTracker = await hre.ethers.getContractFactory("CarbonTracker");
    const contract = await NetEmissionsTokenNetwork.attach(taskArgs.contract);
    const trackerContract = await CarbonTracker.attach(taskArgs.tracker);
    
    const db = await PostgresDBService.getInstance()
    // get latest trackerId
    //let trackerId = await trackerContract.connect(await hre.ethers.getSigner(deployer)).getNumOfUniqueTrackers();
    let trackerId = 7 // previous completed tracker
    const operators = ['Chevron','EnerVest Operating','Hilcorp Energy','ARD Operating','Apache','Noble Energy','EQT','Pioneer Natural Resources','Berry','Atlas Energy Group','Chesapeake Energy','CNX Resources','Devon Energy','Encana Oil & Gas','EXCO Resources','Breitburn Energy','ExxonMobil','ConocoPhillips','WPX Energy','EOG Resources','Scout Energy','Consol Energy','Occidental','BP','Total']
    for (const operatorName of operators){
      const operator = await db.getOperatorRepo().findByName(operatorName);
      if(!operator?.wallet_address){
        console.warn(`Operator ${operatorName} does not have a registered address `)
        continue
      }
      const roles = await contract.connect(await hre.ethers.getSigner(deployer)).getRoles(operator?.wallet_address);
      if(!roles.isIndustry){
        console.warn(`Registed operator ${operatorName} as industry`)
        await contract.connect(await hre.ethers.getSigner(deployer)).registerIndustry(operator?.wallet_address);
      }
      for (const year of [2018,2019,2020]){
        //const year = 2018
        const queryBundle:QueryBundle[] = [
          {
            field: 'operatorUuid',
            fieldType: 'string',
            value: operator?.uuid! as string,
            op: 'eq',
            conjunction: true},
          {
            field: 'source',
            fieldType: 'string',
            value: 'https://www.sustainability.com/globalassets/sustainability.com/thinking/pdfs/2022/2022-og-benchmarking-report-data.xlsx',
            op: 'eq',
            conjunction: true
          },
          {
            field: 'year',
            fieldType: 'string',
            value: year,
            op: 'eq',
            conjunction: true
          },
        ]
        const result = await db.getProductRepo().getTotals(0, 0, queryBundle, false);
        const products:Product[] = Product.toRaws(result)

        if(products.length===0){
          continue
        }else{
          trackerId +=1;
        }
        const description = [operatorName,`upstream emissions`,year.toString()].join(', ');
        const metadata = JSON.stringify({"operator_uuid":`${operator?.uuid}`, "description":`${description}`});
        const manifest = JSON.stringify({"source":'https://www.sustainability.com/globalassets/sustainability.com/thinking/pdfs/2022/2022-og-benchmarking-report-data.xlsx'});
        await createTrackerAndAddTokens(hre,contract,trackerContract,deployer,operator?.wallet_address!,year,metadata,manifest,products,trackerId)
      }    
    }
    await db.close()
  }
)

task("oilAndGasBenchmarkNational","Use admin account to issue demo carbon tracker tokens for a given contract using aggregate national data")
  .addParam("contract","")
  .addParam("tracker","")
  //.addParam("createTokens",false)
  .setAction(async (taskArgs, hre) => {

    const { deployer } = await hre.getNamedAccounts();
    //const netEmissionsTokenNetwork = await deployments.get('NetEmissionsTokenNetwork');
    const NetEmissionsTokenNetwork = await hre.ethers.getContractFactory("NetEmissionsTokenNetwork");
    const CarbonTracker = await hre.ethers.getContractFactory("CarbonTracker");
    const contract = await NetEmissionsTokenNetwork.attach(taskArgs.contract);
    const trackerContract = await CarbonTracker.attach(taskArgs.tracker);
    const operator_registry = '0x48cd6511ECf3d109E3A0b947BA42D92a31db939f'
    const roles = await contract.connect(await hre.ethers.getSigner(deployer)).getRoles(operator_registry);
    if(!roles.isIndustry){
      console.warn(`Registered operator registry address as industry`)
      await contract.connect(await hre.ethers.getSigner(deployer)).registerIndustry(operator_registry);
    }

    const db = await PostgresDBService.getInstance()

    let trackerId = 0;//await trackerContract.connect(await hre.ethers.getSigner(deployer)).getNumOfUniqueTrackers();

    for (const year of [2018,2019,2020]){
      const queryBundle:QueryBundle[] = [
        {
          field: 'source',
          fieldType: 'string',
          value: 'https://www.sustainability.com/globalassets/sustainability.com/thinking/pdfs/2022/2022-og-benchmarking-report-data.xlsx',
          op: 'eq',
          conjunction: true
        },
        {
          field: 'year',
          fieldType: 'string',
          value: year,
          op: 'eq',
          conjunction: true
        },
      ]
      const result = await db.getProductRepo().getTotals(0, 0, queryBundle, false);
      const products:Product[] = Product.toRaws(result)
      if(products.length===0){
        continue
      }else{
        trackerId +=1;
      }

      const description = [`U.S. upstream emissions`,year.toString()].join(', ');
      const metadata = JSON.stringify({"description": description});
      const manifest = JSON.stringify({"source":'https://www.sustainability.com/globalassets/sustainability.com/thinking/pdfs/2022/2022-og-benchmarking-report-data.xlsx'});
      await createTrackerAndAddTokens(hre,contract,trackerContract,deployer,operator_registry,year,metadata,manifest,products,trackerId)
    }    
    await db.close()
  }
)

task("oilAndGasBenchmarkBasins","Use admin account to issue demo carbon tracker tokens for a given contract using basin level oil & gas data")
  .addParam("contract","")
  .addParam("tracker","")
  .setAction(async (taskArgs, hre) => {
    const basins = ["Piceance", "Appalachian", "San Joaquin", "Green River", "Gulf Coast", "Fort Worth", "Santa Maria", "Paradox", "East Texas", "Central Western", "Anadarko", "Powder River", "Bend Arch", "Ouachita", "San Juan", "South Oklahoma", "Sacramento", "Las Vegas-Raton", "AK Cook Inlet", "Strawn", "Wind River", "Arctic Coastal", "Permian", "Chautauqua", "Arkla", "Williston", "Denver", "Michigan", "Sedgwick", "Arkoma", "Los Angeles", "Mid-Gulf Coast", "Palo Duro", "Las Animas", "Florida Platform", "Coastal", "North Park", "Uinta", ]
    
    const { deployer } = await hre.getNamedAccounts();
    //const netEmissionsTokenNetwork = await deployments.get('NetEmissionsTokenNetwork');
    const NetEmissionsTokenNetwork = await hre.ethers.getContractFactory("NetEmissionsTokenNetwork");
    const CarbonTracker = await hre.ethers.getContractFactory("CarbonTracker");
    const contract = await NetEmissionsTokenNetwork.attach(taskArgs.contract);
    const trackerContract = await CarbonTracker.attach(taskArgs.tracker);
    
    const db = await PostgresDBService.getInstance()

    let trackerId = await trackerContract.connect(await hre.ethers.getSigner(deployer)).getNumOfUniqueTrackers();

    const operator = await db.getOperatorRepo().findByName('Chevron');

    if(!operator?.wallet_address){
      console.warn(`Operator ${operator?.name} does not have a registered address `)
      return
    }
    const roles = await contract.connect(await hre.ethers.getSigner(deployer)).getRoles(operator?.wallet_address);
    if(!roles.isIndustry){
      console.warn(`Registed operator ${operator.name} as industry`)
      await contract.connect(await hre.ethers.getSigner(deployer)).registerIndustry(operator?.wallet_address);
    }
    //for (operator in operators){

      for (const year of [2018,2019,2020]){
        for (const basin of basins){
          const queryBundle:QueryBundle[] = [
            {
              field: 'operatorUuid',
              fieldType: 'string',
              value: operator?.uuid! as string,
              op: 'eq',
              conjunction: true},
            {
              field: 'source',
              fieldType: 'string',
              value: 'https://www.sustainability.com/globalassets/sustainability.com/thinking/pdfs/2022/2022-og-benchmarking-report-data.xlsx',
              op: 'eq',
              conjunction: true
            },
            {
              field: 'division_name',
              fieldType: 'string',
              value: basin,
              op: 'eq',
              conjunction: true
            },
            {
              field: 'year',
              fieldType: 'string',
              value: year,
              op: 'eq',
              conjunction: true
            },
          ]
          const result = await db.getProductRepo().selectPaginated(0, 0, queryBundle, false);
          const products:Product[] = Product.toRaws(result)
          if(products.length===0){
            continue
          }else{
            trackerId +=1;
          }
          const description = [`Oil & gas upstream emissions`,basin,year.toString()].join(', ');
          const metadata = JSON.stringify({"operator_uuid":`${operator?.uuid}`,"description":`${description}`});
          const manifest = JSON.stringify({"source":'https://www.sustainability.com/globalassets/sustainability.com/thinking/pdfs/2022/2022-og-benchmarking-report-data.xlsx'});
          await createTrackerAndAddTokens(hre,contract,trackerContract,deployer,operator?.wallet_address!,year,metadata,manifest,products,trackerId)
        }
      }    
    //}
    await db.close()
  }
)


task("grantAdminRole", "Grants an account the DEFAULT_ADMIN_ROLE for a given contract")
  .addParam("contract", "")
  .addParam("newAdmin", "")
  .setAction(async (taskArgs, hre) => {
    const NetEmissionsTokenNetwork = await hre.ethers.getContractFactory("NetEmissionsTokenNetwork");
    const netEmissionsTokenNetwork = NetEmissionsTokenNetwork.attach(taskArgs.contract);

    await netEmissionsTokenNetwork.grantRole(
      hre.ethers.constants.HashZero,
      taskArgs.newAdmin,
    );
    console.log(`Executed grantRole() on ${taskArgs.contract}. Done.`);
  });

  task("roles", "Prints the keccak256 hashed roles for the NetEmissionsTokenNetwork contract")
  .setAction(async (taskArgs, hre) => {
    console.log(`DEFAULT_ADMIN_ROLE: ${hre.ethers.constants.HashZero}`);
    console.log(`REGISTERED_DEALER: ${hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("REGISTERED_DEALER"))}`);
    console.log(`REGISTERED_REC_DEALER: ${hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("REGISTERED_REC_DEALER"))}`);
    console.log(`REGISTERED_OFFSET_DEALER: ${hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("REGISTERED_OFFSET_DEALER"))}`);
    console.log(`REGISTERED_EMISSIONS_AUDITOR: ${hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("REGISTERED_EMISSIONS_AUDITOR"))}`);
    console.log(`REGISTERED_CONSUMER: ${hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("REGISTERED_CONSUMER"))}`);
    console.log(`REGISTERED_INDUSTRY: ${hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("REGISTERED_INDUSTRY"))}`);
  });

  task("verify-all", "Verifies all contacts for a given network on Etherscan")
  .setAction(async (taskArgs, hre) => {
    const { get } = hre.deployments;
    const { deployer } = await hre.getNamedAccounts();

    const daoToken = await get("DAOToken");
    const timelock = await get("Timelock");
    const governor = await get("Governor");
    const netEmissionsTokenNetwork = await get("NetEmissionsTokenNetwork");

    await hre.run("etherscan-verify", [
      daoToken.address,
      deployer
    ]);
    
    await hre.run("etherscan-verify", [
      timelock.address,
      deployer,
      172800
    ]);

    await hre.run("etherscan-verify", [
      governor.address,
      timelock.address,
      daoToken.address,
      deployer
    ]);

    await hre.run("etherscan-verify", [
      netEmissionsTokenNetwork.address,
      deployer
    ]);
  });

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {

  namedAccounts: {
    // these are based on the accounts you see when run $ npx hardhat node --show-acounts
    deployer: { default: 0 },
    dealer1: { default: 1 },
    dealer2: { default: 2 },
    dealer3: { default: 3 },
    dealer4: { default: 4 },
    dealer5: { default: 5 },
    dealer6: { default: 6 },
    dealer7: { default: 7 },
    ups: { default: 8 },
    airfrance: { default: 9 },
    consumer1: { default: 19 },
    consumer2: { default: 18 },
    industry1: { default: 15 },
    industry2: { default: 16 },
    industry3: { default: 17 },
    industry4: { default: 14 },
    registry: { default: 13 },
    building: { default: 12 },
    investor1: { default: 11 },

    unregistered: { default: 8 }
  },

  solidity: {

    compilers: [
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.3",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  gasReporter: {
    currency: 'USD',
  },
  networks: {
    hardhat: {
      chainId: 1337
    },

    ovm_localhost: {
      url: `http://localhost:9545`
    },

    // Uncomment the following lines if deploying contract to Avalanche testnet
    // "avalanche-testnet": {
    //   url: "https://api.avax-test.network/ext/bc/C/rpc",
    //   chainId: 43113,
    //   accounts: [`0x${ethereumConfig.AVALANCHE_PRIVATE_KEY}`]
    // },
    // Deploy with npx hardhat --network avalanche-testnet deploy --reset

    // Uncomment the following lines if deploying contract to Avalanche
    // avalanche: {
    //   url: "https://api.avax.network/ext/bc/C/rpc",
    //   chainId: 43114,
    //   accounts: [`0x${ethereumConfig.AVALANCHE_PRIVATE_KEY}`],
    //   gasPrice: 225000000000,
    // },
    // Deploy with npx hardhat --network avalanche deploy --reset

    // Uncomment the following lines if deploying contract to Binance BSC testnet
    //bsctestnet: {
    //  url: "https://data-seed-prebsc-1-s1.binance.org:8545",
    //  chainId: 97,
    //  gasPrice: 20000000000,
    //  accounts: [`0x${ethereumConfig.BSC_PRIVATE_KEY}`]
    //}
    // Deploy with npx hardhat --network bsctestnet deploy --reset

    // Uncomment the following lines if deploying contract to Optimism on Kovan
    // Deploy with npx hardhat run --network optimism_kovan scripts/___.js
    // optimism_kovan: {
    //   url: `https://kovan.optimism.io/`,
    //   accounts: [`0x${ethereumConfig.CONTRACT_OWNER_PRIVATE_KEY}`]
    // },

    // Uncomment the following lines if deploying contract to Arbitrum on Kovan
    // Deploy with npx hardhat run --network arbitrum_kovan scripts/___.js
    // arbitrum_kovan: {
    //   url: `https://kovan4.arbitrum.io/rpc`,
    //   accounts: [`0x${ethereumConfig.CONTRACT_OWNER_PRIVATE_KEY}`]
    // },

    // Uncomment the following lines if deploying contract to Goerli or running Etherscan verification
    // Deploy with npx hardhat run --network goerli scripts/___.js
    //  goerli: {
    //    url: `https://goerli.infura.io/v3/${ethereumConfig.INFURA_PROJECT_ID}`,
    //    accounts: [`0x${ethereumConfig.CONTRACT_OWNER_PRIVATE_KEY}`,
    //      `0x${ethereumConfig.OPERATOR_REGISTRY_PRIVATE_KEY}`,`0x${ethereumConfig.BUILDING_OWNER_PRIVATE_KEY}`]
    //  },

    // Uncomment the following lines if deploying contract to xDai
    // Deploy with npx hardhat run --network xdai scripts/___.js
    // xdai: {
    //   url: "https://xdai.poanetwork.dev",
    //   chainId: 100,
    //   accounts: [`0x${ethereumConfig.CONTRACT_OWNER_PRIVATE_KEY}`]
    // }

    // Uncomment the following lines if deploying contract to Kovan
    // Deploy with npx hardhat run --network kovan scripts/___.js
    // kovan: {
    //   url: `https://kovan.infura.io/v3/${ethereumConfig.INFURA_PROJECT_ID}`,
    //   accounts: [`0x${ethereumConfig.CONTRACT_OWNER_PRIVATE_KEY}`]
    // }

    // Uncomment the following lines if deploying contract to Ropsten - See https://infura.io/docs/ethereum#section/Choose-a-Network
    // Deploy with npx hardhat run --network ropsten scripts/___.js
    // ropsten: {
    //   url: `https://ropsten.infura.io/v3/${ethereumConfig.INFURA_PROJECT_ID}`,
    //   accounts: [`0x${ethereumConfig.CONTRACT_OWNER_PRIVATE_KEY}`]
    // },
    // besu:{
    //   url: `http://localhost:8545`,
    //   chainId: 2018,
    //   accounts: [`0x${ethereumConfig.CONTRACT_OWNER_PRIVATE_KEY}`]
    // }

  },
  // Uncomment if running contract verification
  // etherscan: {
  //   apiKey: `${ethereumConfig.ETHERSCAN_API_KEY}`
  // },
  paths: {
    sources: "./solidity",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  ovm: {
    solcVersion: '0.7.6'
  }
};

