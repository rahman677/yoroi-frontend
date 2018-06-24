// @flow
import { observable, action, runInAction } from 'mobx';
import Store from '../lib/Store';
import Request from '.././lib/LocalizedRequest';
import type { ConfigType } from '../../../config/config-types';
import {
  sendTx
} from '../../api/ada/lib/icarus-backend-api';
import LocalizableError from '../../i18n/LocalizableError';
import type {
  TransferStatus,
  TransferTx
} from '../../types/daedalusTransferTypes';
import {
  getAddressesWithFunds,
  generateTransferTx
} from '../../api/ada/daedalusTransfer';

declare var CONFIG: ConfigType;
const websocketUrl = CONFIG.network.websocketUrl;
const MSG_TYPE_RESTORE = 'RESTORE';

// FIXME: Define a place for these type of errors
export class NoTransferTxError extends LocalizableError {
  constructor() {
    super({
      id: 'daedalusTransfer.error.NoTransferTxError',
      defaultMessage: '!!! There is no transfer transaction to send',
    });
  }
}

export default class DaedalusTransferStore extends Store {

  @observable status: TransferStatus = 'uninitialized';
  @observable transferTx: ?TransferTx = null;
  @observable transferFundsRequest: Request<any> = new Request(this._transferFundsRequest);
  @observable ws: any = null;

  setup() {
    const actions = this.actions.ada.daedalusTransfer;
    actions.setupTransferFunds.listen(this._setupTransferFunds);
    actions.transferFunds.listen(this._transferFunds);
    actions.cancelTransferFunds.listen(this._reset);
  }

  teardown() {
    super.teardown();
    this._reset();
  }

  /* TODO: Handle WS connection errors */
  _setupTransferFunds = (payload: { recoveryPhrase: string }) => {
    const { recoveryPhrase: secretWords } = payload;
    this.status = 'restoringAddresses';
    this.ws = new WebSocket(websocketUrl);
    this.ws.addEventListener('open', () => {
      console.log('[ws::connected]');
      this.ws.send(JSON.stringify({
        msg: MSG_TYPE_RESTORE,
      }));
    });
    /*  FIXME: Remove 'any' from event
        There is an open issue with this https://github.com/facebook/flow/issues/3116
    */
    this.ws.addEventListener('message', async (event: any) => {
      const data = JSON.parse(event.data);
      console.log(`[ws::message] on: ${data.msg}`);
      if (data.msg === MSG_TYPE_RESTORE) {
        this._updateStatus('checkingAddresses');
        const addressesWithFunds = getAddressesWithFunds({
          secretWords,
          addresses: data.addresses
        });
        this._updateStatus('generatingTx');
        const transferTx = await generateTransferTx({
          secretWords,
          addressesWithFunds
        });
        runInAction(() => {
          this.transferTx = transferTx;
        });
        this._updateStatus('readyToTransfer');
      }
    });
  }

  @action.bound
  _updateStatus(s: TransferStatus) {
    this.status = s;
  }

  _transferFundsRequest = async (payload: {
    cborEncodedTx: Array<number>
  }) => {
    const { cborEncodedTx } = payload;
    const signedTx = Buffer.from(cborEncodedTx).toString('base64');
    return sendTx(signedTx);
  }

  // FIXME: Handle backend errors
  _transferFunds = async (payload: {
    next: Function
  }) => {
    const { next } = payload;
    if (!this.transferTx) {
      throw new NoTransferTxError();
    }
    /* await this.transferFundsRequest.execute({
      cborEncodedTx: this.transferTx.cborEncodedTx
    });*/
    next();
    this._reset();
  }

  @action.bound
  _reset() {
    this.status = 'uninitialized';
    this.transferTx = null;
    this.transferFundsRequest.reset();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
