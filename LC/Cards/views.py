from django.urls import reverse
from xmlrpc.client import ResponseError
from django.shortcuts import get_object_or_404, render
from django.http import HttpResponseRedirect, JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Card, Tag, FA_value
from random import shuffle
import json
from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from .forms import *

 

def login_request(request):
    context = {}
    if request.method == "POST":
        username = request.POST['username']
        password = request.POST['psw']
        user = authenticate(username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('Cards:index')
        else:
            context['message'] = "Invalid username or password."
            return render(request, 'Cards/user_login.html', context)
    else:
        return render(request, 'Cards/user_login.html', context)


def logout_request(request):
    logout(request)
    return redirect('Cards:index')


def registration_request(request):
    context = {}
    if request.method == 'GET':
        return render(request, 'Cards/registration.html', context)
    elif request.method == 'POST':
        # Check if user exists
        username = request.POST['username']
        password = request.POST['psw']
        first_name = request.POST['firstname']
        last_name = request.POST['lastname']
        user_exist = False
        try:
            User.objects.get(username=username)
            user_exist = True
        except:
            pass
        if not user_exist:
            user = User.objects.create_user(username=username, first_name=first_name, last_name=last_name,
                                            password=password)
            login(request, user)
            return redirect("Cards:index")
        else:
            context['message'] = "User already exists."
            return render(request, 'Cards/registration.html', context)


def create_tag(request):
    if request.method == "POST":
        user_tag_name = request.POST['user_tag']
        tag = Tag()
        tag.user = request.user
        tag.name = user_tag_name
        try:
            tag.save()
        except:
            pass    
        return HttpResponseRedirect(reverse('Cards:profile'))


def delete_tag(request):
    if request.method == "POST":
        tag_id = int(request.POST['tag_id'])
        tag = get_object_or_404(Tag, pk=tag_id)
        tag.delete()
        return HttpResponseRedirect(reverse('Cards:profile'))


def profile(request):
    if not request.user.is_authenticated:
        return ResponseError('User is not authenticated')
    context = {}    
    context['user_tags'] = Tag.objects.filter(user=request.user)

    return render(request, 'Cards/profile.html', context)


def index(request):
    return render(request, "Cards/index.html",)


def game(request):
    context = {}
    return render(request, "Cards/game.html")


@csrf_exempt
def get_cards(request):
    data = json.loads(request.body) #{filter:[{'include':[tag_id, ..], 'exclude':[tag_id, ...]} ...]}
    filter = data['filter']
    cards_result = None
    for index, tags_pair in enumerate(filter):
        
        cards = Card.objects.all()
        tags_include = tags_pair.get("include", [])
        tags_exclude = tags_pair.get("exclude", [])
        if index > 0 and len(tags_include)== 0 and len(tags_exclude) == 0:
            continue

        for tag in tags_include:
            cards = cards.filter(tags__id=tag)
        for tag in tags_exclude:
            cards = cards.exclude(tags__id=tag)
        if cards_result == None:
            cards_result = cards
        else:
            cards_result = cards_result.union(cards)
        
    cards_dict = {}
    cards_order = []
    for card in cards_result:        
        cards_dict[card.id] = card.serialize(request.user)
        cards_order.append(card.id)
    shuffle(cards_order)
    result = {}
    result['cards'] = {'cards': cards_dict, 'order': cards_order}
    result['tags'] = get_tags_dict(request.user)

    return JsonResponse(result, safe=False)

def get_tags_dict(user,add_common_tags = True):
    result = {}
    if add_common_tags:
        tags = Tag.objects.filter(user=None)
        result['tags'] = [tag.serialize() for tag in tags]
    if user.is_authenticated:
        result['user_tags'] = [tag.serialize() for tag in Tag.objects.filter(user=user)]
    else:
        result['user_tags'] = []
    return result


@csrf_exempt
def get_metadata(request):
# return all metadata (data we need to setup a game) of the game. currently tags and FAs    
    result = get_tags_dict(request.user)  
    result['FAs'] = [FA.serialize() for FA in Face_attribute.objects.all()]
    
    return JsonResponse(result, safe=False)

@csrf_exempt
def set_card_tag(request):
    if request.method == "POST":
        data = json.loads(request.body)
        tag_id = int(data['tag_id'])
        card_id = int(data['card_id'])
        card = get_object_or_404(Card,pk = card_id)
        tag = get_object_or_404(Tag,pk = tag_id)
        if not card.tags.filter(id = tag_id):
            card.tags.add(tag)            
            card.save()
            
    return JsonResponse(card.serialize(request.user), safe=False)

@csrf_exempt
def delete_card_tag(request):
    if request.method == "POST":
        data = json.loads(request.body)
        tag_id = int(data['tag_id'])
        card_id = int(data['card_id'])
        card = get_object_or_404(Card,pk = card_id)
        tag = get_object_or_404(Tag,pk = tag_id)
        if card.tags.filter(id = tag_id):
            card.tags.remove(tag)
            card.save()
    return JsonResponse(card.serialize(request.user), safe=False)

def card_profile(request, card_id):
    card = get_object_or_404(Card,pk = card_id)
    if request.method == "POST":
        if request.POST['action'] == 'Save':
            form = CardForm(request.POST, user = request.user,instance=card)
            if form.is_valid():
                form.save()
        if request.POST['action'] == 'Delete':
            card.delete()
            return HttpResponse("Card succesfully deleted")
    else:
        form = CardForm(instance=card, user =request.user)    

    return render(request, 'Cards/card_profile.html', {'form': form, 'card_id': card_id})

def new_card(request):
    message = ''
    card_data = ''
    context = {}
    is_card_created = False
    if request.method == "POST":        
        form = CardForm(request.POST, user = request.user)
        if form.is_valid():
            card = form.save()
            is_card_created = True
            card_data = json.dumps(card.serialize(request.user))
   
    initial = {}    
    if is_card_created:
        initial['common_tags'] = [t.pk for t in card.tags.filter(user = None)]
        initial['user_tags'] = [t.pk for t in card.tags.filter(user = request.user)]
        message = 'Card succesfully created' 

    form = CardForm( user =request.user,initial = initial)    
    context['tags_data'] = json.dumps(get_tags_dict(request.user,False))
    context['form'] = form 
    context['message'] = message 
    context['card_data'] = card_data
   
    return render(request, 'Cards/new_card.html', context)
