// Debug the weekend logic to understand the problem
const testDates = [
  '2024-08-02', // Thursday
  '2024-08-03', // Friday  
  '2024-08-04', // Saturday
  '2024-08-05', // Sunday
  '2024-08-06', // Monday
  '2024-08-07', // Tuesday
  '2024-08-08', // Wednesday
];

console.log('🔍 Debugging weekend detection logic:\n');

testDates.forEach(dateStr => {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();
  const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  console.log(`${dateStr}: ${dayName} (dayOfWeek: ${dayOfWeek}) ${isWeekend ? '🚫 WEEKEND' : '✅ WEEKDAY'}`);
});

console.log('\n📊 Day of week mapping:');
console.log('0 = Sunday (domingo) 🚫');
console.log('1 = Monday (segunda) ✅');
console.log('2 = Tuesday (terça) ✅');
console.log('3 = Wednesday (quarta) ✅');
console.log('4 = Thursday (quinta) ✅');
console.log('5 = Friday (sexta) ✅');
console.log('6 = Saturday (sábado) 🚫');

console.log('\n🎯 Expected behavior:');
console.log('- Saturday (6) and Sunday (0) should be BLOCKED');
console.log('- Monday (1) through Friday (5) should be ALLOWED');
