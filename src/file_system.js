let fs = require('fs')

//text file system
function create_json_img(dir, callback){
    fs.readdir(dir, function(err, files){
        if(err){
            console.log(err)
            return false
        }

        let json_data = {
            path: dir,
            list: files
        }
        
        callback(json_data)
    })
}

module.exports = create_json_img