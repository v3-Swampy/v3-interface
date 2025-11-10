import React from 'react';
import { Navigate } from 'react-router-dom';

const EARN_LAST_PATH_KEY = 'earn_last_visited_path';
const DEFAULT_EARN_PATH = '/earn/all-pools';

/**
 * 智能重定向组件，用于记住用户上次访问的 Earn 子路径
 */
export const EarnRedirect: React.FC = () => {
  const lastPath = localStorage.getItem(EARN_LAST_PATH_KEY) || DEFAULT_EARN_PATH;
  return <Navigate to={lastPath} replace />;
};

/**
 * 保存 Earn 路径到 localStorage（供外部调用）
 */
export const saveEarnPath = (pathname: string) => {
  // 只保存 /earn/all-pools 或 /earn/my-positions 这两个路径
  if (pathname === '/earn/all-pools' || pathname === '/earn/my-positions') {
    localStorage.setItem(EARN_LAST_PATH_KEY, pathname);
  }
};

