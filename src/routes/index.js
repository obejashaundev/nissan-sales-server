// #region Importing libraries installed
const { Router } = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const fs = require('fs')
const multer = require('multer')
const axios = require('axios')
// #endregion

// #region Initialize router and data models
const router = Router()
const User = require('../models/User')
const enumRoles = require('../enums/Roles')
const Rol = require('../models/Rol')
const Customer = require('../models/Customer')
const Location = require('../models/Location')
const JSONResponse = require('../models/JSONResponse');
const SalesAdvisor = require('../models/SalesAdvisor');
const CarModel = require('../models/CarModel');
const AdvertisingMedium = require('../models/AdvertisingMedium');
const { ObjectId } = require('mongodb');
// #endregion

// #region Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
// #endregion

// #region Handling functions for middleware of service
let responseError = (req, res) => {
    let statusCode = req.statusCode || 400
    res.status(statusCode).json(new JSONResponse({ status: JSONResponse.error, message: req.message }))
}
let credentialValidation = (req, res, next) => {
    let { email, password } = req.body
    try {
        if (!(email && password)) {
            throw 'Todos los campos deben estar completos'
        }
        next()
    } catch (err) {
        req.message = err
        responseError(req, res)
    }
}
let dataValidation = (req, res, next) => {
    let { names, firstLastname, secondLastname, phone, email, password, rol } = req.body
    try {
        if (!(names && firstLastname && secondLastname && phone && email && password && rol)) {
            throw 'Todos los campos deben estar completos'
        }
        next()
    } catch (err) {
        req.message = err
        responseError(req, res)
    }
}
let signUpVerifyUserExistence = async (req, res, next) => {
    let { email } = req.body
    try {
        let user = await User.findOne({ email })
        if (user) {
            throw "Ya hay un usuario con esta dirección de correo"
        }
        next()
    } catch (err) {
        req.message = err
        responseError(req, res)
    }
}
let signInVerifyUserExistence = async (req, res, next) => {
    let { email } = req.body
    try {
        let user = await User.findOne({ email })
        if (!user) {
            throw "Las credenciales introducidas, no son válidas, inténtelo de nuevo"
        }
        req.passwordHash = user.password
        req._id = user._id
        next()
    } catch (err) {
        req.message = err
        responseError(req, res)
    }
}
let checkPassword = (req, res, next) => {
    try {
        let { password } = req.body
        let passwordHash = req.passwordHash
        let isValid = bcrypt.compareSync(password, passwordHash)
        let result = '¡Bienvenido!'
        if (!isValid) {
            result = 'Las credenciales introducidas, no son válidas, inténtelo de nuevo'
            throw result
        }
        req.result = result
        next()
    } catch (err) {
        req.message = err
        responseError(req, res)
    }
}
let checkToken = async (req, res, next) => {
    try {
        if (!req.headers.authorization) {
            throw 'Solicitud no autorizada'
        }

        let token = req.headers.authorization.split(' ')[1]
        if (!token) {
            throw 'Solicitud no autorizada'
        }

        try {
            let payload = jwt.verify(token, process.env.JWT_SECRET_KEY)
            req.userId = payload._id
            next()
        } catch (err) {
            throw err.message
        }
    } catch (err) {
        req.statusCode = 401
        req.message = err
        responseError(req, res)
    }
}

let validateActiveUser = async (req, res, next) => {
    try {
        let userId = req.userId
        let user = await User.findById(userId).populate('rol')
        if (!user) {
            throw 'El usuario activo no pudo ser encontrado'
        }
        req.rolName = user.rol.name;
        next()
    } catch (err) {
        req.statusCode = 401
        req.message = err
        responseError(req, res)
    }
}

let permissionForMaster = (req, res, next) => {
    try {
        let rolName = req.rolName;
        if (!enumRoles.MASTER.includes(rolName)) {
            throw 'Solicitud no autorizada'
        }
        next()
    } catch (err) {
        req.statusCode = 401
        req.message = err
        responseError(req, res)
    }
}

let permissionForAdmin = (req, res, next) => {
    try {
        let rolName = req.rolName;
        let lsRoles = [enumRoles.MASTER, enumRoles.ADMINISTRADOR]
        if (!lsRoles.includes(rolName)) {
            throw 'Solicitud no autorizada'
        }
        next()
    } catch (err) {
        req.statusCode = 401
        req.message = err
        responseError(req, res)
    }
}
// #endregion

// #region GET paths
router.get('/', (req, res, next) => {
    res.send('¡Bienvenido, esta es la NISSAN SALES API!')
})

router.get('/roles', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let data = await Rol.find({ isActive: true, isRemoved: false })
        let message = 'Lista de roles disponibles'
        let response = new JSONResponse({ data, message })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.get('/users', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let data = await User.find({ isActive: true, isRemoved: false }).populate('rol')
        if (!req.rolName.includes(enumRoles.MASTER)) {
            data = await User.find({ isActive: true, isRemoved: false }).populate({
                path: 'rol',
                match: {
                    name: { $ne: enumRoles.MASTER }
                }
            })
        }
        let message = 'List of users'
        let response = new JSONResponse({ data, message })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.get('/salesAdvisor', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let data = await SalesAdvisor.find({ isActive: true, isRemoved: false })
        let message = 'List of sales advisors'
        let response = new JSONResponse({ data, message })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.get('/advertisingMediums', checkToken, validateActiveUser, async (req, res, next) => {
    try {
        let data = await AdvertisingMedium.find({ isActive: true, isRemoved: false })
        let message = 'List of advertising medium'
        let response = new JSONResponse({ data, message })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.get('/locations', checkToken, validateActiveUser, async (req, res, next) => {
    try {
        let data = await Location.find({ isActive: true, isRemoved: false })
        let message = 'List of locations'
        let response = new JSONResponse({ data, message })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.get('/carModels', checkToken, validateActiveUser, async (req, res, next) => {
    try {
        let data = await CarModel.find({ isActive: true, isRemoved: false })
        let message = 'List of car models'
        let response = new JSONResponse({ data, message })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.get('/customers', checkToken, validateActiveUser, async (req, res, next) => {
    try {
        let data = await Customer.find({ isActive: true, isRemoved: false }).populate('location').populate('carModel').populate('advertisingMedium').populate('salesAdvisor')
        let message = 'List of customers'
        let response = new JSONResponse({ data, message })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

// #endregion

// #region POST paths
//register
router.post('/users', dataValidation, signUpVerifyUserExistence, async (req, res, next) => {
    try {
        let { names, firstLastname, secondLastname, phone, photoBase64, email, password, rol } = req.body

        let rolDb = await Rol.findOne({ name: rol })
        if (!rolDb) {
            throw 'Es necesario definir un rol para este usuario'
        }

        let photoPath = ''
        if(photoBase64){
            let formData = new FormData()
            formData.append('key', process.env.IMG_HOSTING_API_KEY)
            formData.append('image', phoyoBase64)

            // Send & save the image binary to the ImgBB API
            let imgHippoResponse = await axios.post('https://api.imgbb.com/1/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            photoPath = imgHippoResponse.data.data.url; // Get the uploaded image URL
        }

        password = bcrypt.hashSync(password, parseInt(process.env.SALT_ROUNDS))
        let newUser = new User({ rol: rolDb._id, names, firstLastname, secondLastname, phone, photoPath, email, password })
        await newUser.save()
        res.json(new JSONResponse({ status: JSONResponse.success }))
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

//login
router.post('/signin', credentialValidation, signInVerifyUserExistence, checkPassword, async (req, res, next) => {
    try {
        let _id = req._id
        let result = req.result
        let token = jwt.sign({ _id }, process.env.JWT_SECRET_KEY, { expiresIn: '5h' })
        res.json(new JSONResponse({ data: { token }, message: result }))
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.post('/roles', checkToken, validateActiveUser, permissionForMaster, async (req, res, next) => {
    try {
        let { name } = req.body
        if (!name) {
            throw 'El campo <<name>> no ha sido definido'
        }
        let newRol = new Rol({ name })
        await newRol.save()
        let message = 'El nuevo rol se creó satisfactoriamente'
        res.json(new JSONResponse({ message }))
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.post('/salesAdvisor', checkToken, validateActiveUser, permissionForAdmin, upload.single('image'), async (req, res, next) => {
    try {
        let { name, email, phone } = req.body;
        let imageBuffer = req.file.buffer; // Get the image binary data

        if (!(name && email && phone && imageBuffer)) {
            throw 'Faltaron algunos campos obligatorios { name, email, image }';
        }
        
        let imageBase64 = imageBuffer.toString('base64')
        let formData = new FormData()
        formData.append('key', process.env.IMG_HOSTING_API_KEY)
        formData.append('image', imageBase64)
        formData.append('name', req.file.originalname)

        // Send & save the image binary to the ImgBB API
        let imgHippoResponse = await axios.post('https://api.imgbb.com/1/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });

        let imageUrl = imgHippoResponse.data.data.url; // Get the uploaded image URL

        // Create a new SalesAdvisor record with the image URL
        let newSalesAdvisor = new SalesAdvisor({ name, email, phone, imageUrl });
        await newSalesAdvisor.save();

        let response = new JSONResponse({ message: 'Asesor de ventas registrado exitosamente.' })
        res.json(response);
    } catch (err) {
        req.message = err;
        next();
    }
}, responseError);

router.post('/locations', checkToken, validateActiveUser, permissionForMaster, async (req, res, next) => {
    try {
        let { locations } = req.body
        if (locations) {
            if(Array.isArray(locations)){
                for(let location of locations){
                    if (location.name) {
                        let newLocation = new Location({ name: location.name })
                        await newLocation.save()
                    }
                }
            }else if(typeof locations === 'object'){
                if (locations.name) {
                    let newLocation = new Location({ name: locations.name })
                    await newLocation.save()
                }
            }else{
                throw "Introduce un objeto o una lista de objetos de tipo { name: String }"
            }
            let response = new JSONResponse({ message: 'Localidades almacenadas correctamente.' })
            res.json(response)
        }
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.post('/carModels', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let { carModels } = req.body
        if (carModels) {
            if (Array.isArray(carModels)) {
                for (let carModel of carModels) {
                    if (carModel.name) {
                        let _carModel = new CarModel({ name: carModel.name })
                        await _carModel.save()
                    }
                }
            } else if (typeof carModels === 'object') {
                if (carModels.name) {
                    let _carModel = new CarModel({ name: carModels.name })
                    await _carModel.save()
                }
            } else {
                throw "Introduce un objeto o una lista de objetos de tipo { name: String }"
            }
            let response = new JSONResponse({ message: 'Modelos de carros almacenados correctamente.' })
            res.json(response)
        }
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.post('/customers', checkToken, validateActiveUser, async (req, res, next) => {
    try {
        let { customer } = req.body
        if (customer) {
            let _customer = new Customer({ 
                name: customer.name,
                phone: customer.phone,
                date: customer.date,
                location: customer.location,
                carModel: customer.carModel,
                advertisingMedium: customer.advertisingMedium,
                salesAdvisor: customer.salesAdvisor
            })
            await _customer.save()
            let response = new JSONResponse({ message: 'El cliente se guardó satisfactoriamente.' })
            res.json(response)
        } else {
            throw "Los datos enviados son inválidos."
        }
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.post('/advertisingMediums', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let { advertisingMediums } = req.body
        if (advertisingMediums) {
            if (Array.isArray(advertisingMediums)) {
                for (let advertisingMedium of advertisingMediums) {
                    if (advertisingMedium.name) {
                        let _advertisingMedium = new AdvertisingMedium({ name: advertisingMedium.name })
                        await _advertisingMedium.save()
                    }
                }
            } else if (typeof advertisingMediums === 'object') {
                if (advertisingMediums.name) {
                    let _advertisingMedium = new AdvertisingMedium({ name: advertisingMediums.name })
                    await _advertisingMedium.save()
                }
            } else {
                throw "Introduce un objeto o una lista de objetos de tipo { name: String }"
            }
            let response = new JSONResponse({ message: 'Medios de publicidad almacenadas correctamente.' })
            res.json(response)
        }
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

// #endregion

// #region PUT paths
// #endregion

// #region DELETE paths
router.delete('/users/:id/:isForced', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let userId = req.params.id
        let isForced = req.params.isForced
        let entity = await User.findById(userId).populate('rol')
        if (!entity) {
            throw 'El usuario seleccionado no pudo ser encontrado'
        }
        if (entity.rol.name.includes(enumRoles.MASTER)) {
            throw 'El usuario seleccionado no puede ser eliminado debido a que la aplicación necesita de él'
        }
        await User.updateOne({ _id: new ObjectId(userId) }, { $set: { isActive: false, isRemoved: true } })
        if (isForced) {
            await User.deleteOne({ _id: new ObjectId(userId) })
        }
        let response = new JSONResponse({ message: 'El usuario se eliminó correctamente.' });
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.delete('/roles/:id/:isForced', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let rolId = req.params.id
        let isForced = req.params.isForced
        let entity = await Rol.findById(rolId)
        if (!entity) {
            throw 'El rol seleccionado no pudo ser encontrado'
        }
        if (entity.name.includes(enumRoles.MASTER)) {
            throw 'El rol seleccionado no puede ser eliminado debido a que la aplicación necesita de él'
        }
        await Rol.updateOne({ _id: new ObjectId(rolId) }, { $set: { isActive: false, isRemoved: true } })
        if (isForced) {
            await Rol.deleteOne({ _id: new ObjectId(rolId) })
        }
        let response = new JSONResponse({ message: 'El rol se eliminó correctamente.' });
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.delete('/salesAdvisor/:id/:isForced', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let salesAdvisorId = req.params.id
        let isForced = req.params.isForced

        await SalesAdvisor.updateOne({ _id: new ObjectId(salesAdvisorId) }, { $set: { isActive: false, isRemoved: true } })
        if (isForced) {
            await SalesAdvisor.deleteOne({ _id: new ObjectId(salesAdvisorId) })
        }
        let response = new JSONResponse({ message: 'Asesor de ventas eliminado exitosamente.' })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.delete('/customers/:id/:isForced', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let customerId = req.params.id
        let isForced = req.params.isForced
        
        await Customer.updateOne({ _id: new ObjectId(customerId) }, { $set: { isActive: false, isRemoved: true } })
        if (isForced) {
            await Customer.deleteOne({ _id: new ObjectId(customerId) })
        }
        let response = new JSONResponse({ message: 'Eliminado exitosamente.' })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.delete('/locations/:id/:isForced', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let locationId = req.params.id
        let isForced = req.params.isForced

        await Location.updateOne({ _id: new ObjectId(locationId) }, { $set: { isActive: false, isRemoved: true } })
        if (isForced) {
            await Location.deleteOne({ _id: new ObjectId(locationId) })
        }
        let response = new JSONResponse({ message: 'Eliminado exitosamente.' })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.delete('/carModels/:id/:isForced', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let carModelId = req.params.id
        let isForced = req.params.isForced

        await CarModel.updateOne({ _id: new ObjectId(carModelId) }, { $set: { isActive: false, isRemoved: true } })
        if (isForced) {
            await CarModel.deleteOne({ _id: new ObjectId(carModelId) })
        }
        let response = new JSONResponse({ message: 'Eliminado exitosamente.' })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.delete('/advertisingMediums/:id/:isForced', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let advertisingMediumId = req.params.id
        let isForced = req.params.isForced

        await AdvertisingMedium.updateOne({ _id: new ObjectId(advertisingMediumId) }, { $set: { isActive: false, isRemoved: true } })
        if (isForced) {
            await AdvertisingMedium.deleteOne({ _id: new ObjectId(advertisingMediumId) })
        }
        let response = new JSONResponse({ message: 'Eliminado exitosamente.' })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)
// #endregion

module.exports = router