// @flow

import React from 'react';
import MainLayout from '../MainLayout';
import TopBarContainer from '../TopBarContainer';

const prettifyReceivedPools = (pools) => {
  return pools.map(({ name, poolHash }) => `${name}\n${poolHash}\n`)
    .join('\n');
};

const messageHandler = (event) => {
  if (event.origin !== process.env.SEIZA_FOR_YOROI_URL) return;
  console.log('Received message from Seiza:', event.data);

  // eslint-disable-next-line no-alert
  alert('You have selected following pools:\n' + prettifyReceivedPools(event.data));
};

const useIframeMessageReceiver = () => {
  React.useEffect(() => {
    window.addEventListener('message', messageHandler, false);

    return () => {
      window.removeEventListener('message', messageHandler);
    };

  }, []);
};

const Staking = (props) => {
  const iframeRef = React.useRef(null);
  const { actions, stores, children } = props;
  const { profile } = stores;
  const topbarContainer = (<TopBarContainer actions={actions} stores={stores} />);

  useIframeMessageReceiver();

  return (
    <MainLayout
      topbar={topbarContainer}
      // TODO: Check Seiza server connection
      // connectionErrorType={checkSeizaServerStatus}
      classicTheme={profile.isClassicTheme}
      actions={actions}
      stores={stores}
    >
      <iframe ref={iframeRef} title="Staking" src={`${process.env.SEIZA_FOR_YOROI_URL}/staking?locale=${profile.currentLocale}`} frameBorder="0" width="100%" height="100%" />;
      {children}
    </MainLayout>
  );

};

export default Staking;
