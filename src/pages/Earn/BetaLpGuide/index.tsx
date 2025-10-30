import useI18n from '@hooks/useI18n';
import useInTransaction from '@hooks/useInTransaction';
import { useAccount } from '@service/account';
import { importBetaLp as _importBetaLp } from '@service/earn';

const transitions = {
  en: {
    beta_lp_guide: 'Positions created during the open beta aren’t displayed automatically.',
    beta_lp_import: 'Import your position.',
    beta_lp_importing: 'Importing your position...',
  },
  zh: {
    beta_lp_guide: 'Positions created during the open beta aren’t displayed automatically.',
    beta_lp_import: 'Import your position.',
    beta_lp_importing: 'Importing your position...',
  },
} as const;

export const BetaLpGuide = () => {
  const account = useAccount();
  const i18n = useI18n(transitions);
  const { inTransaction, execTransaction: importBetaLp } = useInTransaction(_importBetaLp, true);
  if (!account) return null;
  return (
    <div className="text-14px font-500 flex justify-center items-center mt-25px lt-mobile:flex-col lt-mobile:items-start lt-mobile:gap-10px">
      <span className="text-gray-normal">{i18n.beta_lp_guide}</span>
      {!inTransaction ? (
        <span className="text-orange-normal cursor-pointer ml-4px" id="beta_lp_import" onClick={() => importBetaLp({ account })}>
          {i18n.beta_lp_import}
        </span>
      ) : (
        <span className="text-orange-normal ml-4px">{i18n.beta_lp_importing}</span>
      )}
    </div>
  );
};
