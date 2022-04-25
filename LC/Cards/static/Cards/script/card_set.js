
$(document).ready(function() { //jQuery библиотека скриптов на JS
    $(document).on('click', '.dropdown-menu', function (e) {
        if (e.target.classList.contains('keep_open')){
            e.stopPropagation();
            e.preventDefault();
        }
    }); 
});

function find_nearest_obj(dom_element){
    let element = dom_element
    while (element != document) {
        if (element.obj != undefined) {
            return element.obj;
        }
        element = element.parentElement;
    }
    return undefined;
}

function OpenUrlInNewWindow(event){
    const element = event.target;
    const url = element.getAttribute("URL");
    window.open(url, '_blank').focus();
   }

//Игровая карта. Хранит данные карты в виде сырых данных JSON
export class Card {
    constructor(card_data, front, back, card_set, show_tags = true, container = null) {
        this.card_data = card_data;
        this.front = front; //[fron face attr]
        this.back = back; //[back face attr]
        this.show_tags = show_tags;
        this.card_set = card_set;
        this.container = container;
        this.is_front_side = true;
        this.container.card=this;
    }
    static create_without_card_set(card_data, front, back, user_tags, show_tags = true, container = null)
    {
        let result = new Card(card_data, front, back, undefined, show_tags, container);
        let card_set = Card_set.create_from_card(result,user_tags);
        result.card_set = card_set
        return result; 
        
    }

    get_id() {
        return this.card_data.id;
    }

    get_data(){
        return this.card_data
    }

    set_data(data){
        this.card_data = data
        if (this.card_set) {
            this.card_set.update_card(this.get_id(),this.card_data)
        }
    }

    show_side(instantly = false) {     
        let card = this.container.querySelector('#card-holder' + this.get_id())
        if (this.is_front_side) {
            card.className = instantly? 'rotate-instantly0': 'rotate0';
        }
        else {
            card.className = instantly? 'rotate-instantly180': 'rotate180';   
        }
    }

    reverse() {
        this.is_front_side = !this.is_front_side;
        this.show_side(false)
    }

    move(in_out,direction, onAnimationendExternal = undefined) {

        let onAnimationend = function (event) {               
            event.target.classList.remove('move_in_from-' + direction)
            if (onAnimationendExternal)
                onAnimationendExternal()
        };        

        let class_name = in_out =='in' ? 'move_in_from-': 'move_out_to-';
        class_name +=  direction;
        let card_dom_object = this.container;
        card_dom_object.onanimationend = onAnimationend;
        card_dom_object.classList = [];
        card_dom_object.classList.add(class_name);       
    }
   
    show() {
        this.container.innerHTML = this._getHTML();
        //new card always created on front side. Need to add  to rotate 
        if (!this.is_front_side) {
            this.show_side(true)
        }

        const tag_selectors = this.container.querySelectorAll("#card_tag_selector" + this.get_id());
        for (let i = 0; i < tag_selectors.length; i++) {
            tag_selectors[i].card = this
            tag_selectors[i].onchange=this._tag_selector_onchange
         }

        const tag_elements = this.container.querySelectorAll(".card_tag_item");
        for (let i = 0; i < tag_elements.length; i++) {
            tag_elements[i].card = this
            tag_elements[i].onclick = this._tag_onclick      
        }

        const card_titles = this.container.querySelectorAll('.card-title');
        for(let i=0;i<card_titles.length; i++){
            card_titles[i].card = this
            card_titles[i].onclick = function (event) { event.target.card.reverse() };
            }
        
        const card_menu = this.container.querySelectorAll(".card_menu");
        for(let i=0;i<card_menu.length; i++){
            card_menu[i].onclick = OpenUrlInNewWindow;
        }
    }
     
    _tag_onclick(event) {
        const card = event.target.card;
        const tag_id = event.target.getAttribute("tag_id");
   
        fetch('../delete_card_tag', {
            method: 'POST',
            body: JSON.stringify({ 'tag_id':tag_id, 'card_id': card.get_id()})
        })
            .then(
                response => response.json()
            )
            .then(result => {
                const card = this.card; 
                card.set_data(result);
                card.show()
            })        
    }

    _tag_selector_onchange(event) {
        const card = event.target.card;
        const tag_id =event.target.value;
   
        fetch('../set_card_tag', {
            method: 'POST',
            body: JSON.stringify({ 'tag_id':tag_id, 'card_id': card.get_id()})
        })
            .then(
                response => response.json()
            )
            .then(result => {
                const card = this.card; 
                card.set_data(result);
                card.show()
            })        
    }

    _tags_to_string(tags, class_ = '') {
        let result = ''
        for (let i = 0; i < tags.length; i++) {
            result += `<span card_id = '${this.get_id()}' tag_id = '${tags[i].id}' class = '${class_}'>&lt;${tags[i].name}&gt;</span>`;
        }
        return result
    }

    _getHTML() {
        let result = `<div id="card-holder${this.get_id()}" style ="text-align:center">`;

        const sides = [true, false]
        for (let i = 0; i < sides.length; i++) {

            let attributes = (sides[i]) ? this.front : this.back;
            let show_tags = (sides[i]) ? false : this.show_tags;
            let tags = this.card_data.tags;
            // user tags applyed to this card
            let card_user_tags = this.card_data.user_tags;

            let header = '';
            let card_number_label = ''
            if (this.card_set != null) {
                card_number_label = `${this.card_set.get_card_number(this) + 1}/${this.card_set.cards_count()}`
            }     
            else{
                card_number_label = '1/1'
            }
            header = `<span class = 'card_menu' URL = '/Cards/card_profile/${this.get_id()}/'>${card_number_label}</span>`
          

            let body = '';

            for (let i = 0; i < attributes.length; i++) {
                const FA = this.card_data.FAs[attributes[i]]
                if (FA != undefined) {
                    let class_size = 'card-title-bg';
                    if (FA.length>'30'){
                        class_size = 'card-title-sm';
                    }     
                    if (FA.length>'20'){
                        class_size = 'card-title-md';     
                    }
                    body += `<h5 class="card-title ${class_size}">${FA}</h5> \n`;
                }
            }

            let footer = ''
            if (show_tags) {
                footer += this._tags_to_string(tags,'tag_common')
            }

            //user_tags selector
            let user_tags_selector = `
                <form style="padding-bottom: 0px; margin: 0px; ">
                    <select id ="card_tag_selector${this.get_id()}" card_id ="${this.get_id()}" class="form-select form-select-sm" aria-label=".form-select-sm example">
                    <option selected>set tag</option>
                                `

            // all user_tags of current user    
            if (this.card_set != undefined) {
                let game_user_tags = this.card_set.get_user_tags()
                for (let i = 0; i < game_user_tags.length; i++) {
                    user_tags_selector += `<option value=${game_user_tags[i].id}>${game_user_tags[i].name}</option>`
                }
            }

            user_tags_selector += '</select></form>'

            let user_tags_string = ` <div style="display: flex; align-items: center;">                                 
                                        ${this._tags_to_string(card_user_tags,'tag_user card_tag_item')} 
                                        ${user_tags_selector}
                                    </div>
                                  `

            result += `
            <div class="card border-success mb-3 game-card ${i == 0 ? "flip-card-front" : "flip-card-back"}">
            <div class="card-header bg-transparent border-success ">${header} ${user_tags_string}</div>
            <div class="card-body text-success ">
            ${body}
            </div>
            <div class="card-footer bg-transparent border-success ">${footer}</div>
        </div>
        `
        }
        return result + '</div>'
    }
}

//Игра. Хранит данные игры (список карты в виде данных JSON)
export class Card_set {
    // методы класса
    constructor(cards, tags, front, back ) {
        // dict {card.id: card object}
        this.cards = cards.cards;
        //array of card.id 
        this.order = cards.order;
        this.tags = tags;
        this.current_card_number = 0;
        this.front = front;
        this.back = back;
        this.show_tags = true;
    }
    static create_from_card(card, tags ) {
        let cards = {}
        const id = card.get_id() 
        cards['cards'] = {id:card}
        cards['order'] = [id]

        return new Card_set(cards, tags, card.front, card.back)
    }
    update_card(card_id,card_data) {
        this.cards[Number(card_id)] = card_data;          
    }

    get_user_tags() {
        return this.tags.user_tags
    }

    cards_count() {
        return this.order.length
    }

    get_current_card_number() {
        return this.current_card_number
    }

    get_card_number(card) {
        const id = card.get_id();
        return this.order.findIndex(x => x == id)
    }

    change_card(increment) {
        let new_card_number = this.current_card_number + increment;
        new_card_number = new_card_number < 0? 0:new_card_number;
        new_card_number = new_card_number>this.cards_count() - 1? this.cards_count() - 1: new_card_number;
        this.current_card_number = new_card_number;
    }

    get_card(number, container) {
        return new Card(this.cards[this.order[number]], this.front, this.back, this, this.show_tags, container)
    }
}

export class Tag_selector_set{

    constructor(user_tags, tags, captions, container=undefined ){
        //captions = {'inculde':'caption for includes', 'exclude':'caption for excludes' } 
        this.tags = tags;//[{'name':name,'id': id},{}...]
        this.user_tags = user_tags;//[{'name':name,'id': id},{}...]
        this.tag_selectors = [] //[{'include': Tag_selector, 'exclude': Tag_selector},{same}...]        
        this.onChange = undefined;
        this.captions = captions;
        this.set_container(container);
       
        this.add_tag_selectors_pair()
    }
 
    change(){
        if (this.onChange != undefined) {
            this.onChange()
        }
    }

    set_container(container){
        this.container = container;
        if (container != undefined) {
            this.container.obj = this;
        }         
    }

    add_tag_selectors_pair(){
        let ts_pair = {}         
        ts_pair['include'] = new Tag_selector(this.user_tags,this.tags,this,this.captions['include']);      
        ts_pair['exclude'] = new Tag_selector(this.user_tags,this.tags,this,this.captions['exclude']);
        
        this.tag_selectors.push(ts_pair);
        this.show()
    }

    _getHTML(){
        let tag_selectors_html ='';
        for (let i=0;i<this.tag_selectors.length;i++){
            tag_selectors_html+= `<div class="row" >
                                 <div style = 'display:flex' class=" col flex-column"  id='tag_selector_incl_${i}'></div>
                                 <div style = 'display:flex' class=" col flex-column" id='tag_selector_excl_${i}'></div>
                                 </div>`
            }
        let result = `${tag_selectors_html} 
                  <div button class="btn btn-primary" id = 'add-tag-selectors-btn' <h1> add filter </h1></button> </div>`        
        return result
    }


    show(){
        if(this.container == undefined) return
        
        this.container.style.marginBottom ="5px";
        this.container.className = "container-fluid"

        this.container.innerHTML = this._getHTML()        
        for (let i=0;i<this.tag_selectors.length;i++){
            let container = this.container.querySelector('#tag_selector_incl_' + i)
            this.tag_selectors[i]['include'].set_container(container)
            this.tag_selectors[i]['include'].show();
            container = this.container.querySelector('#tag_selector_excl_' + i)
            this.tag_selectors[i]['exclude'].set_container(container)
            this.tag_selectors[i]['exclude'].show();
        }

        this.container.querySelector('#add-tag-selectors-btn').onclick = function (event) { 
            find_nearest_obj(event.target).add_tag_selectors_pair();           
        };

    }
// return [{'include':[tag_id, ..], 'exclude':[tag_id, ...]} ...]
    get_selected_tags(){
        let result =[]
        for(let i=0; i< this.tag_selectors.length;i++){
            let element = {}
            element['include'] = this.tag_selectors[i]['include'].selected_tags;
            element['exclude'] = this.tag_selectors[i]['exclude'].selected_tags;
            result.push(element);
        }
        return result;
    }
}

export class Tag_selector{
    constructor(user_tags, tags, tag_selector_set,caption,container=undefined) {
        this.tags = tags;//[{'name':name,'id': id},{}...]
        this.user_tags = user_tags;//[{'name':name,'id': id},{}...]
        this.selected_tags = []; //[tag.id, tag.id....]
        this.all_tags_dict = {} // {tag.id: {'name':name,'id': id}...} tags.id and user_tags.id do not intersect
        this.set_container(container);
        this.onChange = undefined;
        this.tag_selector_set = tag_selector_set;
        this.caption = caption;
        for(let i=0; i < this.tags.length;i++){
            this.tags[i]['type'] ='common';
            this.all_tags_dict[this.tags[i].id] = this.tags[i]
        }
        for(let i=0; i < this.user_tags.length;i++){
            this.user_tags[i]['type'] ='user';
            this.all_tags_dict[this.user_tags[i].id] = this.user_tags[i]
        }
    }

    set_container(container){
        this.container = container;
        if (container != undefined) {
            this.container.obj = this;
        } 
    }

    show(){        
        this.container.innerHTML = this._getHTML()
        this.container.style.marginBottom = '5px';
        
        this._update_selected_tags_dom()       
        this._show_selected_tags()       
        $(this.container).on('click', '.form-check-input', function (e) {              
          const tag_selector = find_nearest_obj(e.target)              
          if (tag_selector != undefined){
              tag_selector._update_selected_tags()
          }            
        }); 
        
    }

    _get_tag_by_id(tag_id){
         return this.all_tags_dict[tag_id]

    }

    _update_selected_tags_dom(){
        const tag_selectors = this.container.querySelectorAll(".tag_selector");        
        for (let i = 0; i < tag_selectors.length; i++) {
            let id = Number(tag_selectors[i].getAttribute('tag_id_data'))             
            tag_selectors[i].checked=this.selected_tags.includes(id)            
        } 
    }

    _update_selected_tags() {
        const tag_selectors = this.container.querySelectorAll(".tag_selector");
        this.selected_tags = []
        for (let i = 0; i < tag_selectors.length; i++) {
            if (tag_selectors[i].checked) {
                this.selected_tags.push(Number(tag_selectors[i].getAttribute('tag_id_data')))

            }
        }
        this._show_selected_tags()
        if (this.tag_selector_set != undefined){
            this.tag_selector_set.change()
        }
    }    

    _tags_to_html_string() {
        let result = ''
        for (let i = 0; i < this.selected_tags.length; i++) {
            let tag_data = this.all_tags_dict[this.selected_tags[i]]; 
            let class_ = tag_data['type'];
            result += `<span class = 'tag_${class_}'>&lt;${tag_data['name']}&gt;</span>`;
        }
        return result
    }

    _show_selected_tags (){
        let result = this._tags_to_html_string ()
        this.container.querySelector("#selected_tags").innerHTML = result
    }

    _getHTML() {

        let result = "<div class='col' id ='selected_tags'></div>"        
        
        let common_tags_html = ''
        for (let i = 0; i < this.tags.length; i++) {
            common_tags_html += `<div class="form-check">
                                     <input type="checkbox" class="form-check-input tag_selector" tag_id_data ='${this.tags[i].id}' id="dropdownCheck${this.tags[i].id}">
                                     <label class="form-check-label keep_open" for="dropdownCheck${this.tags[i].id}">
                                     ${this.tags[i].name}
                                 </label> </div>`
        }
        let personal_tags_html = ''
        for (let i = 0; i < this.user_tags.length; i++) {
            personal_tags_html += `<div class="form-check">
                                 <input type="checkbox" class="form-check-input tag_selector" tag_id_data ='${this.user_tags[i].id}' id="dropdownCheck${this.user_tags[i].id}">
                                 <label class="form-check-label keep_open" for="dropdownCheck${this.user_tags[i].id}">
                                 ${this.user_tags[i].name}
                                 </label>  </div>`
        }
           result = `<div><h4>${this.caption}</h4></div>
            <div class = 'row bg-light border flex-grow-1'>${result}
            <div class="dropdown  flex-grow-0">
            <button class="btn btn-default dropdown-toggle" type="button" data-toggle="dropdown">...
                <span class="caret"></span></button>
            <div class="dropdown-menu keep_open">
                <p class="mb-0  keep_open">Personal tags.</p>
                <div style="display: flex; justify-content:last baseline; flex-wrap: wrap">
                    ${personal_tags_html}
                </div>
                <p class="mb-0  keep_open">   Common tags. </p>
                <div style="display: flex; justify-content:last baseline; flex-wrap: wrap">
                    ${common_tags_html}
                </div>             
            </div>
        </div></div>`     
        return result
    }
}