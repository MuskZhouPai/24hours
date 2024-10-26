const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
    content: String,
    ip: String,
    browser: String,
    createdAt: { type: Date, default: Date.now }
});

const settingSchema = new mongoose.Schema({
    hasReset: { type: Boolean, default: false }
});

const Entry = mongoose.model('Entry', entrySchema);
const Setting = mongoose.model('Setting', settingSchema);

module.exports = { Entry, Setting };
