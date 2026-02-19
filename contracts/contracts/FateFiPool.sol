// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FateFiPool
 * @notice Daily prediction pool — users stake fixed ETH on bullish/bearish/volatile.
 *         At midnight IST the admin resolves the day, and winners split the pool equally.
 */
contract FateFiPool {
    // ─── Types ───────────────────────────────────────────
    enum Option { Bullish, Bearish, Volatile }

    struct DayPool {
        uint256 totalStaked;
        uint256[3] optionTotals;    // ETH staked per option
        uint256[3] optionCounts;    // number of stakers per option
        uint8 winningOption;
        bool resolved;
        bool exists;
    }

    struct Stake {
        Option option;
        bool exists;
        bool claimed;
    }

    // ─── State ───────────────────────────────────────────
    address public admin;
    uint256 public stakeAmount;         // fixed stake in wei

    // dayId => DayPool
    mapping(uint256 => DayPool) public days_;

    // dayId => user => Stake
    mapping(uint256 => mapping(address => Stake)) public stakes;

    uint256 public currentDay;

    // ─── Events ──────────────────────────────────────────
    event Staked(address indexed user, uint256 indexed dayId, Option option, uint256 amount);
    event DayResolved(uint256 indexed dayId, Option winner, uint256 totalPool, uint256 winnerCount);
    event Claimed(address indexed user, uint256 indexed dayId, uint256 payout);
    event NewDay(uint256 indexed dayId);

    // ─── Modifiers ───────────────────────────────────────
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    // ─── Constructor ─────────────────────────────────────
    constructor(uint256 _stakeAmount) {
        admin = msg.sender;
        stakeAmount = _stakeAmount;
        currentDay = 1;
        days_[1].exists = true;
        emit NewDay(1);
    }

    // ─── Stake ───────────────────────────────────────────
    /**
     * @notice Stake on an option for the current day.
     * @param option 0 = Bullish, 1 = Bearish, 2 = Volatile
     */
    function stake(uint8 option) external payable {
        require(option <= 2, "Invalid option");
        require(msg.value == stakeAmount, "Wrong stake amount");

        DayPool storage day = days_[currentDay];
        require(day.exists, "Day not open");
        require(!day.resolved, "Day already resolved");
        require(!stakes[currentDay][msg.sender].exists, "Already staked today");

        stakes[currentDay][msg.sender] = Stake({
            option: Option(option),
            exists: true,
            claimed: false
        });

        day.totalStaked += msg.value;
        day.optionTotals[option] += msg.value;
        day.optionCounts[option] += 1;

        emit Staked(msg.sender, currentDay, Option(option), msg.value);
    }

    // ─── Resolve ─────────────────────────────────────────
    /**
     * @notice Admin resolves the current day with the winning option.
     *         Advances to the next day automatically.
     * @param winner 0 = Bullish, 1 = Bearish, 2 = Volatile
     */
    function resolve(uint8 winner) external onlyAdmin {
        require(winner <= 2, "Invalid winner");

        DayPool storage day = days_[currentDay];
        require(day.exists, "Day not open");
        require(!day.resolved, "Already resolved");

        day.winningOption = winner;
        day.resolved = true;

        uint256 winnerCount = day.optionCounts[winner];

        emit DayResolved(currentDay, Option(winner), day.totalStaked, winnerCount);

        // If no winners, pool stays in contract (admin can withdraw or it rolls into next day)

        // Advance to next day
        currentDay += 1;
        days_[currentDay].exists = true;
        emit NewDay(currentDay);
    }

    // ─── Claim ───────────────────────────────────────────
    /**
     * @notice Winners claim their share of the pool.
     * @param dayId The day to claim for.
     */
    function claim(uint256 dayId) external {
        DayPool storage day = days_[dayId];
        require(day.resolved, "Day not resolved yet");

        Stake storage userStake = stakes[dayId][msg.sender];
        require(userStake.exists, "No stake found");
        require(!userStake.claimed, "Already claimed");
        require(uint8(userStake.option) == day.winningOption, "Not a winner");

        userStake.claimed = true;

        uint256 winnerCount = day.optionCounts[day.winningOption];
        uint256 payout = day.totalStaked / winnerCount;

        (bool sent, ) = payable(msg.sender).call{value: payout}("");
        require(sent, "Transfer failed");

        emit Claimed(msg.sender, dayId, payout);
    }

    // ─── Views ───────────────────────────────────────────

    function getDayInfo(uint256 dayId) external view returns (
        uint256 totalStaked,
        uint256[3] memory optionTotals,
        uint256[3] memory optionCounts,
        bool resolved,
        uint8 winningOption
    ) {
        DayPool storage day = days_[dayId];
        return (
            day.totalStaked,
            day.optionTotals,
            day.optionCounts,
            day.resolved,
            day.winningOption
        );
    }

    function getUserStake(uint256 dayId, address user) external view returns (
        bool exists,
        uint8 option,
        bool claimed
    ) {
        Stake storage s = stakes[dayId][user];
        return (s.exists, uint8(s.option), s.claimed);
    }

    // ─── Admin ───────────────────────────────────────────

    function setAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }

    function setStakeAmount(uint256 _stakeAmount) external onlyAdmin {
        stakeAmount = _stakeAmount;
    }

    /// @notice Withdraw unclaimed/unwinnable funds (e.g., from days with 0 winners)
    function withdrawUnclaimed(uint256 amount) external onlyAdmin {
        (bool sent, ) = payable(admin).call{value: amount}("");
        require(sent, "Transfer failed");
    }
}
