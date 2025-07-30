import { isProduction } from './is';

export const getBlockNumberFromUrl = (): string | null => {
  try {
    if (typeof window === 'undefined') return null;

    const blockNumber = new URL(window.location.href).searchParams.get('blockNumber');
    if (!blockNumber) return null;

    if (/^\d+$/.test(blockNumber)) {
      return `0x${parseInt(blockNumber, 10).toString(16)}`;
    }

    if (/^0x[0-9a-fA-F]+$/i.test(blockNumber)) {
      return blockNumber;
    }

    return null;
  } catch {
    return null;
  }
};

export const customBlockNumber = isProduction ? 'latest' : getBlockNumberFromUrl() || 'latest';
