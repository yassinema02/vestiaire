// Manual mock for @react-native-async-storage/async-storage
// This is auto-applied by Jest for any test that doesn't explicitly jest.mock() it
const AsyncStorage = {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
};

module.exports = AsyncStorage;
module.exports.default = AsyncStorage;
