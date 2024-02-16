const { Schema, model } = require('mongoose');

const locationSchema = new Schema({
    name: String,
    isActive: {
        type: Boolean,
        default: true
    },
    isRemoved: {
        type: Boolean,
        default: false
    },
    removalDate: {
        type: Date,
        default: null
    },
    removalReason: {
        type: String,
        default: null
    },
    userWhoRemoved: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
}, {
    timestamps: true
});

module.exports = model('Location', locationSchema);
