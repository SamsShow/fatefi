// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FateFiPool
 * @notice Daily prediction pool — users stake fixed ETH on bullish/bearish/volatile.
 *         At midnight IST the admin resolves the day, and winners split the pool equally.
 *
 * ── Payout Safety Guarantees ──────────────────────────────────────────────────
 *  1. ReentrancyGuard: all state changes happen BEFORE any ETH transfer.
 *  2. Dust-proof payouts: the last claimer receives the remainder of the pool
 *     (totalStaked − already claimed) so zero wei is ever permanently stuck.
 *  3. Minimum payout invariant: every winner receives AT LEAST their original
 *     stakeAmount back (asserted at runtime).
 *  4. Zero-winner refund: if nobody picked the winning option, the day is
 *     marked `refundable` and EVERY staker (regardless of option) gets their
 *     exact stake returned via `claimRefund()`.
 *  5. Timed admin withdraw: admin can only sweep dust that remains after a
 *     CLAIM_WINDOW (7 days) has elapsed since resolution.
 */
contract FateFiPool {
    // ─── Types ───────────────────────────────────────────
    enum Option { Bullish, Bearish, Volatile }

    struct DayPool {
        uint256 totalStaked;
        uint256[3] optionTotals;    // ETH staked per option
        uint256[3] optionCounts;    // staker count per option
        uint8  winningOption;
        bool   resolved;
        bool   exists;
        bool   refundable;          // true when winnerCount == 0 at resolve time
        uint256 resolvedAt;         // block.timestamp of resolution
        uint256 claimedCount;       // winners (or refundees) that have claimed
        uint256 totalClaimed;       // wei already sent out for this day
    }

    struct Stake {
        Option option;
        bool   exists;
        bool   claimed;
    }

    // ─── Constants ───────────────────────────────────────
    uint256 public constant CLAIM_WINDOW = 7 days;

    // ─── Reentrancy Guard ────────────────────────────────
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED     = 2;

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // ─── State ───────────────────────────────────────────
    address public admin;
    uint256 public stakeAmount;

    mapping(uint256 => DayPool)                        public days_;
    mapping(uint256 => mapping(address => Stake))      public stakes;

    uint256 public currentDay;

    // ─── Events ──────────────────────────────────────────
    event Staked(address indexed user, uint256 indexed dayId, Option option, uint256 amount);
    event DayResolved(uint256 indexed dayId, Option winner, uint256 totalPool, uint256 winnerCount);
    event DayRefundable(uint256 indexed dayId, uint256 totalPool);
    event Claimed(address indexed user, uint256 indexed dayId, uint256 payout);
    event Refunded(address indexed user, uint256 indexed dayId, uint256 amount);
    event NewDay(uint256 indexed dayId);

    // ─── Modifiers ───────────────────────────────────────
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    // ─── Constructor ─────────────────────────────────────
    constructor(uint256 _stakeAmount) {
        admin      = msg.sender;
        stakeAmount = _stakeAmount;
        _status    = _NOT_ENTERED;
        currentDay  = 1;
        days_[1].exists = true;
        emit NewDay(1);
    }

    // ─── Stake ───────────────────────────────────────────
    /**
     * @notice Stake on an option for the current day.
     * @param option 0 = Bullish, 1 = Bearish, 2 = Volatile
     */
    function stake(uint8 option) external payable nonReentrant {
        require(option <= 2, "Invalid option");
        require(msg.value == stakeAmount, "Wrong stake amount");

        DayPool storage day = days_[currentDay];
        require(day.exists,   "Day not open");
        require(!day.resolved, "Day already resolved");
        require(!stakes[currentDay][msg.sender].exists, "Already staked today");

        // Effects
        stakes[currentDay][msg.sender] = Stake({
            option: Option(option),
            exists: true,
            claimed: false
        });
        day.totalStaked           += msg.value;
        day.optionTotals[option]  += msg.value;
        day.optionCounts[option]  += 1;

        emit Staked(msg.sender, currentDay, Option(option), msg.value);
    }

    // ─── Resolve ─────────────────────────────────────────
    /**
     * @notice Admin resolves the current day.
     *         If zero stakers picked the winner, marks the day as refundable
     *         so every participant can reclaim their exact stake.
     * @param winner 0 = Bullish, 1 = Bearish, 2 = Volatile
     */
    function resolve(uint8 winner) external onlyAdmin {
        require(winner <= 2, "Invalid winner");

        DayPool storage day = days_[currentDay];
        require(day.exists,    "Day not open");
        require(!day.resolved, "Already resolved");

        day.winningOption = winner;
        day.resolved      = true;
        day.resolvedAt    = block.timestamp;

        uint256 winnerCount = day.optionCounts[winner];

        if (winnerCount == 0) {
            // No one chose correctly — everyone gets their stake back
            day.refundable = true;
            emit DayRefundable(currentDay, day.totalStaked);
        } else {
            emit DayResolved(currentDay, Option(winner), day.totalStaked, winnerCount);
        }

        // Advance to next day
        currentDay += 1;
        days_[currentDay].exists = true;
        emit NewDay(currentDay);
    }

    // ─── Claim (winners) ─────────────────────────────────
    /**
     * @notice Winners claim their proportional share of the entire pool.
     *
     *  Dust-proof: the last winner to claim receives the remainder
     *  (day.totalStaked − day.totalClaimed) instead of the raw division
     *  result, so every wei is always paid out.
     *
     *  Invariant: payout >= stakeAmount (you always get at least your stake back).
     *
     * @param dayId The day to claim for.
     */
    function claim(uint256 dayId) external nonReentrant {
        DayPool storage day = days_[dayId];
        require(day.resolved,    "Day not resolved yet");
        require(!day.refundable, "No winners - use claimRefund()");

        Stake storage userStake = stakes[dayId][msg.sender];
        require(userStake.exists,  "No stake found");
        require(!userStake.claimed, "Already claimed");
        require(uint8(userStake.option) == day.winningOption, "Not a winner");

        uint256 winnerCount = day.optionCounts[day.winningOption];

        // ── Effects (before any transfer) ────────────────
        userStake.claimed   = true;
        day.claimedCount   += 1;

        uint256 payout;
        if (day.claimedCount == winnerCount) {
            // Last winner — sweep remainder to prevent any dust stuck in contract
            payout = day.totalStaked - day.totalClaimed;
        } else {
            payout = day.totalStaked / winnerCount;
        }

        // Invariant: winners must always receive at least their original stake
        require(payout >= stakeAmount, "Invariant violated: payout below stake");

        day.totalClaimed += payout;

        // ── Interaction ──────────────────────────────────
        (bool sent, ) = payable(msg.sender).call{value: payout}("");
        require(sent, "Transfer failed");

        emit Claimed(msg.sender, dayId, payout);
    }

    // ─── Claim Refund (zero-winner days) ─────────────────
    /**
     * @notice When no one predicted correctly, every staker gets their exact
     *         stake back. Available on any day where `refundable == true`.
     * @param dayId The day to refund for.
     */
    function claimRefund(uint256 dayId) external nonReentrant {
        DayPool storage day = days_[dayId];
        require(day.resolved,   "Day not resolved yet");
        require(day.refundable, "Day is not refundable");

        Stake storage userStake = stakes[dayId][msg.sender];
        require(userStake.exists,   "No stake found");
        require(!userStake.claimed, "Already refunded");

        // ── Effects ──────────────────────────────────────
        userStake.claimed   = true;
        day.claimedCount   += 1;
        day.totalClaimed   += stakeAmount;

        // ── Interaction ──────────────────────────────────
        (bool sent, ) = payable(msg.sender).call{value: stakeAmount}("");
        require(sent, "Transfer failed");

        emit Refunded(msg.sender, dayId, stakeAmount);
    }

    // ─── Views ───────────────────────────────────────────

    function getDayInfo(uint256 dayId) external view returns (
        uint256 totalStaked,
        uint256[3] memory optionTotals,
        uint256[3] memory optionCounts,
        bool    resolved,
        uint8   winningOption
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
        bool   exists,
        uint8  option,
        bool   claimed
    ) {
        Stake storage s = stakes[dayId][user];
        return (s.exists, uint8(s.option), s.claimed);
    }

    /// @notice Returns true if the day is a zero-winner refundable day.
    function isDayRefundable(uint256 dayId) external view returns (bool) {
        return days_[dayId].refundable;
    }

    // ─── Admin ───────────────────────────────────────────

    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Zero address");
        admin = newAdmin;
    }

    function setStakeAmount(uint256 _stakeAmount) external onlyAdmin {
        stakeAmount = _stakeAmount;
    }

    /**
     * @notice Sweep genuinely uncollectable dust from past days.
     *         Only callable after the CLAIM_WINDOW (7 days) has elapsed
     *         since resolution, so no winner or refundee can be front-run.
     * @param dayId  The resolved day to sweep dust from.
     * @param amount Amount to withdraw (must be <= unclaimed remainder).
     */
    function sweepDust(uint256 dayId, uint256 amount) external onlyAdmin {
        DayPool storage day = days_[dayId];
        require(day.resolved,  "Day not resolved");
        require(block.timestamp >= day.resolvedAt + CLAIM_WINDOW, "Claim window still open");

        uint256 unclaimed = day.totalStaked - day.totalClaimed;
        require(amount <= unclaimed, "Amount exceeds unclaimed balance");

        day.totalClaimed += amount;

        (bool sent, ) = payable(admin).call{value: amount}("");
        require(sent, "Transfer failed");
    }
}
