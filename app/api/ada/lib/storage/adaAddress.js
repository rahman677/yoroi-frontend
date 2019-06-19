// @flow

// Handles "Addresses" as defined in the bip44 specification
// Also handles interfacing with the LovefieldDB for everything related purely to addresses.

import _ from 'lodash';
import {
  toAdaAddress
} from './cryptoToModel';
import {
  saveAddresses,
  getAddresses,
  getAddressesList,
  getAddressesListByType,
} from './lovefieldDatabase';
import {
  getLastReceiveAddressIndex,
  saveLastReceiveAddressIndex
} from './adaLocalStorage';
import {
  UnusedAddressesError,
} from '../../../common';
import {
  getLatestUsedIndex,
} from './helpers';
import type {
  AdaAddresses,
  AdaAddress,
  AddressType
} from '../../adaTypes';
import type {
  SaveAsAdaAddressesRequeat,
  SaveAsAdaAddressesResponse,
} from './types';

export type AdaAddressMap = {[key: string]:AdaAddress}

/** Get a mapping of address hash to AdaAddress */
export function getAdaAddressesMap(): Promise<AdaAddressMap> {
  // Just return all existing addresses because we are using a SINGLE account
  // TODO: make this work for multiple accounts in case we add multiple accounts eventually
  return getAddresses().then(
    addresses => addressesToAddressMap(addresses.map(r => r.value))
  );
}

export function addressesToAddressMap(addresses: Array<AdaAddress>): AdaAddressMap {
  return _.keyBy(addresses, a => a.cadId);
}

/** Wrapper function for LovefieldDB call to get all AdaAddresses */
export function getAdaAddressesList(): Promise<Array<AdaAddress>> {
  return getAddressesList();
}

/** Wrapper function for LovefieldDB call to get all AdaAddresses by type */
export function getAdaAddressesByType(addressType: AddressType): Promise<AdaAddresses> {
  return getAddressesListByType(addressType);
}

/**
 * With bip44, we keep a buffer of unused addresses
 * This means when we need a new address, we just use one of the unused ones in our buffer
 *
 * Once this address appears in a transaction, it will be marked as "used" and a new address
 * will be generated by a different process to maintain bip44 compliance
 */
export async function popBip44Address(type: AddressType): Promise<AdaAddress> {
  return type === 'Internal'
    ? await popBip44InternalAddress()
    : await popBip44ExternalAddress();
}

async function popBip44InternalAddress(): Promise<AdaAddress> {
  const existingAddresses = await getAdaAddressesByType('Internal');
  const nextAddressIndex = (await getLatestUsedIndex('Internal')) + 1;
  if (nextAddressIndex === existingAddresses.length) {
    throw new UnusedAddressesError();
  }
  const poppedAddress = existingAddresses[nextAddressIndex];

  return poppedAddress;
}

async function popBip44ExternalAddress(): Promise<AdaAddress> {
  const existingAddresses = await getAdaAddressesByType('External');
  const nextAddressIndex = getLastReceiveAddressIndex() + 1;
  if (nextAddressIndex === existingAddresses.length) {
    throw new UnusedAddressesError();
  }
  const poppedAddress = existingAddresses[nextAddressIndex];
  saveLastReceiveAddressIndex(nextAddressIndex);

  return poppedAddress;
}

/** Wrapper function to save addresses to LovefieldDB
 * Also updates lastReceiveAddressIndex
 */
export async function saveAdaAddress(
  address: AdaAddress,
  addressType: AddressType
): Promise<void> {
  await saveAddresses([address], addressType);
}

/** Save list of addresses to lovefieldDB
 * Also updates lastReceiveAddressIndex
 */
export async function saveAsAdaAddresses(
  request: SaveAsAdaAddressesRequeat,
): Promise<SaveAsAdaAddressesResponse> {
  const mappedAddresses: Array<AdaAddress> = request.addresses.map((hash, index) => (
    toAdaAddress(
      request.accountIndex,
      request.addressType,
      index + request.offset,
      hash
    )
  ));
  await saveAddresses(mappedAddresses, request.addressType);
}

/** Follow heuristic to pick which address to send Daedalus/Redemption transfer to */
export async function getReceiverAddress(): Promise<string> {
  // Note: Current heuristic is to pick the first address in the wallet
  // rationale & better heuristic described at https://github.com/Emurgo/yoroi-frontend/issues/96
  const addresses = await getAdaAddressesByType('External');
  return addresses[0].cadId;
}
