// @flow
import { action } from 'mobx';
import type {
  UserAnnotation,
} from '../api/ada/transactions/types';
import type {
  CardanoByronTxIO,
} from '../api/ada/lib/storage/database/transactionModels/multipart/tables';
import type {
  DbBlock,
} from '../api/ada/lib/storage/database/primitives/tables';
import type { ApiOptionType } from '../api/common/utils';
import WalletTransaction, { toAddr } from './WalletTransaction';

export default class CardanoByronTransaction extends WalletTransaction {

  @action
  static fromAnnotatedTx(request: {|
    tx: {|
      ...CardanoByronTxIO,
      ...WithNullableFields<DbBlock>,
      ...UserAnnotation,
    |},
    addressLookupMap: Map<number, string>,
    api: ApiOptionType,
  |}): CardanoByronTransaction {
    const { addressLookupMap, tx } = request;

    return new CardanoByronTransaction({
      txid: tx.transaction.Hash,
      block: tx.block,
      type: tx.type,
      amount: tx.amount.joinAddCopy(tx.fee),
      fee: tx.fee,
      date: tx.block != null
        ? tx.block.BlockTime
        : new Date(tx.transaction.LastUpdateTime),
      addresses: {
        from: toAddr({ rows: tx.utxoInputs, addressLookupMap, tokens: tx.tokens, }),
        to: toAddr({ rows: tx.utxoOutputs, addressLookupMap, tokens: tx.tokens, }),
      },
      state: tx.transaction.Status,
      errorMsg: tx.transaction.ErrorMessage,
    });
  }
}
