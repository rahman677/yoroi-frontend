// @flow
import { Wallet } from 'rust-cardano-crypto';
import { getCryptoWalletFromSeed } from './lib/cardanoCrypto/cryptoWallet';
import { getOrFail } from './lib/cardanoCrypto/cryptoUtils';
import {
  getFromStorage,
  saveInStorage
} from './lib/utils';
import type { WalletSeed } from './lib/cardanoCrypto/cryptoWallet';

const ACCOUNT_KEY = 'ACCOUNT'; // single wallet atm
const ACCOUNT_INDEX = 0; /* Currently we only provide a SINGLE account */

export function newCryptoAccount(
  seed: WalletSeed,
  walletPassword: string
): CryptoAccount {
  const cryptoAccount = createCryptoAccount(seed, walletPassword);
  saveCryptoAccount(cryptoAccount);
  return cryptoAccount;
}

export function createCryptoAccount(
  seed: WalletSeed,
  walletPassword: string,
  accountIndex: number = ACCOUNT_INDEX
): CryptoAccount {
  const cryptoWallet = getCryptoWalletFromSeed(seed, walletPassword);
  // This Ok object is the crypto account
  const { Ok } = getOrFail(Wallet.newAccount(cryptoWallet, accountIndex));
  return Ok;
}

export function saveCryptoAccount(
  ca: CryptoAccount
): void {
  saveInStorage(ACCOUNT_KEY, ca);
}

export function getSingleCryptoAccount(): CryptoAccount {
  return getFromStorage(ACCOUNT_KEY);
}