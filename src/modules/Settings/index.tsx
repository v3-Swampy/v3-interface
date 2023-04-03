import React from 'react';
import cx from 'clsx';
import Dropdown from '@components/Dropdown';
import BorderBox from '@components/Box/BorderBox';
import ToolTip from '@components/Tooltip';
import Input from '@components/Input';
import Switch from '@components/Switch';
import useI18n from '@hooks/useI18n';
import { ReactComponent as SettingsIcon } from '@assets/icons/settings.svg';

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

  return (
    <BorderBox variant="orange" className="w-240px p-16px rounded-28px bg-white-normal shadow-popper">
      <p className="mb-16px leading-18px text-14px text-orange-normal font-medium">{i18n.settings}</p>

      <p className="mb-8px leading-18px text-14px text-black-normal font-medium">
        {i18n.slippage_tolerance}
        <ToolTip text={i18n.slippage_tolerance_tooltip}>
          <span className="i-fa6-solid:circle-info ml-6px mb-1px text-13px text-gray-normal font-medium" />
        </ToolTip>
      </p>
      <div className="flex items-center justify-between gap-8px h-40px">
        <div className="flex-shrink-1 flex items-center w-full h-full pl-16px pr-12px rounded-100px border-1px border-solid border-orange-light">
          <Input className="h-40px text-14px text-black-light" type="number" max={100} id="input--slippage_tolerance" />
          <span className="flex-shrink-0 ml-8px leading-40px text-14px text-black-normal font-medium">%</span>
        </div>

        <button
          className={cx('flex-shrink-0 min-w-62px h-full rounded-100px text-14px', {
            'text-orange-normal bg-orange-light pointer-events-none': true,
            'border-1px border-solid border-gray-normal text-black-normal bg-white-normal': false,
          })}
        >
          {i18n.auto}
        </button>
      </div>

      <p className="mt-16px mb-8px leading-18px text-14px text-black-normal font-medium">
        {i18n.transaction_deadline}
        <ToolTip text={i18n.transaction_deadline_tooltip}>
          <span className="i-fa6-solid:circle-info ml-6px mb-1px text-13px text-gray-normal font-medium" />
        </ToolTip>
      </p>
      <div className="flex items-center justify-between gap-8px h-40px">
        <div className="flex-shrink-1 flex items-center w-full h-full px-16px rounded-100px border-1px border-solid border-orange-light">
          <Input className="h-40px text-14px text-black-light" type="number" max={100} id="input--transaction_deadline" />
        </div>

        <span className="block flex-shrink-0 min-w-62px  leading-40px text-14px text-black-light">{i18n.minutes}</span>
      </div>

      <p className="mt-24px mb-12px leading-18px text-14px text-orange-normal font-medium">{i18n.interface_settings}</p>

      <div className="flex justify-between items-center">
        <p className="leading-18px text-14px text-black-normal font-medium">
          {i18n.auto_router_api}
          <ToolTip text={i18n.auto_router_api_tooltip}>
            <span className="i-fa6-solid:circle-info ml-6px mb-1px text-13px text-gray-normal font-medium" />
          </ToolTip>
        </p>
        <Switch id="switch--auto_router_api" />
      </div>

      <div className="mt-4px flex justify-between items-center">
        <p className="leading-18px text-14px text-black-normal font-medium">
          {i18n.expert_mode}
          <ToolTip text={i18n.expert_mode_tooltip}>
            <span className="i-fa6-solid:circle-info ml-6px mb-1px text-13px text-gray-normal font-medium" />
          </ToolTip>
        </p>
        <Switch id="switch--expert_mode" />
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
