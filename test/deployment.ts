import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { abi as uniswapRouterAbi } from '@uniswap/v2-periphery/build/UniswapV2Router02.json';
import { abi as uniswapPairAbi } from '@uniswap/v2-core/build/UniswapV2Pair.json';
import { XAEA12 } from '../typechain';

describe('ElonToken', function () {
  let dev: SignerWithAddress,
    dev2: SignerWithAddress,
    marketing: SignerWithAddress,
    treasury: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    user3: SignerWithAddress;
  let token: XAEA12;

  it('Should deploy', async function () {
    [dev, dev2, marketing, treasury, user1, user2, user3] = await ethers.getSigners();
    const XAEAXII = await ethers.getContractFactory('XAEA12');
    const routerAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    token = await XAEAXII.deploy(routerAddress, dev.address, marketing.address, treasury.address);

    this.uniswapPair = new ethers.Contract(await token.pair(), uniswapPairAbi, dev);
    this.uniswapRouter = new ethers.Contract(routerAddress, uniswapRouterAbi, dev);
    await token.setLaunchWhitelist(dev.address, true);
    await token.setLaunchWhitelist(dev2.address, true);
    await token.setTaxless(dev.address, true);
    await token.setTaxless(dev2.address, true);
    // await token.setTaxless(user2.address, true);
    // await token.setTaxless(user3.address, true);
    // token.setLaunchWhitelist(dev.address, true);
  });

  it('should transfer succesfully from dev1 to dev2', async function () {
    await token.connect(dev).transfer(dev2.address, parseUnits('1', 'gwei'));
    expect(await token.connect(dev2).balanceOf(dev2.address)).to.be.eq(parseUnits('1', 'gwei'));
  });

  it('should list successfully and give LP tokens to dev', async function () {
    const balance = await token.balanceOf(dev.address);
    await token.connect(dev).approve(this.uniswapRouter.address, balance);
    expect(await this.uniswapPair.connect(dev).balanceOf(dev.address)).to.be.eq(0);
    await this.uniswapRouter
      .connect(dev)
      .addLiquidityETH(token.address, balance, balance, parseEther('15'), dev.address, Date.now() + 100000, {
        value: parseEther('15')
      });

    expect(await this.uniswapPair.connect(dev).balanceOf(dev.address)).to.be.gt(0);
    await token.connect(dev).setFeeActive(true);
  });

  // it('should transfer succesfully from dev2 to user1 after liq added', async function () {
  //   await token.connect(dev2).transfer(user1.address, parseUnits('0.5', 'gwei'));
  //   expect(await token.connect(user1).balanceOf(user1.address)).to.be.gt(parseUnits('0.4', 'gwei'));
  // });

  it('should allow lots of buys and sells', async function () {
    await token.endLaunchProtection();
    // await token.setLaunchWhitelist(user3.address, true);
    let balance = await token.balanceOf(user2.address);
    for (let index = 0; index < 20; index++) {
      await this.uniswapRouter
        .connect(user2)
        .swapExactETHForTokensSupportingFeeOnTransferTokens(
          0,
          ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', token.address],
          user2.address,
          Math.floor(Date.now() / 1000) + 60 * 10,
          { value: parseEther('0.05') }
        );
      const newBalance = await token.balanceOf(user2.address);
      expect(newBalance).to.be.gt(balance);
      console.log("here");
      // token.connect(user2).transfer(user3.address, '1');
      balance = newBalance;
    }
  });

  it('should work with lots of sells', async function () {
    let balance = await ethers.provider.getBalance(user2.address);
    const balanceDiv20 = (await token.balanceOf(user2.address)).div(20);

    await token.connect(user2).approve(this.uniswapRouter.address, parseEther('100'));
    for (let index = 0; index < 15; index++) {
      await this.uniswapRouter
        .connect(user2)
        .swapExactTokensForETHSupportingFeeOnTransferTokens(
          balanceDiv20,
          0,
          [token.address, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
          user2.address,
          Math.floor(Date.now() / 1000) + 60 * 10
        );
      const newBalance = await ethers.provider.getBalance(user2.address);
      expect(newBalance).to.be.gt(balance);
      balance = newBalance;
    }
  });

  it('should transfer succesfully from dev1 to dev2', async function () {
    await token.connect(dev2).transfer(user3.address, parseUnits('0.5', 'gwei'));
  });
});
