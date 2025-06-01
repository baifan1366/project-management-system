import { createContext, useContext, useState } from 'react';

// 创建一个Context
const TimerContext = createContext(null);

// 创建Provider组件
export function TimerProvider({ children }) {
  const [timeRemaining, setTimeRemaining] = useState(60);

  return (
    <TimerContext.Provider value={{ timeRemaining, setTimeRemaining }}>
      {children}
    </TimerContext.Provider>
  );
}

// 创建自定义Hook使用Context
export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
} 