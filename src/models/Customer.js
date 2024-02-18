const {Schema, model} = require('mongoose');
const customerSchema = new Schema({
    name: String,
    phone: String,
    location: {
        type: Schema.Types.ObjectId,
        ref: 'Location',
        required: true
    },
    carModel: {
        type: Schema.Types.ObjectId,
        ref: 'CarModel',
        required: false
    },
    advertisingMedium: {
        type: Schema.Types.ObjectId,
        ref: 'AdvertisingMedium',
        required: true
    },
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