// @flow

import LocalizableError, { UnexpectedError } from '../i18n/LocalizableError';
import globalMessages from '../i18n/global-messages';
import { defineMessages } from 'react-intl';

import {
  Logger,
} from '../utils/logging';

const messages = defineMessages({
  cancelOnDeviceError101: {
    id: 'wallet.hw.ledger.common.error.101',
    defaultMessage: '!!!Operation cancelled on Ledger device.',
  },
  cancelOnLedgerConnectError102: {
    id: 'wallet.hw.ledger.common.error.102',
    defaultMessage: '!!!Operation cancelled by user.',
  },
  deviceLockedError103: {
    id: 'wallet.hw.ledger.common.error.103',
    defaultMessage: '!!!Ledger device is locked, please unlock it and retry.',
  },
  deviceLockedError104: {
    id: 'wallet.hw.ledger.common.error.104',
    defaultMessage: '!!!Ledger device timeout, please retry.',
  },
});

export function convertToLocalizableError(error: Error): LocalizableError {
  let localizableError: ?LocalizableError = null;

  if (error instanceof LocalizableError) {
    // It means some API Error has been thrown
    localizableError = error;
  } else if (error && error.message) {
    // Ledger device related error happend, convert then to LocalizableError
    switch (error.message) {
      case 'TransportError: Failed to sign with Ledger device: U2F TIMEOUT':
        localizableError = new LocalizableError(globalMessages.ledgerError101);
        break;
      case 'TransportStatusError: Ledger device: Action rejected by user':
        localizableError = new LocalizableError(messages.cancelOnDeviceError101);
        break;
      case 'NotAllowedError: The operation either timed out or was not allowed. See: https://w3c.github.io/webauthn/#sec-assertion-privacy.':
      case 'AbortError: The operation was aborted. ':
      case 'Forcefully cancelled by user':
        localizableError = new LocalizableError(messages.cancelOnLedgerConnectError102);
        break;
      case 'TransportStatusError: Ledger device: Device is locked':
        localizableError = new LocalizableError(messages.deviceLockedError103);
        break;
      case 'NotAllowedError: The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.':
        localizableError = new LocalizableError(messages.deviceLockedError104);
        break;
      default:
        /** we are not able to figure out why Error is thrown
          * make it, Something unexpected happened */
        Logger.error(`LedgerSendStore::_convertToLocalizableError::error: ${error.message}`);
        localizableError = new UnexpectedError();
        break;
    }
  }

  if (!localizableError) {
    /** we are not able to figure out why Error is thrown
      * make it, Something unexpected happened */
    localizableError = new UnexpectedError();
  }

  return localizableError;
}
