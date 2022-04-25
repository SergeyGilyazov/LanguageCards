import {Card_set,Card, Tag_selector,Tag_selector_set } from './card_set.js'

var game

//assumming that "game" is global variable, need to find a way to avoid this (see start()).
class Game {
    // методы класса
    constructor(container ) {

        this.container = container; // DOM элемент содержащий игру
        this.card_set = undefined;
        this.tags = undefined; //[{'name':name,'id': id},{}...]
        this.user_tags = undefined;//[{'name':name,'id': id},{}...]
        this.FAs = undefined;//[FA1_name,FA2_name...]
        this.selected_tags = undefined;
        this.active_card_obj = undefined;
        this.touchStart = null; //Точка начала касания
        this.touchStart = null; //Текущая позиция
        this.active_card_container = undefined; //DOM элемент содержащий текущую карту
        this.tag_selectors_set = undefined;

        fetch('../get_metadata', {
            method: 'POST',
            body: JSON.stringify({})
        })
            .then(response => response.json())
            .then(result => {
                console.log(result)
                this.tags = result.tags;
                this.user_tags = result.user_tags;
                this.FAs = result.FAs;
                let captions = {'include':'Add cards with tags:','exclude':'except cards with tags:'}
                this.tag_selectors_set =  new Tag_selector_set (this.user_tags, this.tags, captions,);;   
                this.new_game()
            })

        
    }
     
    new_game() {
        
        let FA_selector =`
                 <div> <label><h4>Front side:</h4> </label>
                     <select id ="FA_selector" class="form-select form-select-sm">
                        `
        for (let i = 0; i < this.FAs.length; i++) {
            FA_selector += `<option value='${this.FAs[i]}'>${this.FAs[i]}</option>`
        }
        FA_selector += '</select></div>'
        this.container.style.padding = "5px";
        this.container.innerHTML = `
            
            <div class="alert alert-primary" id="lable-cards-count" > <h1>Number of cards in game</h1></div>
            <div>${FA_selector}</div> 
            <div id ='tag_selectors_container'></div>   
               
            <div class="alert alert-primary" style="padding:10px">                                  
            <div style="text-align: center" > <button class="btn btn-primary game-control" id = 'start-game-btn'><h1> start game </h1></button> </div>
            </div>`  

        let ts_container =  this.container.querySelector('#tag_selectors_container');
        this.tag_selectors_set.set_container(ts_container)
        this.tag_selectors_set.show()
        
        this.tag_selectors_set.onChange = function(){ game.update_new_game_page() };
        
        this.container.querySelector('#start-game-btn').onclick = function () { game.start_game() };
       
        this.update_new_game_page()
    }
 
    update_new_game_page(){

        //this.tag_selectors_set.show();
        this.selected_tags = this.get_selected_tags();        

                fetch('../get_cards', {
                    method: 'POST',
                    body: JSON.stringify({
                        filter: this.selected_tags
                    })
                }
                )
                    .then(response => response.json())
                    .then(result => {
                        const card_count = result.cards.order.length;
                        const lable = this.container.querySelector("#lable-cards-count")
                        if (lable != null) {
                            if (card_count == 0) {
                                 lable.innerHTML = `<h1>No cards found</h1>`
                                 lable.className = "alert alert-warning"
                               }
                            else {
                                lable.innerHTML = `<h1>Selected ${card_count} cards</h1>`
                                lable.className = "alert alert-primary"
                            }
                        }
                    })
    }    

    get_selected_tags() {
        return this.tag_selectors_set.get_selected_tags();        
    }

    start_game() {
        this.selected_tags = this.get_selected_tags();

        const front_attribute = [this.container.querySelector('#FA_selector').value];
        let back_attributes = [...this.FAs];
        back_attributes = back_attributes.filter((value)=>{return value !=front_attribute[0]});
     
        this.container.innerHTML = `
        <div id = 'current_card'></div>
        <div class = "game-control-bar">    
        <button class="btn btn-primary game-control" id="show-prev-card-btn" ><h1><i class="bi bi-arrow-left"></i> </h1></button>
        <button class="btn btn-primary game-control " id="reverse-card-btn" ><h1><i class="bi bi-arrow-repeat"></i> </h1></button>
        <button class="btn btn-primary game-control" id="show-next-card-btn"  ><h1><i class="bi bi-arrow-right"></i></h1></button>
        </div>`;
        this.active_card_container = this.container.querySelector('#current_card');

        //assumming that "game" is global variable, need to find a way to avoid this.
        this.container.querySelector('#show-prev-card-btn').onclick = function () { game.show_new_card('left') };
        this.container.querySelector('#show-next-card-btn').onclick = function () { game.show_new_card('right') };
        this.container.querySelector('#reverse-card-btn').onclick = function () { game.active_card_obj.reverse();};
        //Перехватываем события
        this.container.addEventListener("touchstart", function (e) { game.TouchStart(e); }); //Начало касания
        this.container.addEventListener("touchmove", function (e) { game.TouchMove(e); }); //Движение пальцем по экрану
        //Пользователь отпустил экран
        this.container.addEventListener("touchend", function (e) { game.TouchEnd(e); });
        //Отмена касания
        this.container.addEventListener("touchcancel", function (e) { game.TouchEnd(e); });

        fetch('../get_cards', {
            method: 'POST',
            body: JSON.stringify({
                filter: this.selected_tags
            })
        }
        )
            .then(response => response.json())
            .then(result => {                
                this.card_set = new Card_set(result.cards, result.tags, front_attribute, back_attributes);
                this.update_game_page()
            })
    }

    update_game_page() {
        const card_set = this.card_set;
        if (card_set.cards_count() == 0) {
            this.container.innerHTML = `<div class="alert alert-danger" role="alert">
                                           <h1>Card set is empty</h1>
                                     </div>

                                     <form action="/Cards/game/">   
                                        <div style="text-align: center; padding:10px"> 
                                             <input type="submit" class="btn btn-primary game-control" value = "Start new game"></input>
                                        </div>
                                     </form>
                                     `
        }
        else {
            this.container.querySelector('#show-prev-card-btn').disabled = (card_set.get_current_card_number() <= 0);
            this.container.querySelector('#show-next-card-btn').disabled = (card_set.get_current_card_number() >= card_set.cards_count() - 1);
      
            this.new_active_card_obj().show();                     
        }
    }

    show_new_card(direction) {       
        
        let onAnimationend = function () {
            let increment = direction == 'right' ? +1:-1;
            game.card_set.change_card(increment);
            game.update_game_page();            
            game.active_card_obj.move('in', direction);
        };

        this.active_card_obj.move('out', direction, onAnimationend);
    }

    new_active_card_obj(){
        this.active_card_obj = this.card_set.get_card(this.card_set.get_current_card_number(), this.active_card_container)
        return this.active_card_obj;
    }

    TouchStart(e) {
        //Получаем текущую позицию касания
        this.touchStart = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        this.touchPosition = { x: this.touchStart.x, y: this.touchStart.y };
    }

    TouchMove(e) {
        //Получаем новую позицию
        this.touchPosition = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }

    TouchEnd(e) {

        this.CheckAction(); //Определяем, какой жест совершил пользователь

        //Очищаем позиции
        this.touchStart = null;
        this.touchPosition = null;
    }

    CheckAction() {
        const sensitivity = 20;
        var d = //Получаем расстояния от начальной до конечной точек по обеим осям
        {
            x: this.touchStart.x - this.touchPosition.x,
            y: this.touchStart.y - this.touchPosition.y
        };
       
        if (Math.abs(d.x) > Math.abs(d.y)) //Проверяем, движение по какой оси было длиннее
        {
            if (Math.abs(d.x) > sensitivity) //Проверяем, было ли движение достаточно длинным
            {
                if (d.x > 0) //Если значение больше нуля, значит пользователь двигал пальцем справа налево
                {
                    console.log("Swipe Left");
                    this.show_new_card('left');
                }
                else //Иначе он двигал им слева направо
                {
                    console.log("Swipe Right");
                    this.show_new_card('right');
                }
            }
        }
        else //Аналогичные проверки для вертикальной оси
        {
            if (Math.abs(d.y) > sensitivity) {
                if (d.y > 0) //Свайп вверх
                {
                    console.log("Swipe up");
                }
                else //Свайп вниз
                {
                    console.log("Swipe down");
                }
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    game = new Game(document.querySelector('#game_container'));

    document.querySelector('#new_game_btn').onclick = (e)=> {
        e.stopPropagation();
        e.preventDefault();
        game.new_game()}
})





