# ASKMarket smart-contract integration (testnet preparation)

## Supplied identifier

- Display name/signature supplied by the project owner: `ASKMarket()`
- Supplied 4-byte value: `0xa397fc12`
- Intended initial network: Sepolia (chain ID `11155111`)

A 4-byte EVM selector is the first four bytes of the Keccak-256 hash of a
canonical function signature. The supplied value is recorded in
`ASKMarketSelector.sol` as **provisional metadata only**. It has not yet been
verified to equal `bytes4(keccak256("ASKMarket()"))`. Do not dispatch calls,
publish an ABI, or advertise this as a verified function until that comparison
has been independently reproduced and reviewed. Selector collisions are
possible.

## Current implementation boundary

This repository change does not deploy a contract and does not include a
contract address, bytecode, ABI, token, escrow, custody service, or payment
provider. The selector library is not a callable application contract.

The web interface may display the supplied signature and selector, and may
read the connected wallet's current chain ID. It must not submit transactions,
request signatures, approve tokens, or move funds.

## Non-custodial wallet model

- Users connect their own EIP-1193 wallet and approve connection themselves.
- ASKMarket must never request or store seed phrases or private keys.
- Transaction signing, when introduced after review, must occur in the user's
  wallet with clear human-readable chain, destination, value, and calldata.
- Never trust a browser-provided balance or transaction status as settlement.
- No server-side private keys and no client-side ledger writes.

## Required gates before any testnet write interaction

1. Independently verify `0xa397fc12` against the exact canonical signature.
2. Define and review the contract's complete purpose, roles, state machine,
   events, failure modes, and upgrade policy.
3. Write the contract and unit/property tests; run static analysis and an
   independent security review.
4. Deploy only to Sepolia using a dedicated test wallet; record the verified
   deployment address, ABI, compiler settings, and source verification link.
5. Add explicit chain-ID and contract-address allowlists and wallet-side
   simulation/confirmation UX.
6. Test reverts, replay/idempotency, access control, reentrancy, pause/emergency
   behavior, and event reconciliation.

## Production remains disabled

No mainnet deployment, real-money transfer, deposit, withdrawal, escrow,
custody, token approval, or payout is enabled by this change. Production
activation requires separate explicit authorization, applicable Kenyan legal
and regulatory review, provider onboarding, operational controls, and an
independent security audit.
