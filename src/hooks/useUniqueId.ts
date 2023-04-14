import { useState } from 'react';
import { uniqueId } from 'lodash-es';

const useUniqueId = (prefix?: string) => {
  const [id] = useState(() => uniqueId(`${prefix ?? 'uniqueId'}-`));
  return id;
};

export default useUniqueId;
