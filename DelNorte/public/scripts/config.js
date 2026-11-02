/**
 * Application Configuration
 */

const CONFIG = {
    API_BASE_URL: 'https://delnorte.reinier-olivier.workers.dev/',
    TRAINING_START: new Date('2026-11-01'),
    CAMINO_DATE: new Date('2027-06-01'),
    BOOT_READY_KM: 100,
    CONVERSATION_TEST_MINUTES: 120,
};

// Training phases
const TRAINING_PHASES = [
    {
        id: 'foundation',
        name: 'Foundation',
        start: new Date('2026-11-01'),
        end: new Date('2026-12-31'),
        description: 'Build a repeatable walking habit. Keep your walks comfortable and add two strength / Pilates sessions.',
        weeklyStructure: '2-3 short walks · 1 long walk · 2 strength/Pilates sessions · Optional 1 recovery day'
    },
    {
        id: 'expansion',
        name: 'Expansion',
        start: new Date('2027-01-01'),
        end: new Date('2027-03-31'),
        description: 'Increase time on feet, add hills and last increase. Introduce a full-gear weekend walk.',
        weeklyStructure: '2-3 walks · Increase time on feet · 1 hill or varied terrain workout · 1 full-gear trial'
    },
    {
        id: 'trek-readiness',
        name: 'Trek readiness',
        start: new Date('2027-04-01'),
        end: new Date('2027-05-31'),
        description: 'Practice consecutive days with your trail pack. Taper during the final 10 days.',
        weeklyStructure: '2-3 long walks back-to-back · Carry trail pack · Test all gear and nutrition'
    }
];

// Nutritional superfoods
const CAMINO_SUPERFOODS = [
    {
        id: 'oats',
        name: 'Oats',
        category: 'BREAKFAST · CARBOHYDRATE · FIBER',
        description: 'A powerful whole-grain breakfast that boosts sustained energy, good for heart and longer walks.',
        icon: '🥣'
    },
    {
        id: 'lean-beef',
        name: 'Lean beef',
        category: 'PROTEIN · IRON · RECOVERY',
        description: 'B protein and iron combo. Focus use off-muscle repair and fighting fatigue.',
        icon: '🥩'
    },
    {
        id: 'bananas',
        name: 'Bananas',
        category: 'FRUIT · QUICK · ENERGY/WHITE',
        description: 'For stress-recovery carbohydrates, easy for walking days.',
        icon: '🍌'
    },
    {
        id: 'eggs',
        name: 'Eggs',
        category: 'PROTEIN · BREAKFAST · RECOVERY',
        description: 'Portable protein when limited; good for muscle endurance all-around heal.',
        icon: '🥚'
    },
    {
        id: 'beans-lentils',
        name: 'Beans & lentils',
        category: 'PROTEIN · FIBER · HEART',
        description: 'Plant-protein, slow-digesting carbs/heart/hightlights/lighter calisthenics.',
        icon: '🫘'
    },
    {
        id: 'avocado',
        name: 'Avocado',
        category: 'FAT · FIBRE · CALM',
        description: 'Heart-smart fat and fibre. Ropes with flavor packed on metabolism.',
        icon: '🥑'
    },
    {
        id: 'nuts',
        name: 'Nuts',
        category: 'SNACK · FAT · PROTEIN',
        description: 'High-in-energy-dense-on-trail snack; vitamin Equip-or-almonds clean.',
        icon: '🥜'
    },
    {
        id: 'plain-yoghurt',
        name: 'Plain yoghurt',
        category: 'PROTEIN · CALCIUM · ENERGY',
        description: 'Muscle-repairing bacteria-release-anim-leptation-as-pot-possible.',
        icon: '🥛'
    }
];
