// @flow

import {
  BigNumber
} from 'bignumber.js';

export type TokenEntry = {|
  /**
    * note: avoid putting asset metadata here directly
    * since it can update over time so best not to cache it here
    */
  identifier: string,
  amount: BigNumber,
|};
export class MultiToken {
  // this could be a map, but the # of elements is small enough the perf difference is trivial
  values: Array<TokenEntry>

  constructor(values: Array<TokenEntry>) {
    this.values = values;
  }

  get: string => BigNumber | void = (identifier) => {
    return this.values.find(value => value.identifier === identifier)?.amount;
  }

  add: TokenEntry => MultiToken = (entry) => {
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
      amount: entry.amount.negated()
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
}
