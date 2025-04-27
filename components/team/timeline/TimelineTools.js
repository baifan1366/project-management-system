'use client';

const isBrowser = typeof window !== "undefined";

let gantt;
if(isBrowser) {
  gantt = require('dhtmlx-gantt').gantt;
}
/**
 * Initialize zoom levels for gantt chart
 */
export const initZoom = () => {
  gantt.ext.zoom.init({
    levels: [
      {
        name: 'Hours',
        scale_height: 60,
        min_column_width: 30,
        scales: [
          { unit: 'day', step: 1, format: '%d %M' },
          { unit: 'hour', step: 1, format: '%H' }
        ]
      },
      {
        name: 'Days',
        scale_height: 60,
        min_column_width: 70,
        scales: [
          { unit: 'week', step: 1, format: 'Week %W' },
          { unit: 'day', step: 1, format: '%d %M' }
        ]
      },
      {
        name: 'Weeks',
        scale_height: 60,
        min_column_width: 70,
        scales: [
          { unit: "month", step: 1, format: '%F' },
          { unit: 'week', step: 1, format: 'Week %W' }
        ]
      },
      {
        name: 'Months',
        scale_height: 60,
        min_column_width: 70,
        scales: [
          { unit: "year", step: 1, format: '%Y' },
          { unit: 'month', step: 1, format: '%M' }
        ]
      },
      {
        name: 'Years',
        scale_height: 60,
        min_column_width: 70,
        scales: [
          { unit: "year", step: 1, format: '%Y' },
        ]
      }
    ]
  });
}

/**
 * Apply zoom level to gantt chart
 */
export const setZoom = (value, setCurrentZoom) => {
  if (!gantt.$initialized) {
    initZoom();
  }
  gantt.ext.zoom.setLevel(value);
  setCurrentZoom(value);
}

/**
 * Handle zoom level change
 */
export const handleZoomChange = (level, setZoom, setCurrentZoom) => {
  setZoom(level, setCurrentZoom);
}
