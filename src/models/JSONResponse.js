class JSONResponse{
    static success = 'success'
    static error = 'error'
    constructor({status = JSONResponse.success, data = null, message = null}){
        this.status = status
        this.data = data
        this.message = message
    }
}
module.exports = JSONResponse