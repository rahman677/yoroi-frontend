// @flow
import { action, observable } from 'mobx';
import type {
  UserAnnotation,
} from '../api/ada/transactions/types';
import type {
  JormungandrTxIO,
} from '../api/ada/lib/storage/database/transactionModels/multipart/tables';
import type {
  DbBlock,
  CertificatePart,
} from '../api/ada/lib/storage/database/primitives/tables';
import type { ApiOptionType } from '../api/common/utils';
import WalletTransaction, { toAddr } from './WalletTransaction';
import type { WalletTransactionCtorData } from './WalletTransaction';

export default class JormungandrTransaction extends WalletTransaction {

  @observable certificates: Array<CertificatePart>;

  constructor(data: {|
    ...WalletTransactionCtorData,
    certificates: Array<CertificatePart>,
  |}) {
    const { certificates, ...rest } = data;
    super(rest);
    this.certificates = certificates;
  }

  @action
  static fromAnnotatedTx(request: {|
    tx: {|
      ...JormungandrTxIO,
      ...WithNullableFields<DbBlock>,
      ...UserAnnotation,
    |},
    addressLookupMap: Map<number, string>,
    api: ApiOptionType,
  |}): JormungandrTransaction {
    const { addressLookupMap, tx } = request;

    return new JormungandrTransaction({
      txid: tx.transaction.Hash,
      block: tx.block,
      type: tx.type,
      amount: tx.amount.joinAddCopy(tx.fee),
      fee: tx.fee,
      date: tx.block != null
        ? tx.block.BlockTime
        : new Date(tx.transaction.LastUpdateTime),
      addresses: {
        from: [
          ...toAddr({ rows: tx.utxoInputs, addressLookupMap, tokens: tx.tokens, }),
          ...toAddr({ rows: tx.accountingInputs, addressLookupMap, tokens: tx.tokens, }),
        ],
        to: [
          ...toAddr({ rows: tx.utxoOutputs, addressLookupMap, tokens: tx.tokens, }),
          ...toAddr({ rows: tx.accountingOutputs, addressLookupMap, tokens: tx.tokens, }),
        ],
      },
      certificates: tx.certificates,
      state: tx.transaction.Status,
      errorMsg: tx.transaction.ErrorMessage,
    });
  }
}
