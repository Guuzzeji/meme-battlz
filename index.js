//Main file [Start]
let colors = require('colors')

//logo
let art_text = require('figlet')
console.log(colors.magenta.bold(art_text.textSync('Meme Battlz {Server}',{
    font: 'Doom'
})))
console.log('-[Server Logs (Ctrl + C to exit)]-')
console.log('----'.gray)

//Server Config
const config = require('./config')
const port = config.PORT

//import lib
let http = require('http')
const express = require('express')
let path = require('path')
const shortid = require('shortid');
let compress = require('compression')
const helmet = require('helmet')
let ngrok = require('ngrok')
let network  = require('os').networkInterfaces()

//src import
let json_file_create = require('./src/file_system')
let game = require('./src/game_server')

//setup import stuff
let app = express()
app.use(compress({level: 9}))
app.use(helmet())
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$-');
let address
Object.keys(network).forEach(function(ip){
    network[ip].forEach(function(face){
        let i = face.address
        let x = i.search('192')
        if(x != -1){
            address = i
            console.log(colors.green('[Network] Local IP:', 'http://'+address+':'+port))
            console.log('----'.gray)
        }
    })
})

//Get image files
if(json_file_create(config.path_images, Start_server) == false){
    console.log(colors.red('ERROR: path is not correct'))
}

//SERVER
async function Start_server(imgs){
    //files
    let image_files = imgs
    let client_path = path.join(__dirname, '/html')
    
    let game_room_id = shortid.generate()//room id
    
    //Start server and create socket
    let server = http.createServer(app).listen(port, function(){
        console.log(colors.green('[Network] Live on port:', 'http://localhost:'+port))
        console.log('----'.gray)
    })
    let io = require('socket.io')(server, {
        cookie: false
    })

    //url list
    let white_list = ['localhost:'+port, address+':'+port]

    //public access 
    if(config.online == true){
        let url = await ngrok.connect({
            addr: port,
            region: config.region,
            proto: 'http'
        })
        white_list.push(url.replace('https://', '') + ':*')
        console.log(colors.green('[Network] Public URL:', url))
        console.log('----'.gray)
    }
    io.origins(white_list)

    //Game & client files ##################
    game(game_room_id, io, image_files, {
        timer: config.num_timer,
        round: config.num_rounds
    })
    
    //get room id
    app.get('/room_id', function(req, res){
        let id = game_room_id
        res.send({server_id: id})
    })
    
    //send game webpage
    app.use('/',express.static(client_path))
}




