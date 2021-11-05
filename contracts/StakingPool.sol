// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "./external/SafeMath.sol";
import "./external/ReentrancyGuard.sol";
import "./external/Ownable.sol";
import "./external/ReentrancyGuard.sol";
import "./XAEA12.sol";

contract XaeStakingPool is ReentrancyGuard, Ownable {
    using SafeMath for uint256;

    uint256 private constant UINT256_MAX = ~uint256(0);
    uint256 private constant MONTH = 30 days;

    XAEA12 private _tokenInstance;

    uint256 private _deployedAt;

    uint256 public _totalStaked;
    mapping(address => uint256) private _staked;
    mapping(address => uint256) private _lastClaim;
    address private _developerFund;

    event StakeIncreased(address indexed staker, uint256 amount);
    event StakeDecreased(address indexed staker, uint256 amount);
    event Rewards(
        address indexed staker,
        uint256 mintage,
        uint256 developerFund
    );

    constructor() public {
        _developerFund = msg.sender;
        _deployedAt = block.timestamp;
    }

    function setToken(address payable tokenAddress) external onlyOwner {
        require(address(_tokenInstance) == address(0));
        _tokenInstance = XAEA12(tokenAddress);
    }

    function upgradeDevelopmentFund(address fund) external onlyOwner {
        _developerFund = fund;
    }

    function token() external view returns (address) {
        return address(_tokenInstance);
    }

    function totalStaked() external view returns (uint256) {
        return _totalStaked;
    }

    function staked(address staker) external view returns (uint256) {
        return _staked[staker];
    }

    function lastClaim(address staker) external view returns (uint256) {
        return _lastClaim[staker];
    }

    function increaseStake(uint256 amount) external {
        require(_tokenInstance.transferFrom(msg.sender, address(this), amount));
        _totalStaked = _totalStaked.add(amount);
        _lastClaim[msg.sender] = block.timestamp;
        _staked[msg.sender] = _staked[msg.sender].add(amount);
        emit StakeIncreased(msg.sender, amount);
    }

    function decreaseStake(uint256 amount) external {
        _staked[msg.sender] = _staked[msg.sender].sub(amount);
        _totalStaked = _totalStaked.sub(amount);
        require(_tokenInstance.transfer(address(msg.sender), amount));
        emit StakeDecreased(msg.sender, amount);
    }

    function _calculateMintage(address staker) private view returns (uint256) {
        uint256 stakedAmount = _staked[staker];
        uint256 timeElapsed = block.timestamp.sub(_lastClaim[staker]);
        uint256 mintage = 0;

        if (timeElapsed > 60) {
            uint256 minutesElapsed = timeElapsed.div(60);
            mintage = stakedAmount.mul(minutesElapsed).mul(20).div(15).div(
                30 * 24 * 60
            );
        }
        return mintage;
    }

    function calculateRewards(address staker) public view returns (uint256) {
        return _calculateMintage(staker).div(20).mul(19);
    }

    function claimRewards() external nonReentrant {
        uint256 mintage = _calculateMintage(msg.sender);
        uint256 mintagePiece = mintage.div(20);
        require(mintagePiece > 0, "You are not entitled to any rewards!");

        _lastClaim[msg.sender] = block.timestamp;
        _tokenInstance.transfer(msg.sender, mintage.sub(mintagePiece));
        _tokenInstance.transfer(_developerFund, mintagePiece);

        emit Rewards(msg.sender, mintage, mintagePiece);
    }
}
