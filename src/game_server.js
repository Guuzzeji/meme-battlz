//SOCKET SERVER
let colors = require('colors')

function create_game_server(nps, io, images_pack, json){
    
    //create a socket server
    let socket_server = io.of('/'+nps)

    console.log(colors.green('[Game] Game is Runing...'))
    console.log('----'.gray)

    //Game VARS
    let players = []
    let rounds = 0
    let picker = ''
    let player_edit_img = []
    let game_votes = 0
    let player_amount = 3
    let time_count = 0
    let game_running = false
    let all_img_name = []
    let game_time_up = false
    let player_list_submit = []

    //Custom Game VAR
    let setting_time = json.timer
    let rounds_per_game = json.round

    //random func
    function rand(y){
        let x = Math.floor(Math.random()*y)
        return x
    }

    //img to base64 data
    function imgTo64(file){
        let fs = require('fs')
        let path = require('path')
        let file_path = path.join(images_pack.path, file)
        let bit = fs.readFileSync(file_path)
        return new Buffer.from(bit).toString('base64')
    }

    //Ban characters remove from name
    function ban_char(text){
        let clean = text
        clean = clean.substr(0, 15)
        clean = clean.trim()
        clean = clean.replace(' ', '')
        if(clean == '' || clean == ' '){
            return true
        }
        let ban = ['<', '>', '{', '}', '(', ')', '[', ']', '%', '#', '&', '/', '`', '"', `'`, '*', '^', ',']
        for(let x = 0; x < text.length; x++){
            for(let y = 0; y < ban.length; y++){
                clean = clean.replace(ban[y], '')
            }
        }
        clean = clean.trim()
        return clean
    }

    //socket system
    socket_server.on('connection', function(socket){
        console.log('[Server] User has connected to server')
        console.log('----'.gray)

        //username add to player list 
        socket.on('set_name', function(data){
            let id = socket.id
            let username = ban_char(data.name.trim())
            if(username != true){
                players.push({id: id, name: username, score: 0})
                server_log_players(players)
                socket_server.emit('player_list', players)
                if(game_running == true){
                    socket.emit('Game_running_already')
                }
            }else{
                socket.disconnect()
            }
        })

        //get socket id 
        socket.on('what_my_id', function(){
            socket.emit('my_id', {id: socket.id})
        })

        //pick a reviewer
        function pick_user(){
            let picked = rand(players.length)
            picker = players[picked]
            console.log('[Meme-Reviewer] Name:', picker.name, '| ID:', picker.id +''.red)
            console.log('----'.gray)
            socket_server.emit('chooser_person', picker)
            for(let x = 0; x < players.length; x++){
                if(players[x].id != picker.id){
                    socket_server.to(players[x].id).emit('reviewer_is_picking')
                }
            }
        }

        //pick a image from db
        function pick_image(){
            let img_picked = []
            for(let x = 0; x < 3; x++){
                let picked = rand(images_pack.list.length)
                let img = images_pack.list[picked]
                console.log('[Server] random image:', img)
                let data_64 = 'data:image/jpg;base64,'+imgTo64(img)
                img_picked.push({img_data:data_64, img_name:img})
                all_img_name.push({img_name:img})
            }
            socket_server.to(picker.id).emit('img_choose', img_picked)
            console.log('----'.gray)
        }

        //timer
        function timer_create(){
            time_count = setting_time
            let timer = setInterval(function(){
                time_count--
                if(time_count < 0){
                    clearInterval(timer)
                    game_time_up = true
                    if(player_edit_img.length != 0){
                        socket_server.emit('time_up')
                    }else{
                        socket_server.emit('no_one_submit')
                    }
                }else{
                    socket_server.emit('timer', {timer: time_count})
                }
            },1000)
        }

        //restart items of the server
        function restart_Var(){
            picker = ''
            game_votes = 0
            time_count = 0
            game_running = false
            player_list_submit = []
            if(players.length == 0){
                rounds = 0
            }
        }

        function server_log_players(arr){
            console.log('Players:')
            for(let x = 0; x < arr.length; x++){
                let player = arr[x]
                console.log('-- '+ x+ ' | Name: '+ player.name+ ' | [ID]'+ player.id+ ' | Score: '+ player.score)
            }
            console.log('----'.gray)
        }

        //part one start: checking user and start img and pick func
        socket.on('game_start_part_one', function(){
            let submit_already = false
            if(player_list_submit.length == 0){
                player_list_submit.push(socket.id)
            }else{
                for(let x = 0; x < player_list_submit.length; x++){
                    if(player_list_submit[x] == socket.id){
                        submit_already = true
                        break
                    }
                }
            }
            if(submit_already == false){
                for(let i = 0; i < players.length; i++){
                    if(socket.id == players[i].id){
                        console.log('[Player] Voted for Round, Name:', players[i].name, '| ID:', players[i].id)
                        break
                    }
                }
                console.log('----'.gray)
                game_votes += 1
                player_list_submit.push(socket.id)
                if(game_votes >= players.length && players.length >= player_amount && game_running == false){
                    rounds += 1
                    if(rounds > rounds_per_game){
                        socket_server.emit('game_over')
                        console.log('[Server] Game Over!')
                        console.log('----'.gray)
                    }else{
                        game_votes = 0
                        game_time_up = false
                        player_list_submit = []
                        player_edit_img = []
                        console.log('[Server] Rounds:',rounds)
                        console.log('----'.gray)
                        pick_user()
                        pick_image()
                        socket_server.emit('round', {round: rounds})
                    }
                }
            }
        })

        //part two start: get image back from picker and send back to other players
        socket.on('game_start_part_two', function(data){
            console.log('[Meme-Reviewer] imaged picked for meme editing:', data.img_name)
            console.log('----'.gray)
            if(socket.id == picker.id && game_running == false){
                for(let x = 0; x < players.length; x++){
                    if(players[x].id != picker.id){
                        game_running = true
                        let img_data = data.img_data
                        let image_name = data.img_name
                        let check = img_data.search('data:image/jpg;base64,')
                        if(check != -1){
                            socket.to(players[x].id).emit('img_meme_edit', {img_data: img_data, img_name: image_name})
                        }
                    }
                }
                timer_create()
            }else{
                socket.disconnect()
            }
        })

        //get players in the game
        socket.on('get_player_list', function(){
            socket.emit('player_list', players)
        })

        //get image that was made by player send to picker
        socket.on('sent_image', function(data){
            let submit_already = false
            if(game_time_up != true && game_running == true){
                if(socket.id != picker.id){
                    if(player_edit_img.length == 0){
                        submit_already = false
                    }else{
                        for(let l = 0; l < player_edit_img.length; l++){
                            if(socket.id == player_edit_img[l].id){
                                submit_already = true
                                break
                            }
                        }
                    }
                    if(submit_already == false){
                        let img_data = data.img_data
                        let name = data.name
                        let id = socket.id
                        let check_jpeg = img_data.search('data:image/jpeg;base64,')
                        if(check_jpeg != -1){
                            player_edit_img.push({id: id, img:img_data, name:name})
                            console.log('[Player] Got image by', id)
                            console.log('----'.gray)
                            if(player_edit_img.length == players.length-1){
                                time_count = 1
                            }
                            socket.to(picker.id).emit('done_imgs', player_edit_img)
                        }
                    }
                }else{
                    socket.disconnect()
                }
            }
        })

        //winner has been picked
        socket.on('winner_has_been_picked', function(data){
            if(game_running == true){
                let id = data.id
                let name = data.name
                let img_data = data.img
                game_time_up = true
                game_running = false
                let check_jpeg = img_data.search('data:image/jpeg;base64,')
                if(check_jpeg != -1){
                    if(socket.id != id){
                        for(let x = 0; x < players.length; x++){
                            if(id == players[x].id){
                                players[x].score += 1
                                socket_server.emit('winner_of_round', {id:id, img:img_data, name:name})
                                console.log('[Winner] Name:', name, '| ID:', id)
                                console.log('----'.gray)
                                restart_Var()
                            }
                        }
                    }else{
                        socket.disconnect()
                    }
                }
            }
        })

        //look at other player memes that were made
        socket.on('see_other_memes', function(){
            if(game_running == false){
                socket.emit('other_meme', player_edit_img)
            }
        })

        //disconnect system
        socket.on('disconnect', function(){
            console.log('[Server] User has disconneted from server: ', socket.id)
            console.log('----'.gray)
            for(let x = 0; x < players.length; x++){
                if(socket.id == players[x].id){
                    players.splice(x,1)
                    if(players.length == 0){
                        restart_Var()
                        console.log('[Server] NO players left on server')
                        console.log('----'.gray)
                    }
                    server_log_players(players)
                    socket_server.emit('player_list', players)
                }
            }
        })
    })
}

module.exports = create_game_server