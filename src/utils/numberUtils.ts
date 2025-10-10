import { Unit } from '@cfxjs/use-wallet-react/ethereum';

export const numFormat = (num?: string) => {
  if (!num) return '';
  const [int, dec] = num.split('.');
  const intLen = int.length;
  if (intLen <= 3) return num;
  const intArr = int.split('').reverse();
  const resArr = [];
  for (let i = 0; i < intArr.length; i += 1) {
    if (i % 3 === 0 && i !== 0) resArr.push(',');
    resArr.push(intArr[i]);
  }
  return resArr.reverse().join('') + (dec ? `.${dec}` : '');
};

export const trimDecimalZeros = (numStr: string) => {
  if (typeof numStr !== 'string') {
    return numStr;
  }

  return numStr.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0*$/, '');
};

export const numberWithCommas = (x: number | string) => {
  const idx = x.toString().indexOf('.');
  return idx !== -1
    ? x
        .toString()
        .slice(0, idx)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',') + x.toString().slice(idx)
    : x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const addZeroToDay = (x: number | string | undefined) => {
  if (String(x).length == 1) return '0' + x;
  return x + '';
};

export const formatDisplayAmount = (
  amount: string | number | Unit | undefined,
  options: {
    decimals?: number;
    minNum?: number | string;
    toFixed?: number;
    unit?: string;
  } = {}
) => {
  if (amount === undefined) return amount;
  const { decimals = 0, minNum = '0.00001', toFixed = 5, unit = '' } = options;
  const amountUnit = new Unit(amount).div(Unit.pow(10, decimals));
  if (amountUnit.equals(0)) return `${unit}0`;
  if (minNum && amountUnit.lessThan(minNum)) {
    return `<${unit}${minNum}`;
  }
  return `${unit}${amountUnit.toDecimalMinUnit(toFixed)}`;
};
