import React, { useCallback } from 'react';
import cx from 'clsx';
import Dropdown from '@components/Dropdown';
import BorderBox from '@components/Box/BorderBox';
import Tooltip from '@components/Tooltip';
import Input from '@components/Input';
import Switch from '@components/Switch';
import { isMobile } from '@utils/is';
import useI18n from '@hooks/useI18n';
import { useTransactionDeadline, useSlippageTolerance, useExpertMode, useRoutingApi, setSlippageTolerance, toggleSlippageToleranceMethod } from '@service/settings';
import { ReactComponent as SettingsIcon } from '@assets/icons/settings.svg';
import { ReactComponent as InfoIcon } from '@assets/icons/info.svg';
import showExpertModeModal from './ExpertModeModal';
import Decimal from 'decimal.js';

const transitions = {
  en: {
    settings: 'Settings',
    slippage_tolerance: 'Slippage tolerance',
    slippage_tolerance_tooltip: 'Your transaction will revert if the price changes unfavorably by more than this percentage.',
    slippage_tolerance_risk_tip: 'Your transaction may be frontrun',
    auto: 'Auto',
    transaction_deadline: 'Transaction deadline',
    transaction_deadline_tooltip: 'Your transaction will revert if it is pending for more than this period of time.',
    minutes: 'minutes',
    interface_settings: 'Interface Settings',
    auto_router_api: 'Auto Router API',
    auto_router_api_tooltip: 'Use the vSwap Labs API to get faster quotes.',
    expert_mode: 'Expert mode',
    expert_mode_tooltip: 'Allow high price impact trades and skip the confirm screen. Use at your own risk.',
  },
  zh: {
    settings: '设置',
    slippage_tolerance: '滑点容差',
    slippage_tolerance_tooltip: '如果兑换率变动超过此百分比，则将还原该交易。',
    slippage_tolerance_risk_tip: '您的交易可能会被别人“抢先”（从而赚取差价）',
    auto: '自动',
    transaction_deadline: '交易截止期限',
    transaction_deadline_tooltip: '如果您的交易待处理超过此时间期限，则将还原该交易。',
    minutes: '分钟',
    interface_settings: '界面设置',
    auto_router_api: '自动路由 API',
    auto_router_api_tooltip: '使用 vSwap Labs API 获得更快的报价。',
    expert_mode: '专家模式',
    expert_mode_tooltip: '允许高度影响价格的交易，并跳过确认步骤。须自行承担使用风险。',
  },
} as const;

const SettingsContent: React.FC = () => {
  const i18n = useI18n(transitions);

  const { method: slippageToleranceMethod, value: slippageToleranceValue } = useSlippageTolerance();
  const onSlippageToleranceChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(({ target: { value } }) => {
    if (value && new Decimal(value).lt(0)) {
      setSlippageTolerance(0);
      return;
    }
    if (value && new Decimal(value).gt(50)) {
      setSlippageTolerance(50);
      return;
    }
    setSlippageTolerance(value ? +value : null);
  }, []);

  const [transactionDeadline, setTransactionDeadline] = useTransactionDeadline();
  const onTransactionDeadlineChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(({ target: { value } }) => {
    if (value && new Decimal(value).lt(0)) {
      setTransactionDeadline(0);
    }
    setTransactionDeadline(+value);
  }, []);

  const [expertMode, setExpertMode] = useExpertMode();
  const [routingApi, setRoutingApi] = useRoutingApi();

  const handleSwitchExpertMode = (e: any) => {
    const checked: boolean = e.target.checked;
    if (checked) {
      showExpertModeModal({ title: 'Are you sure?', className: '!max-w-458px' });
    } else {
      setExpertMode(false);
    }
  };

  const handleSwitchRoutingApi = (e: any) => {
    const checked: boolean = e.target.checked;
    setRoutingApi(checked);
  };

  return (
    <BorderBox variant="orange" className="w-240px p-16px rounded-28px bg-white-normal shadow-popper">
      <p className="mb-16px leading-18px text-14px text-orange-normal font-medium">{i18n.settings}</p>

      <p className="flex items-center mb-8px leading-18px text-14px text-black-normal font-medium">
        {i18n.slippage_tolerance}
        <Tooltip text={i18n.slippage_tolerance_tooltip}>
          <InfoIcon className="w-12px h-12px ml-6px" />
        </Tooltip>
      </p>
      <div className="flex items-center justify-between gap-8px h-40px">
        <div
          className={cx(
            'flex-shrink-1 flex items-center w-full h-full pl-16px pr-12px rounded-100px border-1px border-solid focus-within:border-orange-light transition-colors',
            slippageToleranceMethod === 'manual' ? 'border-orange-light' : 'border-gray-normal'
          )}
        >
          <Input
            className="h-40px text-14px text-black-light"
            id="input--slippage_tolerance"
            type="number"
            max={100}
            min={0}
            value={slippageToleranceMethod === 'manual' ? slippageToleranceValue : ''}
            placeholder={slippageToleranceMethod === 'auto' ? `${slippageToleranceValue}` : ''}
            onChange={onSlippageToleranceChange}
          />
          <span className="flex-shrink-0 ml-8px leading-40px text-14px text-black-normal font-medium">%</span>
        </div>

        <button
          className={cx('flex-shrink-0 min-w-62px h-full rounded-100px text-14px', {
            'text-orange-normal bg-orange-light': slippageToleranceMethod === 'auto',
            'border-1px border-solid border-gray-normal text-black-normal bg-white-normal': slippageToleranceMethod === 'manual',
          })}
          onClick={toggleSlippageToleranceMethod}
        >
          {i18n.auto}
        </button>
      </div>

      <p className="flex items-center mt-16px mb-8px leading-18px text-14px text-black-normal font-medium">
        {i18n.transaction_deadline}
        <Tooltip text={i18n.transaction_deadline_tooltip}>
          <InfoIcon className="w-12px h-12px ml-6px" />
        </Tooltip>
      </p>
      <div className="flex items-center justify-between gap-8px h-40px">
        <div className="flex-shrink-1 flex items-center w-full h-full px-16px rounded-100px border-1px border-solid border-orange-light">
          <Input
            className="h-40px text-14px text-black-light"
            type="number"
            value={transactionDeadline}
            onChange={onTransactionDeadlineChange}
            step={1}
            id="input--transaction_deadline"
          />
        </div>

        <span className="block flex-shrink-0 min-w-62px  leading-40px text-14px text-black-light">{i18n.minutes}</span>
      </div>

      <p className="mt-24px mb-12px leading-18px text-14px text-orange-normal font-medium">{i18n.interface_settings}</p>

      <div className="flex justify-between items-center">
        <p className="flex items-center leading-18px text-14px text-black-normal font-medium">
          {i18n.auto_router_api}
          <Tooltip text={i18n.auto_router_api_tooltip}>
            <InfoIcon className="w-12px h-12px ml-6px" />
          </Tooltip>
        </p>
        <Switch id="switch--auto_router_api" checked={routingApi} onChange={(e) => handleSwitchRoutingApi(e)} />
      </div>

      <div className="mt-4px flex justify-between items-center">
        <p className="flex items-center leading-18px text-14px text-black-normal font-medium">
          {i18n.expert_mode}
          <Tooltip text={i18n.expert_mode_tooltip}>
            <InfoIcon className="w-12px h-12px ml-6px" />
          </Tooltip>
        </p>
        <Switch id="switch--expert_mode" checked={expertMode} onChange={(e) => handleSwitchExpertMode(e)} />
      </div>
    </BorderBox>
  );
};

const Settings: React.FC = () => {
  return (
    <Dropdown placement="bottom" trigger="click" Content={<SettingsContent />}>
      <span className="w-24px h-24px">
        <SettingsIcon className="w-24px h-24px cursor-pointer" />
      </span>
    </Dropdown>
  );
};

export default Settings;
