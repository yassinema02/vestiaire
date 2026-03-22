module.exports = {
    preset: 'jest-expo',
    roots: ['<rootDir>'],
    testMatch: ['<rootDir>/__tests__/**/*.(test|spec).(ts|tsx)'],
    testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/'],
};
