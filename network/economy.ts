/**
 * The economic layer.
 *
 * The verification network already in place answers "can this instruction be
 * trusted". This layer answers "what is being moved, and against what" — assets
 * on one side, money on the other, and settlement as the thing that binds the
 * two legs into one event.
 *
 * It is modelled rather than animated, for the same reason the base network is:
 * a transaction that moves through named states can be rendered, narrated, and
 * later driven by real data, whereas a sequence of tweens can only be watched.
 */

/** The three economic districts, plus the layer they all stand on. */
export const enum District {
  Assets = 0,
  Money = 1,
  Settlement = 2,
  Trust = 3,
}

export const DISTRICT_COUNT = 4;

/** Participant classes specific to the economic layer. */
export const enum EconomicNodeType {
  /** A defined set of rights to something in the world, represented digitally. */
  Asset = 0,
  /** A unit of the monetary leg. */
  Money = 1,
  /** Where the two legs are coordinated. */
  Settlement = 2,
  /** Identity, verification, evidence — what the other three stand on. */
  Trust = 3,
  /** A buyer, a seller, an issuer, a custodian. */
  Participant = 4,
}

/**
 * Stages of an asset becoming a network object.
 *
 * Deliberately stops at "settle": what happens to the asset afterwards is a
 * question about the legal wrapper, not about the network, and the site does not
 * answer questions it has no standing to answer.
 */
export const enum AssetStage {
  /** Establish what the asset is and who holds what rights to it. */
  Verify = 0,
  /** Express those rights, and the conditions on them, in a defined form. */
  Structure = 1,
  /** Turn the defined rights into a programmable digital representation. */
  Tokenise = 2,
  /** The representation enters the network as a participant. */
  Issue = 3,
  /** It moves between holders. */
  Transfer = 4,
  /** It reaches the point where value moves against it. */
  Settle = 5,
}

export const ASSET_STAGE_COUNT = 6;

/** Stages of the monetary leg. A closed loop, unlike the asset lifecycle. */
export const enum MoneyStage {
  Issue = 0,
  Hold = 1,
  Transfer = 2,
  Redeem = 3,
}

export const MONEY_STAGE_COUNT = 4;

/**
 * The state of a transaction as its two legs come together.
 *
 * `AssetReady` and `MoneyReady` are separate states on purpose: the entire
 * point of delivery-versus-payment is that both legs can be independently
 * prepared and only then linked, and a model that collapsed them into one state
 * could not express what settlement is for.
 */
export const enum TransactionState {
  Created = 0,
  Verified = 1,
  Authorised = 2,
  AssetReady = 3,
  MoneyReady = 4,
  Settling = 5,
  Settled = 6,
  Failed = 7,
}

export interface Transaction {
  id: number;
  state: TransactionState;
  /** 0..1 progress of the asset leg toward the settlement point. */
  assetLeg: number;
  /** 0..1 progress of the money leg toward the settlement point. */
  moneyLeg: number;
  /** Rises once both legs are in place, then holds. */
  confirmation: number;
}

/** A transaction that has not started. */
export function createTransaction(id: number): Transaction {
  return { id, state: TransactionState.Created, assetLeg: 0, moneyLeg: 0, confirmation: 0 };
}

/**
 * Advances a transaction from the progress of its two legs.
 *
 * Settlement is a conjunction, not a sequence: neither leg completing on its own
 * moves the transaction past "ready". That is the whole idea being illustrated,
 * so it is expressed here as a condition rather than left to the timing of two
 * animations that happen to finish together.
 */
export function advance(transaction: Transaction, assetLeg: number, moneyLeg: number, dt: number) {
  transaction.assetLeg = assetLeg;
  transaction.moneyLeg = moneyLeg;

  const assetReady = assetLeg >= 0.995;
  const moneyReady = moneyLeg >= 0.995;

  if (assetReady && moneyReady) {
    transaction.state =
      transaction.confirmation >= 1 ? TransactionState.Settled : TransactionState.Settling;
    transaction.confirmation = Math.min(1, transaction.confirmation + dt * 1.6);
  } else {
    transaction.confirmation = Math.max(0, transaction.confirmation - dt * 2.4);
    if (assetReady) transaction.state = TransactionState.AssetReady;
    else if (moneyReady) transaction.state = TransactionState.MoneyReady;
    else if (assetLeg > 0.05 || moneyLeg > 0.05) transaction.state = TransactionState.Authorised;
    else transaction.state = TransactionState.Created;
  }
  return transaction;
}

export const TRANSACTION_LABEL: Record<TransactionState, string> = {
  [TransactionState.Created]: 'Created',
  [TransactionState.Verified]: 'Verified',
  [TransactionState.Authorised]: 'Authorised',
  [TransactionState.AssetReady]: 'Asset ready',
  [TransactionState.MoneyReady]: 'Money ready',
  [TransactionState.Settling]: 'Settling',
  [TransactionState.Settled]: 'Settled',
  [TransactionState.Failed]: 'Failed',
};

/**
 * Where each district sits in the world.
 *
 * Placed well outside the consensus cloud and far enough apart to be approached
 * individually, but on the same anisotropic plane as the rest of the network so
 * they read as parts of it rather than as satellites bolted on.
 */
export const DISTRICT_ANCHOR: Record<District, [number, number, number]> = {
  [District.Assets]: [-44, 6, 22],
  [District.Money]: [44, 4, 22],
  [District.Settlement]: [0, -5, -46],
  [District.Trust]: [0, -22, 0],
};

export const DISTRICT_NAME: Record<District, string> = {
  [District.Assets]: 'Assets',
  [District.Money]: 'Money',
  [District.Settlement]: 'Settlement',
  [District.Trust]: 'Trust',
};
