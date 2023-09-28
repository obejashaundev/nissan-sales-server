const { Schema, model } = require('mongoose');
const rolSchema = new Schema({
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
        required: false,
        default: null
    }
}, {
    timestamps: true
});
module.exports = model('Rol', rolSchema);