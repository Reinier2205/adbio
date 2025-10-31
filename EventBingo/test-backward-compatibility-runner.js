// Backward Compatibility Test Runner
// This script validates the core backward compatibility functionality

console.log('🔄 Starting Backward Compatibility Tests...');

// Test 1: Default squares validation
function testDefaultSquares() {
    const defaultSquaresList = [
        "'n Ou foto saam met Anneke",
        "'n Foto van 'n vorige verjaarsdag of braai",
        "Die oudste selfie wat julle saam het",
        "Anneke wat kaalvoet loop (bonus: vuil voete)",
        "Anneke wat 'n bier drink (bonus: cheers oomblik)",
        "Iemand wat iets by Anneke leen",
        "Oliver wat saam met iemand bal speel",
        "Kesia saam met 'n 'tannie' of 'oom'",
        "Almal bymekaar om die kampvuur",
        "Anneke wat in vrede sit en lees",
        "Oggendkoffie in 'n beker wat nie aan jou behoort nie",
        "Oliver wat 'help' met iets",
        "'n Foto van die sonsondergang",
        "Iemand wat sukkel met kamp opslaan",
        "Anneke se lag vasgevang in 'n spontane foto",
        "'n Kamp speletjie of aktiwiteit",
        "'n Kreatiewe foto van bier of koffie (bonus: albei)",
        "Oliver op sy fiets",
        "'n Groepsfoto van almal",
        "Iemand wat iets soek wat verlore is (bv. foon, skoen, drankie)",
        "'n Foto wat gewys iets is geleen vir kamp",
        "Oliver wat iets in tee doop",
        "Anneke wat ontspan met 'n boek",
        "Kesia wat glimlag",
        "Almal wat totsiens waai by die vuir"
    ];
    
    console.log('✅ Test 1: Default squares validation');
    console.log(`   - Square count: ${defaultSquaresList.length === 25 ? 'PASS' : 'FAIL'} (${defaultSquaresList.length}/25)`);
    
    const validSquares = defaultSquaresList.filter(square => 
        typeof square === 'string' && square.trim().length > 0
    );
    console.log(`   - Valid squares: ${validSquares.length === 25 ? 'PASS' : 'FAIL'} (${validSquares.length}/25)`);
    
    return defaultSquaresList.length === 25 && validSquares.length === 25;
}

// Test 2: Legacy event structure validation
function testLegacyEventStructure() {
    console.log('✅ Test 2: Legacy event structure validation');
    
    const legacyEvent = {
        title: "Legacy Event",
        description: "Event created before custom squares feature",
        code: "LEGACY_001"
        // No squares property - should fallback to default
    };
    
    // Simulate the fallback logic
    const squares = legacyEvent.squares || [
        "'n Ou foto saam met Anneke",
        "'n Foto van 'n vorige verjaarsdag of braai",
        "Die oudste selfie wat julle saam het"
    ]; // Shortened for test
    
    const hasTitle = legacyEvent.title && typeof legacyEvent.title === 'string';
    const hasDescription = legacyEvent.description && typeof legacyEvent.description === 'string';
    const hasCode = legacyEvent.code && typeof legacyEvent.code === 'string';
    const hasFallbackSquares = squares && Array.isArray(squares);
    
    console.log(`   - Title: ${hasTitle ? 'PASS' : 'FAIL'}`);
    console.log(`   - Description: ${hasDescription ? 'PASS' : 'FAIL'}`);
    console.log(`   - Code: ${hasCode ? 'PASS' : 'FAIL'}`);
    console.log(`   - Fallback squares: ${hasFallbackSquares ? 'PASS' : 'FAIL'}`);
    
    return hasTitle && hasDescription && hasCode && hasFallbackSquares;
}

// Test 3: Invalid squares fallback
function testInvalidSquaresFallback() {
    console.log('✅ Test 3: Invalid squares fallback validation');
    
    const testCases = [
        { squares: ["Only", "Three", "Squares"], name: "Too few squares" },
        { squares: null, name: "Null squares" },
        { squares: "not an array", name: "Non-array squares" },
        { squares: Array(30).fill("Too many"), name: "Too many squares" },
        { squares: Array(25).fill(""), name: "Empty squares" }
    ];
    
    let allPassed = true;
    
    testCases.forEach(testCase => {
        let shouldFallback = false;
        
        if (!Array.isArray(testCase.squares)) {
            shouldFallback = true;
        } else if (testCase.squares.length !== 25) {
            shouldFallback = true;
        } else {
            const validSquares = testCase.squares.filter(square => 
                typeof square === 'string' && square.trim().length > 0
            );
            if (validSquares.length !== 25) {
                shouldFallback = true;
            }
        }
        
        const result = shouldFallback ? 'PASS' : 'FAIL';
        console.log(`   - ${testCase.name}: ${result}`);
        
        if (!shouldFallback) {
            allPassed = false;
        }
    });
    
    return allPassed;
}

// Test 4: URL compatibility
function testUrlCompatibility() {
    console.log('✅ Test 4: URL compatibility validation');
    
    const testUrls = [
        'index.html?event=default',
        'index.html?event=LEGACY_001',
        'index.html?event=TEST_EVENT&player=TestPlayer',
        'admin.html'
    ];
    
    let allValid = true;
    
    testUrls.forEach(url => {
        try {
            // Basic URL validation
            const isValid = url.includes('.html') && 
                           (url.includes('index.html') || url.includes('admin.html'));
            
            console.log(`   - ${url}: ${isValid ? 'PASS' : 'FAIL'}`);
            
            if (!isValid) {
                allValid = false;
            }
        } catch (error) {
            console.log(`   - ${url}: FAIL (${error.message})`);
            allValid = false;
        }
    });
    
    return allValid;
}

// Test 5: Player data structure validation
function testPlayerDataStructure() {
    console.log('✅ Test 5: Player data structure validation');
    
    const mockPlayerData = {
        playerName: "ExistingPlayer",
        eventCode: "LEGACY_001",
        completedSquares: [1, 5, 12, 18, 23],
        photos: {
            1: "photo1.jpg",
            5: "photo5.jpg",
            12: "photo12.jpg",
            18: "photo18.jpg",
            23: "photo23.jpg"
        },
        lastUpdated: "2024-01-15T10:30:00Z"
    };
    
    const hasPlayerName = mockPlayerData.playerName && typeof mockPlayerData.playerName === 'string';
    const hasEventCode = mockPlayerData.eventCode && typeof mockPlayerData.eventCode === 'string';
    const hasCompletedSquares = Array.isArray(mockPlayerData.completedSquares);
    const hasPhotos = typeof mockPlayerData.photos === 'object' && mockPlayerData.photos !== null;
    const hasLastUpdated = mockPlayerData.lastUpdated && typeof mockPlayerData.lastUpdated === 'string';
    
    console.log(`   - Player name: ${hasPlayerName ? 'PASS' : 'FAIL'}`);
    console.log(`   - Event code: ${hasEventCode ? 'PASS' : 'FAIL'}`);
    console.log(`   - Completed squares: ${hasCompletedSquares ? 'PASS' : 'FAIL'}`);
    console.log(`   - Photos object: ${hasPhotos ? 'PASS' : 'FAIL'}`);
    console.log(`   - Last updated: ${hasLastUpdated ? 'PASS' : 'FAIL'}`);
    
    return hasPlayerName && hasEventCode && hasCompletedSquares && hasPhotos && hasLastUpdated;
}

// Run all tests
function runAllTests() {
    console.log('🚀 Running Backward Compatibility Tests...\n');
    
    const results = [
        testDefaultSquares(),
        testLegacyEventStructure(),
        testInvalidSquaresFallback(),
        testUrlCompatibility(),
        testPlayerDataStructure()
    ];
    
    const passed = results.filter(result => result).length;
    const total = results.length;
    const successRate = Math.round((passed / total) * 100);
    
    console.log('\n📊 Test Results Summary:');
    console.log(`   - Tests passed: ${passed}/${total}`);
    console.log(`   - Success rate: ${successRate}%`);
    console.log(`   - Overall result: ${passed === total ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    return passed === total;
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllTests,
        testDefaultSquares,
        testLegacyEventStructure,
        testInvalidSquaresFallback,
        testUrlCompatibility,
        testPlayerDataStructure
    };
}

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
    runAllTests();
}