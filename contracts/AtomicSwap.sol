pragma solidity >=0.5.0 <0.7.0;

contract AtomicSwap {
    enum State {Empty, Initiator}

    struct Swap {
        uint256 initTimestamp;
        uint256 refundTime;
        bytes32 hashedSecret;
        bytes32 secret;
        address payable initiator;
        address payable participant;
        uint256 value;
        bool emptied;
        State state;
    }

    mapping(bytes32 => Swap) public swaps;

    event Refunded(uint256 _refundTime);
    event Redeemed(uint256 _redeemTime, bytes32 _secret);

    event LogSecrets(bytes32 _hashedSecret, bytes32 secret, bytes32 calculatedSecret);

    event Initiated(
        uint256 _initTimestamp,
        uint256 _refundTime,
        bytes32 _hashedSecret,
        address payable _initiator,
        address payable _participant,
        uint256 _funds
    );

    modifier isRefundable(bytes32 _hashedSecret) {
        require(
            block.timestamp >
                swaps[_hashedSecret].initTimestamp +
                    swaps[_hashedSecret].refundTime,
             "too early to redeem"
        );
        require(swaps[_hashedSecret].emptied == false, "swap already emptied");
        _;
    }

    modifier isRedeemable(bytes32 _hashedSecret, bytes32 _secret) {
        // bytes32 calculated = keccak256(abi.encodePacked(_secret));
        // emit LogSecrets(_hashedSecret, _secret, calculated);
        require(keccak256(abi.encodePacked(_secret)) == _hashedSecret, "secrets do not match");
        require(
            block.timestamp <
                swaps[_hashedSecret].initTimestamp +
                    swaps[_hashedSecret].refundTime,
            "too early to redeem"
        );
        require(swaps[_hashedSecret].emptied == false, "already emptied");
        _;
    }

    modifier isInitiator(bytes32 _hashedSecret) {
        require(
            msg.sender == swaps[_hashedSecret].initiator,
            "you are not the initator"
        );
        _;
    }

    modifier isNotInitiated(bytes32 _hashedSecret) {
        require(
            swaps[_hashedSecret].state == State.Empty,
            "must not be initiated"
        );
        _;
    }

    function initiate(
        uint256 _refundTime,
        bytes32 _hashedSecret,
        address payable _participant
    ) public payable isNotInitiated(_hashedSecret) {
        swaps[_hashedSecret].refundTime = _refundTime;
        swaps[_hashedSecret].initTimestamp = block.timestamp;
        swaps[_hashedSecret].hashedSecret = _hashedSecret;
        swaps[_hashedSecret].participant = _participant;
        swaps[_hashedSecret].initiator = msg.sender;
        swaps[_hashedSecret].state = State.Initiator;
        swaps[_hashedSecret].value = msg.value;
        emit Initiated(
            swaps[_hashedSecret].initTimestamp,
            _refundTime,
            _hashedSecret,
            _participant,
            msg.sender,
            msg.value
        );
    }

    function redeem(bytes32 _secret, bytes32 _hashedSecret) public
        isRedeemable(_hashedSecret, _secret)
    {

        swaps[_hashedSecret].participant.transfer(swaps[_hashedSecret].value);

        swaps[_hashedSecret].emptied = true;
        emit Redeemed(block.timestamp, _secret);
        // swaps[_hashedSecret].secret = _secret;
    }

    function refund(bytes32 _hashedSecret) public isRefundable(_hashedSecret) {
        swaps[_hashedSecret].participant.transfer(
            swaps[_hashedSecret].value
        );
        
        swaps[_hashedSecret].emptied = true;
        emit Refunded(block.timestamp);
    }
}
