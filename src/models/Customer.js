const {Schema, model} = require('mongoose');
const customerSchema = new Schema({
    names: String,
    firstLastname: String,
    secondLastname: String,
    location: String,
    phone: String,
    carModel: String,
    broadcastMedium: String,
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
module.exports = new model('Customer', customerSchema);