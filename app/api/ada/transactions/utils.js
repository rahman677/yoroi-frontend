// @flow
import { groupBy, keyBy, mapValues } from 'lodash';
import BigNumber from 'bignumber.js';
import type {
  UserAnnotation,
} from './types';
import type {
  RemoteUnspentOutput,
} from '../lib/state-fetch/types';
import {
  transactionTypes,
} from './types';
import type {
  UtxoTransactionInputRow,
  UtxoTransactionOutputRow,
} from '../lib/storage/database/transactionModels/utxo/tables';
import type {
  DbTransaction,
  DbBlock,
  DbTokenInfo
} from '../lib/storage/database/primitives/tables';
import type {
  AccountingTransactionInputRow,
  AccountingTransactionOutputRow,
} from '../lib/storage/database/transactionModels/account/tables';
import type { TransactionExportRow } from '../../export';
import {
  HARD_DERIVATION_START,
  CoinTypes,
} from '../../../config/numbersConfig';
import type {
  Addressing,
} from '../lib/storage/models/PublicDeriver/interfaces';
import {
  Bip44DerivationLevels,
} from '../lib/storage/database/walletTypes/bip44/api/utils';
import { getAdaCurrencyMeta } from '../currencyInfo';
import { formatBigNumberToFloatString } from '../../../utils/formatters';
import {
  MultiToken,
} from '../../common/lib/MultiToken';
import {
  PRIMARY_ASSET_CONSTANTS,
} from '../lib/storage/database/primitives/enums';

export function getFromUserPerspective(data: {|
  utxoInputs: $ReadOnlyArray<$ReadOnly<UtxoTransactionInputRow>>,
  utxoOutputs: $ReadOnlyArray<$ReadOnly<UtxoTransactionOutputRow>>,
  accountingInputs?: $ReadOnlyArray<$ReadOnly<AccountingTransactionInputRow>>,
  accountingOutputs?: $ReadOnlyArray<$ReadOnly<AccountingTransactionOutputRow>>,
  ownImplicitInput?: MultiToken,
  ownImplicitOutput?: MultiToken,
  allOwnedAddressIds: Set<number>,
  ...DbTokenInfo,
|}): UserAnnotation {
  const unifiedInputs = [
    ...data.utxoInputs,
    ...(data.accountingInputs ?? []),
  ];
  const unifiedOutputs = [
    ...data.utxoOutputs,
    ...(data.accountingOutputs ?? []),
  ];
  const ownInputs = unifiedInputs.filter(input => (
    data.allOwnedAddressIds.has(input.AddressId)
  ));

  const ownOutputs = unifiedOutputs.filter(output => (
    data.allOwnedAddressIds.has(output.AddressId)
  ));

  const totalIn = sumInputsOutputs(unifiedInputs, data.tokens);
  const totalOut = sumInputsOutputs(unifiedOutputs, data.tokens);
  const ownIn = sumInputsOutputs(ownInputs, data.tokens)
    .joinAddCopy(data.ownImplicitInput ?? new MultiToken([]));
  const ownOut = sumInputsOutputs(ownOutputs, data.tokens)
    .joinAddCopy(data.ownImplicitOutput ?? new MultiToken([]));

  const hasOnlyOwnInputs = ownInputs.length === unifiedInputs.length;
  const hasOnlyOwnOutputs = ownOutputs.length === unifiedOutputs.length;

  const isIntraWallet = hasOnlyOwnInputs && hasOnlyOwnOutputs;
  const isMultiParty =
    ownInputs.length > 0 && ownInputs.length !== unifiedInputs.length;

  const brutto = ownOut.joinSubtractCopy(ownIn);
  const totalFee = totalOut.joinSubtractCopy(totalIn); // should be negative

  if (isIntraWallet) {
    return {
      type: transactionTypes.SELF,
      amount: new MultiToken([]),
      fee: totalFee,
    };
  }
  if (isMultiParty) {
    return {
      type: transactionTypes.MULTI,
      amount: brutto,
      // note: fees not accurate but no logical way of finding which UTXO paid the fees
      fee: new MultiToken([]),
    };
  }
  if (hasOnlyOwnInputs) {
    return {
      type: transactionTypes.EXPEND,
      amount: brutto.joinSubtractCopy(totalFee),
      fee: totalFee,
    };
  }

  return {
    type: transactionTypes.INCOME,
    amount: brutto,
    fee: new MultiToken([]),
  };
}

export function convertAdaTransactionsToExportRows(
  transactions: $ReadOnlyArray<$ReadOnly<{
  ...DbTransaction,
  ...WithNullableFields<DbBlock>,
  ...UserAnnotation,
  ...,
}>>
): Array<TransactionExportRow> {
  const result = [];
  const amountPerUnit = new BigNumber(10).pow(getAdaCurrencyMeta().decimalPlaces);
  for (const tx of transactions) {
    if (tx.block != null) {
      result.push({
        date: tx.block.BlockTime,
        type: tx.type === transactionTypes.INCOME ? 'in' : 'out',
        amount: formatBigNumberToFloatString(
          tx.amount.get(PRIMARY_ASSET_CONSTANTS.Cardano)?.abs().dividedBy(amountPerUnit)
            || new BigNumber(0)
        ),
        fee: formatBigNumberToFloatString(
          tx.fee.get(PRIMARY_ASSET_CONSTANTS.Cardano)?.abs().dividedBy(amountPerUnit)
            || new BigNumber(0)
        ),
      });
    }
  }
  return result;
}

export function sumInputsOutputs(
  ios: $ReadOnlyArray<$ReadOnly<
    UtxoTransactionInputRow | UtxoTransactionOutputRow |
    AccountingTransactionInputRow | AccountingTransactionOutputRow
  >>,
  tokens: $PropertyType<DbTokenInfo, 'tokens'>,
): MultiToken {
  const usedTokens = ios
    .reduce(
      (acc, next) => {
        for (const entry of tokens.filter(token => token.TokenList.ListId === next.TokenListId)) {
          acc.push(entry);
        }
        return acc;
      },
      []
    );
  return new MultiToken(usedTokens.map(token => ({
    identifier: token.Token.Identifier,
    amount: new BigNumber(token.TokenList.Amount),
    networkId: token.Token.NetworkId,
  })));
}

export type UtxoLookupMap = { [string]: { [number]: RemoteUnspentOutput, ... }, ... };
export function utxosToLookupMap(
  utxos: Array<RemoteUnspentOutput>
): UtxoLookupMap {
  // first create 1-level map of (tx_hash -> [UTXO])
  const txHashMap = groupBy(utxos, utxo => utxo.tx_hash);

  // now create 2-level map of (tx_hash -> index -> UTXO)
  const lookupMap = mapValues(
    txHashMap,
    utxoList => keyBy(
      utxoList,
      utxo => utxo.tx_index
    )
  );
  return lookupMap;
}

export function derivePathPrefix(purpose: number, accountIndex: number): string {
  if (accountIndex < HARD_DERIVATION_START) {
    throw new Error(`${nameof(derivePathPrefix)} accountIndex < 0x80000000`);
  }
  if (purpose < HARD_DERIVATION_START) {
    throw new Error(`${nameof(derivePathPrefix)} purpose < 0x80000000`);
  }
  // https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
  return `m/${purpose - HARD_DERIVATION_START}'/${CoinTypes.CARDANO - HARD_DERIVATION_START}'/${accountIndex - HARD_DERIVATION_START}'`;
}

export function verifyFromBip44Root(request: $ReadOnly<{|
  ...$PropertyType<Addressing, 'addressing'>,
|}>): void {
  const accountPosition = request.startLevel;
  if (accountPosition !== Bip44DerivationLevels.PURPOSE.level) {
    throw new Error(`${nameof(verifyFromBip44Root)} addressing does not start from root`);
  }
  const lastLevelSpecified = request.startLevel + request.path.length - 1;
  if (lastLevelSpecified !== Bip44DerivationLevels.ADDRESS.level) {
    throw new Error(`${nameof(verifyFromBip44Root)} incorrect addressing size`);
  }
}
