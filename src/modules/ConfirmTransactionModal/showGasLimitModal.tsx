import React from 'react';
import { showModal, showDrawer, hidePopup } from '@components/showPopup';
import Button from '@components/Button';
import { isMobile } from '@utils/is';
import FailedGasLimitImage from '@assets/imgs/metamask-gaslimit.png';

const GasLimitModal: React.FC = () => {
  return (
    <>
      <div className="mt-12px text-center">
        <img className="w-780px max-w-85vw aspect-780/314" src={FailedGasLimitImage} alt="Failed Reach Metamask gaslimit tip" />
        <div className="mt-6px flex justify-center gap-228px">
          <div className="flex flex-col items-center font-medium">
            <div className="w-72px h-22px leading-22px rounded-22px text-14px text-white-normal bg-gradient-orange">STEP 01</div>
            <p className="mt-6px text-12px leading-16px text-black-normal font-medium">Click the "Edit"</p>
          </div>

          <div className="flex flex-col items-center font-medium">
            <div className="w-72px h-22px leading-22px rounded-22px text-14px text-white-normal bg-gradient-orange">STEP 02</div>
            <p className="mt-6px text-12px leading-16px text-black-normal font-medium">
              Enter "15000000" and then
              <br />
              click the "Save" button
            </p>
          </div>
        </div>
        <p className="mt-46px mb-16px mx-auto w-75% leading-20px text-16px text-black-normal">
          The gas limit estimated by your wallet exceeds the upper limit of Conflux eSpace. You can edit the Gas Limit to 15,000,000 in MetaMask, or use{' '}
          <a className='!text-#0057FF' target="_blank" rel="noopener noreferrer" href="https://fluentwallet.com/">Fluent Wallet</a>.
        </p>
      </div>
      <Button color="orange" className="!flex mx-auto w-60% max-w-540px lt-sm:w-full h-48px rounded-100px text-16px !font-bold" onClick={hidePopup}>
        Understand
      </Button>
    </>
  );
};

const showGasLimitModal = () => {
  const title = 'Gas Limit exceeds';
  const className = '!w-fit !h-fit !max-w-90vw';

  if (isMobile) {
    showDrawer({
      Content: <GasLimitModal />,
      title,
    });
  } else {
    showModal({ Content: <GasLimitModal />, className, title, unique: true });
  }
};

export default showGasLimitModal;
