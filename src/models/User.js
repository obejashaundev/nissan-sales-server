const { Schema, model } = require('mongoose');
const userSchema = new Schema({
    rol: {
        type: Schema.Types.ObjectId,
        ref: 'Rol',
        required: false
    },
    names: String,
    firstLastname: String,
    secondLastname: String,
    phone: String,
    photoPath: String,
    email: String,
    password: String,
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
module.exports = model('User', userSchema);