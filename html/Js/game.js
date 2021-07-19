//#######################################################################
function doc_get(id){
    return document.getElementById(id)
}

//clone system for votes
let doc_add = ['vote_room', 'vote_look_other', 'vote_winner', 'vote_no_submit']
let voted = doc_get('vote_system')
for(let x = 0; x < doc_add.length; x++){
    let clone = voted.cloneNode(true)
    clone.style.display = 'block'
    doc_get(doc_add[x]).appendChild(clone)
}

//zoom into image
function zoom_image(img){
    doc_get('zoom_image_model').style.display = 'block'
    doc_get('zoom_img').src = img
}

//on start
window.addEventListener('load', function(){
    nav_pages('start.html')
}) 

//#######################################################################

let socket = io({
    autoConnect: true,
    reconnection: false
})
let picker = null
let id = null
let name = null
let click_create = false
let connect_type = ''
let server_url = ''
//room, startpage,  meme_reviewer, meme_maker, winner, wait_for_other_player_to_submit, out_of_time
let nav = 'startpage'
let submit_meme = false

//create server btn
//BTN func
async function play_start_btn(){
    connect_type = 'create'
    name = doc_get('username').value
    if(name == '' || name == null){
        alert('Put In A name')
    }else if(click_create == false){
        await fetch('/room_id', {method: 'GET'}).then(function(res){
            return res.json()
        }).then(function(data){
            socket =  io.connect('/'+data.server_id, {
                autoConnect: false
            })
            open_create_sockets()
            socket.emit('set_name', {name:name})
            click_create = true
            nav = 'room'
        })
    }
}

function start_round_vote(){
    socket.emit('game_start_part_one')
    doc_get('vote_when_through').style.display = 'block'
}

function leave_btn(){
    socket.disconnect()
}

function get_player(){
    socket.emit('get_player_list')
}


function look_other_meme_btn(){
    nav_pages('view_other_meme.html')

    socket.emit('see_other_memes')
}

function want_nav_to_game(page){
    let game_nav = ['_picked_meme_image', 'round_has_started', 'game_meme_maker', 'meme_reviewer', 'wait_for_other_player_to_submit', 'out_of_time', 'no_one_submit']
    for(let i = 0; i < game_nav.length; i++){
        if(page == game_nav[i]){
            doc_get(game_nav[i]).style.display = 'block'
        }else{
            doc_get(game_nav[i]).style.display = 'none'
        }
    }
}

function nav_pages(page){
    let page_nav = ['start.html', 'game.html', 'room.html', 'view_other_meme.html', 'winner_screen.html', 'game_over.html']
    for(let i = 0; i < page_nav.length; i++){
        if(page == page_nav[i]){
            doc_get(page_nav[i]).style.display = 'block'
        }else{
            doc_get(page_nav[i]).style.display = 'none'
        }
    }
}
//#######################################################################

//socket on func
function open_create_sockets(){
    socket.on('chooser_person',function(data){
        doc_get('vote_when_through').style.display = 'none'
        //console.log('chooser_person', data)
        picker = data
        if(id == picker.id){
            nav_pages('game.html')
            want_nav_to_game('meme_reviewer')
            //console.log(true)
            doc_get('reviewer_label').innerText = 'You'
        }else{
            //console.log(false)
            nav_pages('game.html')
            want_nav_to_game('_picked_meme_image')
            doc_get('reviewer_label').innerText = picker.name
        }
        nav = 'game'
    })
    
    socket.on('connect', function(){
        //console.log('connect')
        nav_pages('room.html')
    })
    
    socket.on('disconnect', function(){
        location.reload()
    })
    
    
    socket.emit('what_my_id')
    socket.on('my_id', function(data){
        id = data.id
        //console.log(id)
    })
    
    socket.on('img_choose',function(data){
        if(id == picker.id){
            //console.log('img_choose',data)
            doc_get('show_imgs').style.display = 'block'
            document.getElementById('img_picker').innerHTML = ' '
            for(let x = 0; x < data.length; x++){
                let img = document.createElement('img')
                img.src = data[x].img_data
                img.width = 250
                img.height = 250
                img.className = 'w3-image'
                img.onclick = function click_pick_img(){
                    socket.emit('game_start_part_two', data[x])
                    document.getElementById('show_imgs').style.display = 'none'
                    //console.log(data[x])
                }
                document.getElementById('img_picker').appendChild(img)
            }
        
            //socket.emit('game_start_part_two', data[0])
        }
    })
    
    socket.on('img_meme_edit', function(data){
        //console.log('img_meme_edit', data)
        want_nav_to_game('game_meme_maker')
        //socket.emit('sent_image', {img_data:data.img_data, name:'hello_fuck'})
        add_image(data.img_data)
    })
    
    socket.on('done_imgs', function(data){
        //console.log('done_imgs', data)
        document.getElementById('meme_scroll').innerHTML = ''
        doc_get('meme_done_list_check').innerText = 'You got '+data.length + ' meme'

        for(let x = 0; x < data.length; x++){
            let img = document.createElement('img')
            img.src = data[x].img
            img.width = 300
            img.height = 300
            img.className = 'mySlides w3-image'
            img.style.display = 'none'
            img.onclick = function click_pick_img(){
                socket.emit('winner_has_been_picked',data[x])
                //console.log(data[x])
            }
            document.getElementById('meme_scroll').appendChild(img)
        }

        plusDivs(1)
        //socket.emit('winner_has_been_picked',data[1])
    })

    socket.on('Game_running_already', function(){
        //console.log('hello')
        nav_pages('game.html')
        want_nav_to_game('round_has_started')
    })
    
    socket.emit('get_player_list')
    socket.on('player_list', function(data){
        let score_show = false
        let doc_nav
        if(nav == 'game' || nav == 'game_over'){
            score_show = true
        }
        if(nav == 'room'){
            doc_nav = 'room_list'
        }else if(nav == 'game_over'){
            doc_nav = 'game_over_list'
        }else{
            doc_nav = 'player_list_modal_table'
        }
        doc_get(doc_nav).innerHTML = ' '
        for(let x = 0; x < data.length; x++){
            //console.log(data)
            let row  = doc_get(doc_nav).insertRow(x)
            let username = row.insertCell(0)
            let id_user = row.insertCell(0)
            username.innerHTML = '[ID]'+data[x].id.slice(20)
            id_user.innerHTML = data[x].name
            if(score_show == true){
                let socre = row.insertCell(-1)
                socre.innerHTML = 'Score: '+data[x].score
            }
        }
    })
    
    socket.on('time_up', function(){
        //console.log('time_up', true)
        if(submit_meme == false && id != picker.id && nav != 'winner'){
            want_nav_to_game('out_of_time')
        }
        submit_meme = false
    })
    
    socket.on('timer', function(data){
        //console.log('timer', data)
        if(data.timer == 0){
            if(picker.id == id){
                document.getElementById('timer_').innerText = 'Pick A Meme'
            }else{
                document.getElementById('timer_').innerText = 'Time Up'
            }
            
        }else{
            document.getElementById('timer_').innerText = data.timer
        }
    })
    
    socket.on('winner_of_round', function(data){
        //console.log('winner', data)

        nav_pages('winner_screen.html')

        restart_stage()
        document.getElementById('meme_scroll').innerHTML = ''
        doc_get('meme_done_list_check').innerText = 'You got '+ 0 + ' meme'
        doc_get('winner_image').src = data.img
        doc_get('winner_image').onclick = function click_winner(){
            zoom_image(data.img)
        }
        doc_get('winner_name').innerText = data.name
        doc_get('winner_id').innerText = data.id.slice(20) 
    })

    socket.on('round', function(data){
        //console.log(data)
        document.getElementById('round').innerText = data.round
    })
    
    socket.on('no_one_submit', function(){
        want_nav_to_game('no_one_submit')
    })

    socket.on('other_meme', function(data){
        //console.log(data)
        nav_pages('view_other_meme.html')
        doc_get('other_memes').innerHTML = ''
        for(let x = 0; x < data.length; x++){
            let img = document.createElement('img')
            img.src = data[x].img
            img.width = 300
            img.className = 'w3-image'
            img.style.borderWidth = 1
            img.style.borderColor = 'black'
            img.onclick = function click_other(){
                zoom_image(data[x].img)
            }
            let br = document.createElement('br')
            let id = document.createElement('label')
            id.innerText = '[ID]'+data[x].id.slice(20) 
            let username = document.createElement('label')
            username.innerText = data[x].name
            let div = document.createElement('div')
            div.className = 'w3-quarter'
            div.append(img)
            div.append(br)
            div.append(username)
            div.append(br)
            div.append(br)
            div.append(id)
            div.append(br)
            doc_get('other_memes').append(div)
        }
        
    })

    socket.on('game_over', function(){
        nav = 'game_over'
        nav_pages('game_over.html')
        socket.emit('get_player_list')
    })
}
//#######################################################################

//Meme reviewer
let slideIndex = 1;

function plusDivs(n) {
  showDivs(slideIndex += n);
}

function showDivs(n) {
    let x = document.getElementsByClassName("mySlides");
    if (n > x.length) {slideIndex = 1}
    if (n < 1) {slideIndex = x.length} ;
    for (let i = 0; i < x.length; i++) {
        x[i].style.display = "none";
        //console.log(x[i])
    }

    x[slideIndex-1].style.display = "block";
    //console.log(x[slideIndex-1])
}

function zoom_btn(){
    let img = document.getElementsByClassName("mySlides");
    zoom_image(img[slideIndex-1].src)
}

//#######################################################################

//meme creator 

//PIXI app
let size_can = 150
let scale

const app = new PIXI.Application({
    backgroundColor: 0x000,   
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
    autoResize:true,
    width:size_can,
    height:size_can,
})

//console.log(app.screen.width, app.screen.height)

//arr of text data
let delete_Text = false
let font_set = 'Arial'
let lock_image = false

//put app screen to document
document.getElementById('memecan').appendChild(app.view)

function resize_can(){
    let _w = window.innerWidth /size_can
    let _h = window.innerHeight / size_can
    let offset = 100
    scale = Math.min(_w, _h)
    let new_size_w = Math.floor(size_can * scale)
    let new_size_h = Math.floor(size_can * scale)
    //console.log(_w,_h,scale, new_size_w,new_size_h)

    //console.log(app.renderer.scale)
    app.renderer.view.style.width = new_size_w -offset + 'px'
    app.renderer.view.style.height = new_size_h -offset + 'px'
    app.renderer.resize(new_size_w -offset, new_size_h -offset)

    for(let y = 0; y < app.stage.children.length; y++){
        app.stage.children[y].scale.set(scale -0.5)
        //console.log(app.stage.children[y])
    }
}

resize_can()


function get_font(item){
    font_set = item
    doc_get('font_in_use').innerText = font_set
}

function lock_image_btn(){
    if(lock_image == false){
        lock_image = true
        doc_get('lock_image_btn').innerText = 'Lock Image ON'
    }else{
        lock_image = false
        doc_get('lock_image_btn').innerText = 'Lock Image OFF'
    }
    
}

//white background image
function restart_stage(){
    for(let y = 0; y < app.stage.children.length; y++){
        app.stage.removeChild(app.stage.children[y])
    }

    let back = new PIXI.Graphics();
    back.beginFill(0xFFFFFF);
    back.drawRect(0, 0, app.screen.width, app.screen.height);
    back.endFill();
    app.stage.addChild(back)

}

restart_stage()

//remove btn
function click_remove(){
    if(delete_Text == false){
        doc_get('remove_text_btn').innerHTML = 'Remove Text On'
        delete_Text = true
    }else{
        doc_get('remove_text_btn').innerHTML = 'Remove Text OFF'
        delete_Text = false
    }
}


//text btn
function add_text(){
    delete_Text = false
    let text = doc_get('text_meme_input').value
    //console.log(text)
    create_text(text)
    doc_get('text_meme_input').innerText = ''
}

//image btns
function add_image(url){
    let text_from_input = url
    //console.log(text_from_input)
    create_image(text_from_input)
}

//image
function create_image(url){
    let math_img = document.createElement('img')
    math_img.style.display = 'none'
    math_img.onload = function(){
        //console.log(math_img.width, math_img.height)
        let img = PIXI.Sprite.from(url);
        img.x = app.screen.width/2
        img.y = app.screen.height/2
        img.anchor.set(0.5);
        let ratio_h = app.screen.height/math_img.height
        let ratio_w = app.screen.width/math_img.width
        let ratio = Math.min(ratio_w, ratio_h)
        //console.log(ratio)
        if(ratio != Infinity){
            let new_width = math_img.width * ratio
            let new_height = math_img.height * ratio
            img.width = new_width / 1.2
            img.height = new_height / 1.2
        }
        img.interactive = true;
        img.buttonMode = true;
        img.on('pointerdown', check)
        img.on('pointerup', checkend)
        img.on('pointermove', checkworking)
    
        app.stage.addChild(img)
    }
    math_img.src = url

}

//text
function create_text(text_var){
    if(text_var == null || text_var == ' '){
        return null
    }

    let font_type = font_set
    let fill_text = doc_get('fill_text').value
    fill_text = fill_text.replace('#', '0x')
    let fill_outline = doc_get('fill_outline').value
    fill_outline = fill_outline.replace('#', '0x')
    let fontsize = doc_get('font_size').value
    fontsize = parseInt(fontsize)
    let width_outline = doc_get('font_outline_width').value
    width_outline = parseInt(width_outline)
    //console.log(font_type,fill_text, fill_outline, fontsize, width_outline)

    if(fill_text == null){
        fill_text = '0x000'
    }

    if(fill_outline == null){
        fill_outline = '0x000'
    }

    if(fontsize <= 0 || fontsize > 50){
        fontsize = 4
    }

    if(width_outline == null || width_outline > 20){
        width_outline = 0
    }

    if(font_type == null){
        font_type = 'Arial'
    }

    let text_style = new PIXI.TextStyle({
        breakWords: true,
        wordWrap: true,
        wordWrapWidth: app.screen.width,
        fill: fill_text,
        fontSize: fontsize,
        stroke: fill_outline,
        strokeThickness: width_outline,
        fontFamily: font_type,
    })

    let text = new PIXI.Text(text_var, text_style)
    text.x = app.screen.width/2
    text.y = app.screen.height/2
    text.anchor.set(0.5);
    text.interactive = true;
    text.buttonMode = true;
    
    text.on('pointerdown', check)
    text.on('pointerup', checkend)
    text.on('pointermove', checkworking)

    //console.log(app.stage)

    app.stage.addChild(text)
}

//drag and drop function 
function check(event){
    //console.log(this)
    if(this._text != undefined){
        if(delete_Text == false){
            this.data = event.data
            this.dragging = true
           //console.log(this.data)
        }else{
            this.data = event.data
            app.stage.removeChild(this)
            //console.log('Remove')
        }
    }else{
        this.data = event.data
        this.dragging = true
        //console.log(this.data)
    }
}
function checkend(){
    document.body.style.overflowY = 'scroll'

    this.dragging = false
    this.data = null
}
function checkworking(){
    document.body.style.overflowY = 'hidden'

    if(this._text != undefined){
        if(this.dragging == true){
            let newpos = this.data.getLocalPosition(this.parent)
            this.x = newpos.x
            this.y = newpos.y
        }
    }else{
        if(lock_image == false){
            if(this.dragging == true){
                let newpos = this.data.getLocalPosition(this.parent)
                this.x = newpos.x
                this.y = newpos.y
            }
        }
    }

    //check if out of bound
    if(this.x - this.width/2 < 0 ){
        console.log('hit')  
        this.x = this.width/2
    }else if(this.x + this.width/2 > app.screen.width){
        console.log('hit') 
        this.x = app.screen.width - this.width/2
    }

    if(this.y - this.height/2 < 0 ){
        console.log('hit') 
        this.y = this.height/2
    }else if( this.y + this.height/2 > app.screen.height ){
        console.log('hit')
        this.y = app.screen.height - this.height/2
    }

}

//punish out to base64 data
function export_base64(){
    let read = new FileReader
    app.renderer.extract.canvas(app.stage).toBlob((b) => {
        let url = URL.createObjectURL(b);
        read.readAsDataURL(b)
        read.onloadend = function(){
            //console.log(read.result)
            socket.emit('sent_image', {img_data:read.result, name:name})
        }
        //console.log(url)
    }, 'image/jpeg');
    want_nav_to_game('wait_for_other_player_to_submit')
    submit_meme = true

    restart_stage()
}

//#######################################################################