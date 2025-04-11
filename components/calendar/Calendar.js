import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { WeekView, DayView, MonthView } from './index';

// ... existing code ...

// 在 renderCalendar 函数中，替换月视图的渲染代码
const renderCalendar = () => {
  switch (view) {
    case 'month':
      return (
        <MonthView
          currentDate={currentDate}
          handleOpenCreateEvent={handleOpenCreateEvent}
          t={t}
          isGoogleConnected={isGoogleConnected}
          handleConnectGoogle={handleConnectGoogle}
          googleEvents={googleEvents}
          personalEvents={personalEvents}
          tasks={tasks}
          googleCalendarColors={googleCalendarColors}
        />
      );
    case 'week':
      return (
        <WeekView
          currentDate={currentDate}
          handleOpenCreateEvent={handleOpenCreateEvent}
          t={t}
          isGoogleConnected={isGoogleConnected}
          handleConnectGoogle={handleConnectGoogle}
          googleEvents={googleEvents}
          personalEvents={personalEvents}
          tasks={tasks}
          googleCalendarColors={googleCalendarColors}
        />
      );
    case 'day':
      return (
        <DayView
          currentDate={currentDate}
          handleOpenCreateEvent={handleOpenCreateEvent}
          t={t}
          isGoogleConnected={isGoogleConnected}
          handleConnectGoogle={handleConnectGoogle}
          googleEvents={googleEvents}
          personalEvents={personalEvents}
          tasks={tasks}
          googleCalendarColors={googleCalendarColors}
        />
      );
    default:
      return null;
  }
};

// ... existing code ... 