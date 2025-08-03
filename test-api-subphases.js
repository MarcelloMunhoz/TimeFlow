async function testSubphasesAPI() {
  try {
    console.log('🔍 Testing /api/subphases endpoint...');
    
    const response = await fetch('http://localhost:5000/api/subphases');
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const subphases = await response.json();
    console.log(`✅ API returned ${subphases.length} subphases`);
    
    if (subphases.length > 0) {
      console.log('\n📋 First 5 subphases:');
      subphases.slice(0, 5).forEach((subphase, index) => {
        console.log(`  ${index + 1}. ${subphase.name} (ID: ${subphase.id})`);
      });
      
      if (subphases.length > 5) {
        console.log(`  ... and ${subphases.length - 5} more`);
      }
    } else {
      console.log('⚠️  No subphases returned by API');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testSubphasesAPI();
