import { LRUCacheFunction } from '@utils/LRUCache';
import { shortenAddress as _shortenAddress, validateHexAddress as _validateHexAddress } from './shortenAddress';

export const shortenAddress = LRUCacheFunction(_shortenAddress, 'shortenAddress');
export const validateHexAddress = LRUCacheFunction(_validateHexAddress, 'validateHexAddress');
