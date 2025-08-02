// Check what day of week the test dates are
const testDates = [
  '2024-08-02',
  '2024-08-03', 
  '2024-08-04',
  '2024-08-05',
  '2024-08-06'
];

console.log('📅 Checking test dates:');
testDates.forEach(dateStr => {
  const date = new Date(dateStr);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  console.log(`${dateStr}: ${dayName} (${dayOfWeek}) ${isWeekend ? '🚫 WEEKEND' : '✅ WEEKDAY'}`);
});
