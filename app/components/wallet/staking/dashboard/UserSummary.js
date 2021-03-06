// @flow
import React, { Component } from 'react';
import type { Node } from 'react';
import BigNumber from 'bignumber.js';
import classnames from 'classnames';
import { observer } from 'mobx-react';
import { defineMessages, intlShape, FormattedMessage } from 'react-intl';
import type { $npm$ReactIntl$MessageDescriptor, $npm$ReactIntl$IntlFormat } from 'react-intl';
import { Button } from 'react-polymorph/lib/components/Button';
import { ButtonSkin } from 'react-polymorph/lib/skins/simple/ButtonSkin';
import Card from './Card';
import styles from './UserSummary.scss';
import IconAda from '../../../../assets/images/dashboard/grey-total-ada.inline.svg';
import IconRewards from '../../../../assets/images/dashboard/grey-total-reward.inline.svg';
import IconDelegated from '../../../../assets/images/dashboard/grey-total-delegated.inline.svg';
import globalMessages from '../../../../i18n/global-messages';
import TooltipBox from '../../../widgets/TooltipBox';
import WarningIcon from '../../../../assets/images/attention-modern.inline.svg';
import LoadingSpinner from '../../../widgets/LoadingSpinner';

const messages = defineMessages({
  title: {
    id: 'wallet.dashboard.summary.title',
    defaultMessage: '!!!Your Summary',
  },
  delegatedLabel: {
    id: 'wallet.dashboard.summary.delegatedTitle',
    defaultMessage: '!!!Total Delegated',
  },
  note: {
    id: 'wallet.dashboard.summary.note',
    defaultMessage: '!!!Less than you expected?',
  },
  adaAmountNote1: {
    id: 'wallet.dashboard.summary.adaAmountNote1',
    defaultMessage: '!!!This balance includes rewards',
  },
  adaAmountNote2: {
    id: 'wallet.dashboard.summary.adaAmountNote2',
    defaultMessage: '!!!(withdrawal required to be able to send this full amount)',
  },
  mangledPopupDialogLine1: {
    id: 'wallet.dashboard.summary.mangled.line1',
    defaultMessage:
      '!!!Your wallet has {adaAmount} {ticker} with a different delegation preference.',
  },
  canUnmangleLine: {
    id: 'wallet.dashboard.summary.mangled.can',
    defaultMessage: '!!!{adaAmount} {ticker} can be corrected',
  },
  cannotUnmangleLine: {
    id: 'wallet.dashboard.summary.mangled.cannot',
    defaultMessage: '!!!{adaAmount} {ticker} cannot be corrected',
  },
  mangledPopupDialogLine2: {
    id: 'wallet.dashboard.summary.mangled.line2',
    defaultMessage: '!!!We recommend to {transactionMessage} to delegate the {ticker}',
  },
  makeTransaction: {
    id: 'wallet.dashboard.summary.mangled.makeTx',
    defaultMessage: '!!!make a transaction',
  },
});

type Props = {|
  +totalAdaSum: void | {|
    +ADA: string,
    +unitOfAccount: void | {| currency: string, amount: string |},
  |},
  +totalRewards: void | {|
    +ADA: string,
    +unitOfAccount: void | {| currency: string, amount: string |},
  |},
  +totalDelegated: void | {|
    +ADA: string,
    +unitOfAccount: void | {| currency: string, amount: string |},
  |},
  +openLearnMore: void => void,
  +canUnmangleSum: BigNumber,
  +cannotUnmangleSum: BigNumber,
  +onUnmangle: void => void,
  +meta: {|
    +primaryTicker: string,
    +decimalPlaces: number,
  |},
  +withdrawRewards: void | (void => void),
|};

type State = {|
  mangledPopupOpen: boolean,
|};

@observer
export default class UserSummary extends Component<Props, State> {
  static contextTypes: {| intl: $npm$ReactIntl$IntlFormat |} = {
    intl: intlShape.isRequired,
  };

  state: State = {
    mangledPopupOpen: false,
  };

  render(): Node {
    const { intl } = this.context;
    return (
      <Card title={intl.formatMessage(messages.title)}>
        <div className={styles.wrapper}>
          {this.getTotalAda()}
          {this.getTotalRewards()}
          {this.getTotalDelegated()}
        </div>
      </Card>
    );
  }

  getTotalAda: void => Node = () => {
    const { intl } = this.context;
    const { totalAdaSum } = this.props;
    return (
      <div className={classnames([styles.card, styles.mr20])}>
        <div className={styles.cardContent}>
          <div>
            <h3 className={styles.label}>
              {intl.formatMessage(globalMessages.totalAdaLabel, {
                ticker: this.props.meta.primaryTicker,
              })}
              :
            </h3>
            {totalAdaSum != null ? (
              <>
                {totalAdaSum.unitOfAccount && (
                  <p className={styles.value}>
                    {totalAdaSum.unitOfAccount.amount} {totalAdaSum.unitOfAccount.currency}
                  </p>
                )}
                <p className={styles.value}>
                  {this.formatAdaValue(totalAdaSum.ADA)} {this.props.meta.primaryTicker}
                </p>
              </>
            ) : (
              <div className={styles.loadingSpinner}>
                <LoadingSpinner small />
              </div>
            )}
          </div>
          <div>
            <div className={styles.amountNote}>
              {intl.formatMessage(messages.adaAmountNote1)}
            </div>
            <div className={styles.amountNote}>
              {intl.formatMessage(messages.adaAmountNote2)}
            </div>
            <div />
          </div>
        </div>
        <div className={styles.icon}>
          <IconAda />
        </div>
      </div>
    );
  };

  getTotalRewards: void => Node = () => {
    const { intl } = this.context;
    const { totalRewards } = this.props;
    return (
      <div className={classnames([styles.card, styles.mr20])}>
        <div className={styles.cardContent}>
          <div>
            <h3 className={styles.label}>
              {intl.formatMessage(globalMessages.totalRewardsLabel)}:
            </h3>
            {totalRewards != null ? (
              <>
                {totalRewards.unitOfAccount && (
                  <p className={styles.value}>
                    {totalRewards.unitOfAccount.amount} {totalRewards.unitOfAccount.currency}
                  </p>
                )}
                <p className={styles.value}>
                  {this.formatAdaValue(totalRewards.ADA)} {this.props.meta.primaryTicker}
                </p>
              </>
            ) : (
              <div className={styles.loadingSpinner}>
                <LoadingSpinner small />
              </div>
            )}
          </div>
          <div className={styles.footer}>
            {this.props.withdrawRewards != null && (
              <Button
                className={classnames(styles.actionButton, 'secondary')}
                label={intl.formatMessage(globalMessages.withdrawLabel)}
                onClick={this.props.withdrawRewards}
                skin={ButtonSkin}
              />
            )}
            <div
              className={styles.note}
              role="button"
              tabIndex={0}
              onKeyPress={() => null}
              onClick={this.props.openLearnMore}
            >
              {intl.formatMessage(messages.note)}
            </div>
          </div>
        </div>
        <div className={styles.icon}>
          <IconRewards />
        </div>
      </div>
    );
  };

  getTotalDelegated: void => Node = () => {
    const { intl } = this.context;
    const { totalDelegated } = this.props;

    const mangledWarningIcon =
      this.props.canUnmangleSum.gt(0) || this.props.cannotUnmangleSum.gt(0) ? (
        <div className={styles.mangledWarningIcon}>
          <WarningIcon
            width="24"
            height="24"
            onClick={() =>
              this.setState(prevState => ({
                mangledPopupOpen: !prevState.mangledPopupOpen,
              }))
            }
          />
        </div>
      ) : (
        []
      );

    return (
      <div className={styles.wrapperCard}>
        <div className={styles.popupSection}>
          {this.state.mangledPopupOpen && (
            <div className={styles.mangledPopup}>
              <TooltipBox onClose={() => this.setState(() => ({ mangledPopupOpen: false }))}>
                <p>
                  {this.formatWithAmount(
                    messages.mangledPopupDialogLine1,
                    this.props.canUnmangleSum.plus(this.props.cannotUnmangleSum),
                    this.props.meta.decimalPlaces
                  )}
                </p>
                {this.props.cannotUnmangleSum.gt(0) && (
                  <ul>
                    <li>
                      {this.formatWithAmount(
                        messages.canUnmangleLine,
                        this.props.canUnmangleSum,
                        this.props.meta.decimalPlaces
                      )}
                    </li>
                    <li>
                      {this.formatWithAmount(
                        messages.cannotUnmangleLine,
                        this.props.cannotUnmangleSum,
                        this.props.meta.decimalPlaces
                      )}
                    </li>
                  </ul>
                )}
                {this.props.canUnmangleSum.gt(0) && (
                  <p>
                    <FormattedMessage
                      {...messages.mangledPopupDialogLine2}
                      values={{
                        ticker: this.props.meta.primaryTicker,
                        transactionMessage: (
                          <span
                            className={styles.link}
                            onClick={this.props.onUnmangle}
                            role="button"
                            tabIndex={0}
                            onKeyPress={this.props.onUnmangle}
                          >
                            {intl.formatMessage(messages.makeTransaction)}
                          </span>
                        ),
                      }}
                    />
                  </p>
                )}
              </TooltipBox>
            </div>
          )}
        </div>
        <div className={styles.subCard}>
          <div className={styles.cardContent}>
            <div>
              <div className={styles.delegatedHeader}>
                <h3 className={styles.label}>{intl.formatMessage(messages.delegatedLabel)}:</h3>
                <div className={styles.mangledSection}>
                  {mangledWarningIcon}
                </div>
              </div>
              {totalDelegated != null ? (
                <>
                  {totalDelegated.unitOfAccount && (
                    <p className={styles.value}>
                      {totalDelegated.unitOfAccount.amount} {totalDelegated.unitOfAccount.currency}
                    </p>
                  )}
                  <p className={styles.value}>
                    {this.formatAdaValue(totalDelegated.ADA)} {this.props.meta.primaryTicker}
                  </p>
                </>
              ) : (
                <div className={styles.loadingSpinner}>
                  <LoadingSpinner small />
                </div>
              )}
            </div>
            <div />
          </div>
          <div className={styles.icon}>
            <IconDelegated />
          </div>
        </div>
      </div>
    );
  };

  formatWithAmount: ($npm$ReactIntl$MessageDescriptor, BigNumber, number) => Node = (
    message,
    amount,
    decimalPlaces
  ) => {
    return (
      <FormattedMessage
        {...message}
        values={{
          ticker: this.props.meta.primaryTicker,
          adaAmount: amount.shiftedBy(-decimalPlaces).toFormat(decimalPlaces),
        }}
      />
    );
  };

  formatAdaValue: string => Node = adaValue => {
    const adaAmount = adaValue.split('.');
    return (
      <span>
        {adaAmount[0]}
        <span className={styles.decimal}>.{adaAmount[1]} </span>{' '}
      </span>
    );
  };
}
