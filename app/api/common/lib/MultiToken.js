// @flow

import {
  BigNumber
} from 'bignumber.js';
import {
  defaultAssets,
} from '../../ada/lib/storage/database/prepackaged/networks';

export type TokenEntry = {|
  /**
    * note: avoid putting asset metadata here directly
    * since it can update over time so best not to cache it here
    */
  identifier: string,
  amount: BigNumber,
  networkId: number,
|};
export class MultiToken {
  // this could be a map, but the # of elements is small enough the perf difference is trivial
  values: Array<TokenEntry>
  networkId: void | number;

  constructor(values: Array<TokenEntry>) {
    this.values = [];
    values.forEach(value => this.add(value));
  }

  _setOrThrowNetworkId: number => void = (networkId) => {
    if (this.networkId == null) {
      this.networkId = networkId;
      return;
    }
    const ownNetworkId = this.networkId;
    if (ownNetworkId !== networkId) {
      throw new Error(`${nameof(MultiToken)} network mismatch ${ownNetworkId} - ${networkId}`);
    }
  }

  get: string => BigNumber | void = (identifier) => {
    return this.values.find(value => value.identifier === identifier)?.amount;
  }

  add: TokenEntry => MultiToken = (entry) => {
    this._setOrThrowNetworkId(entry.networkId);
    const existingEntry = this.values.find(value => value.identifier === entry.identifier);
    if (existingEntry == null) {
      this.values.push(entry);
      return this;
    }
    existingEntry.amount = existingEntry.amount.plus(entry.amount);
    return this;
  }

  subtract: TokenEntry => MultiToken = (entry) => {
    return this.add({
      identifier: entry.identifier,
      amount: entry.amount.negated(),
      networkId: entry.networkId,
    });
  }

  joinAddMutable: MultiToken => MultiToken = (target) => {
    for (const entry of target.values) {
      this.add(entry);
    }
    return this;
  }
  joinSubtractMutable: MultiToken => MultiToken = (target) => {
    for (const entry of target.values) {
      this.subtract(entry);
    }
    return this;
  }
  joinAddCopy: MultiToken => MultiToken = (target) => {
    const copy = new MultiToken(this.values);
    return copy.joinAddMutable(target);
  }
  joinSubtractCopy: MultiToken => MultiToken = (target) => {
    const copy = new MultiToken(this.values);
    return copy.joinSubtractMutable(target);
  }

  absCopy: void => MultiToken = () => {
    return new MultiToken(
      this.values.map(token => ({ ...token, amount: token.amount.absoluteValue() }))
    );
  }

  negatedCopy: void => MultiToken = () => {
    return new MultiToken(
      this.values.map(token => ({ ...token, amount: token.amount.negated() }))
    );
  }

  /// TODO: this assumes there is only one primary, which isn't always the case
  getDefault: void => BigNumber = () => {
    if (this.networkId == null) return new BigNumber(0);
    const token = defaultAssets.find(asset => asset.NetworkId === this.networkId);
    if (token == null) return new BigNumber(0);
    const primary = this.values.find(value => value.identifier === token.Identifier);
    if (primary == null) return new BigNumber(0);
    return primary.amount;
  }

  asMap: void => Map<string, BigNumber> = () => {
    return new Map(this.values.map(value => [value.identifier, value.amount]));
  }

  isEqualTo: MultiToken => boolean = (tokens) => {
    const remainingTokens = this.asMap();

    // remove tokens that match <identifier, amount> one at a time
    // if by the end there are no tokens left, it means we had a perfect match
    for (const token of tokens.values) {
      const value = remainingTokens.get(token.identifier);
      if (value == null) return false;
      if (!value.isEqualTo(token.amount)) return false;
      remainingTokens.delete(token.identifier);
    }
    if (remainingTokens.size > 0) return false;
    return true;
  }

  isEmpty: void => boolean = () => {
    return this.values.filter(token => token.amount.gt(0)).length === 0;
  }
}
