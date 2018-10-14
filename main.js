"use strict";

if(!window.gallery) window.gallery = {};
let G = window.gallery;

import {createFragment as $C} from "/modules/create_dom.js";
let $=(s,e=document)=>e.querySelector(s);
let $A=(s,e=document)=>e.querySelectorAll(s);
(function() {
    if (!HTMLElement.prototype.querySelectorAll) {
        throw new Error('rootedQuerySelectorAll: This polyfill can only be used with browsers that support querySelectorAll');
    }

    // A temporary element to query against for elements not currently in the DOM
    // We'll also use this element to test for :scope support
    let container = document.createElement('div');

    // Check if the browser supports :scope
    try {
        // Browser supports :scope, do nothing
        container.querySelectorAll(':scope *');
    }
    catch (e) {
        // Match usage of scope
        let rxTest = /(?:^|,)\s*:scope\s+/,
            rxStart = /^\s*:scope\s+/i,
            rxOthers = /,\s*:scope\s+/gi;

        // Overrides
        let overrideNodeMethod = (prototype, methodName)=>{
            // Store the old method for use later
            let oldMethod = prototype[methodName];

            // Override the method
            prototype[methodName] = function(query) {
                let nodeList, parentNode, frag, idSelector,
                    gaveId = false,
                    gaveContainer = false,
                    parentIsFragment = false;

                if (rxTest.test(query)) {

                    if (!this.parentNode) {
                        // Add to temporary container
                        container.appendChild(this);
                        gaveContainer = true;
                    }

                    if (this.parentNode instanceof DocumentFragment) {
                        frag = this.parentNode;
                        while (frag.firstChild) container.appendChild(frag.firstChild);
                        parentIsFragment = true;
                    }

                    let parentNode = this.parentNode;

                    if (!this.id) {
                        // Give temporary ID
                        this.id = 'rootedQuerySelector_id_'+(new Date()).getTime();
                        gaveId = true;
                    }

                    query = query.replace(rxStart, '#'+this.id).replace(rxOthers, ', #'+this.id);

                    // Find elements against parent node
                    nodeList = oldMethod.call(parentNode, query);

                    // Reset the ID
                    if (gaveId) {
                        this.id = '';
                    }

                    // Remove from temporary container
                    if (parentIsFragment) {
                        while (container.firstChild) frag.appendChild(container.firstChild);
                    } else if (gaveContainer) {
                        container.removeChild(this);
                    }

                    return nodeList;
                }
                else {
                    // No immediate child selector used
                    return oldMethod.call(this, query);
                }
            };
        };

        // Browser doesn't support :scope, add polyfill
        overrideNodeMethod(HTMLElement.prototype, 'querySelector');
        overrideNodeMethod(HTMLElement.prototype, 'querySelectorAll');
    }
}());// scope polyfill

function get_lang(langs=["en", "ru"]){
    let lang = localStorage.getItem('preferred_language');
    if(lang && langs.indexOf(lang) >= 0)
        return lang;

    let sl=(a)=>{
        for(let i of a){
            let [b,d] = i.split('-');
            if(d && (a.indexOf(b) < 0))
                    a.push(b);
        }
        return a;
    };

    let langs_split = sl(navigator.languages);
    let req_langs_split = sl(langs);

    lang = langs[0];
    for(let i of langs_split){
        if(req_langs_split.indexOf(i) >= 0) {
            lang = i;
            break;
        }
    }

    localStorage.setItem('preferred_language', lang);
    return lang;
}
let L=G.L=(choice)=>{
    if(typeof choice === "string")
        return choice;
    if(choice[document.body.lang])
        return choice[document.body.lang];
    return choice[Object.keys(choice)[0]];
};
let is_touch = false;
window.addEventListener('touchstart', ()=>{
    is_touch = true;
    $('html').classList.add('touch-interface');
}, {once:true, capture:true});
let scrollbar_size = -1;
function getScrollbarSize() {
    if(scrollbar_size < 0) {
        let d = document.createElement('div');

        d.innerHTML = `
            <div style="width: 100px;height: 100px;position: fixed; top:-200px; left: -200px;">
                <div style="overflow-y: scroll; width: 100%;">
                     <div style="width: 100%;" class="getScrollbarSize-target">&nbsp;</div>
                </div>
            </div>`;
        document.body.appendChild(d);
        let targ = d.querySelector('.getScrollbarSize-target');
        scrollbar_size = 100 - targ.offsetWidth;
        d.remove();
    }
    return scrollbar_size;
}
document.body.style.cssText += '--scrollbar-size:' + getScrollbarSize() + "px;";

let sbv_remover = /(--scrollbar-ratio:[0-9.]+;|--scrollbar-top:[0-9.]+;)/g;
function scrollbar_recalc(outer, inner) {
    let sh = inner.scrollHeight, oh = inner.offsetHeight;
    let ratio = sh > 0 ? oh / sh : 1, top = sh > 0 ? inner.scrollTop / sh : 0;

    if(ratio >= 1){
        outer.classList.add('no-scroll');
    }else{
        outer.classList.remove('no-scroll');
        let css = outer.style.cssText.replace(sbv_remover, "");
        outer.style.cssText = css + `--scrollbar-ratio:${ratio};--scrollbar-top:${top};`;
    }
}
function init_scroll(el){
    let outer = el.matches(".scroll-outer") ? el : $(".scroll-outer", el);
    let inner = outer.firstElementChild;
    if($(":scope>.scroll-bar-container", outer)) return;

    outer.appendChild($C(`<div class="scroll-bar-container"><div class="scroll-bar">&nbsp;</div></div>`));
    let bc = outer.lastElementChild;
    inner.addEventListener('scroll', ()=>scrollbar_recalc(outer, inner), {passive: true});
    inner.addEventListener('mouseenter', ()=>scrollbar_recalc(outer, inner), {passive: true});
    let scrollbar_drag_start = (ev)=>{
        ev.preventDefault();
        ev.stopPropagation();
        let get_y = (ev)=>ev.screenY;
        if(ev.type === 'touchstart'){
            if(ev.touches.length > 1) return;
            get_y = (ev)=>ev.touches[0].screenY;
        }

        let lpy = get_y(ev);
        let move_cb=(e2)=>{
            e2.preventDefault();
            e2.stopPropagation();

            let delta = get_y(e2) - lpy;
            lpy = get_y(e2);

            inner.scrollTop += delta * inner.scrollHeight / bc.offsetHeight;
        };
        let end_cb=(e2)=>{
            e2.preventDefault();
            e2.stopPropagation();

            window.removeEventListener('mousemove', move_cb, {capture:true});
            window.removeEventListener('mouseup', end_cb, {capture:true});
            window.removeEventListener('touchstart', end_cb, {capture:true});
            window.removeEventListener('touchend', end_cb, {capture:true});
            window.removeEventListener('touchmove', move_cb, {capture:true});
        };
        window.addEventListener('mousemove', move_cb, {capture:true});
        window.addEventListener('mouseup', end_cb, {capture:true});
        window.addEventListener('touchstart', end_cb, {capture:true});
        window.addEventListener('touchend', end_cb, {capture:true});
        window.addEventListener('touchmove', move_cb, {capture:true});
    };
    bc.firstElementChild.addEventListener('mousedown', scrollbar_drag_start);
    bc.firstElementChild.addEventListener('touchstart', scrollbar_drag_start);
    scrollbar_recalc(outer, inner);
}
function init_scrolls(){
    for(let i of $A('.scroll-outer')) init_scroll(i);
}



G.contact_services = {
    "skype:": "&#xf30b;",
    "mailto:": "&#xe800;",
    "https://fb.me/": "&#xf301;",
    "https://vk.me/": "&#xe802;",
    "tel:": "&#xe801;"
};


let open_main=()=>{
    document.body.classList.add('me');
    document.body.classList.remove('galleries');
    document.body.classList.remove('gallery');
};
let open_galleries=()=>{
    document.body.classList.add('galleries');
    document.body.classList.remove('gallery');
    document.body.classList.remove('me');
    for(let i of $A('section .gallery.open')) i.classList.remove('open');
};
let switch_lang=()=>{
    let l = document.body.lang === 'ru' ? "en" : 'ru';
    localStorage.setItem('preferred_language', l);
    document.body.lang = l;
    document.title = L(G.database.title);
};
for(let i of $A('.lang-change')) i.addEventListener('click', switch_lang);
$('.to-main').addEventListener('click', open_main);
$('.to-galleries').addEventListener('click', open_galleries);

function open_gallery(ev){
    let i;
    if(ev instanceof Event) {
        i = ev.currentTarget.dataset.gallery;
        if(ev.currentTarget.classList.contains("open"))
            return open_galleries();
    }else{
        i = ev;
    }


    if(i < 0) i = 0;
    else if(i >= G.database.galleries.length) i = G.database.galleries.length - 1;

    document.body.classList.remove('galleries');
    document.body.classList.remove('me');
    document.body.classList.add('gallery');
    $(".galleries-list-outer .scroll-inner").scrollTop = 0;
    for (let j of $A('section .gallery.open')) j.classList.remove('open');
    for (let j of $A(`section .gallery[data-gallery="${i}"]`)) j.classList.add('open');
}

let image_gallery, image_image;
function open_image_no(i, j) {
    if(i < 0) i = 0;
    else if(i >= G.database.galleries.length) i = G.database.galleries.length - 1;

    let I = G.database.galleries[i];

    if(j < 0) j = I.contents.length - 1;
    else if(j >= I.contents.length) j = 0;

    image_gallery = i;
    image_image = j;

    $('.image-viewer').classList.add('open');

    $('.image-viewer .image-container img').src = `/photogallery/images/sources/${I.contents[j]}`;
}
function open_image(ev){
    console.log("open image", ev);
    let i = parseInt(ev.target.dataset.gallery);
    let j = parseInt(ev.target.dataset.image);

    open_image_no(i, j);
}
function open_next_image(){
    open_image_no(image_gallery, image_image + 1);
}
function open_prev_image(){
    open_image_no(image_gallery, image_image - 1);
}
let slideshow_timer = false;
function toggle_slideshow(){
    if(!slideshow_timer){
        slideshow_timer = setInterval(open_next_image, 3000);
        $(".image-viewer").classList.add('slideshow');
    }else{
        clearInterval(slideshow_timer);
        slideshow_timer = false;
        $(".image-viewer").classList.remove('slideshow');
    }
}
let viewer_close = ()=>{
    $('.image-viewer').classList.remove('open');
    if(document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement){
        G.switch_fullscreen();
    }
    if(slideshow_timer){
        toggle_slideshow();
    }
};
$('.image-viewer .image-container .slideshow').addEventListener('click', toggle_slideshow);
$('.image-viewer .image-container .prev').addEventListener('click', open_prev_image);
$('.image-viewer .image-container .next').addEventListener('click', open_next_image);
$('.image-viewer .image-container .exit').addEventListener('click', viewer_close);
$('.image-viewer .background-overlay').addEventListener('click', viewer_close);
$('.image-viewer .image-container .fs-toggle').addEventListener('click', ()=>G.switch_fullscreen());


function fullscreen_change(){
    if(document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement)
        $('.image-viewer .ui-overlay .fs-toggle').innerText = "";
    else
        $('.image-viewer .ui-overlay .fs-toggle').innerText = "";
}

window.addEventListener('fullscreenchange', fullscreen_change, {passive:true});
window.addEventListener('mozfullscreenchange', fullscreen_change, {passive:true});
window.addEventListener('webkitfullscreenchange', fullscreen_change, {passive:true});

G.switch_fullscreen = ()=>{
    let el = $('.image-viewer');
    if(document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement) {
        let fn = document.exitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen;
        fn.call(document);
    }else{
        let fn = el.requestFullscreen
            || el.mozRequestFullScreen
            || el.webkitRequestFullscreen;
        fn.call(el);
    }
};

G.key_parser=(ev)=>{
    if($('.image-viewer').classList.contains('open')){
        if(ev.key === "ArrowLeft"){
            open_prev_image();
        }else if((ev.key === "ArrowRight") || ev.key === " "){
            open_next_image();
            ev.preventDefault();
        }else if(ev.key === "Escape"){
            viewer_close();
        }else if(ev.key === "s"){
            toggle_slideshow();
        }
    }else if($("body.galleries")){
        if(ev.key === "ArrowLeft"){
            open_main();
        }
    }else if($("body.gallery")){
        if ((ev.key === "Escape") || (ev.key === "ArrowLeft")) {
            open_galleries();
        }
    }else if($("body.me")){
        if(ev.key === "ArrowRight"){
            open_galleries();
        }
    }
};
window.addEventListener('keydown', G.key_parser);

fetch("gallery.json").then(resp=>resp.json()).then(db=>{
    G.database = db;

    document.title = L(db.title);
    if(get_lang() !== document.body.lang) switch_lang();
    document.body.classList.add('me');

    let img = $('section.me .contents-wrap .bg img');
    img.src = `images/${db.me['_bg']}`;
    let c = $('section.me .contacts');
    for(let i in db.me.contacts){
        c.appendChild($C(`
            <a href="${i}${db.me.contacts[i]}" target="_blank">${G.contact_services[i]}</a>
        `));
    }

    let g_list = $('.galleries-list');
    let g_contents = $('.galleries-contents');
    g_list.innerHTML = '';
    g_contents.innerHTML = '';
    for(let i=0;i<db.galleries.length; ++i){
        let I = db.galleries[i];
        let cover = I.cover;
        if(!cover){
            cover = I.contents[I.contents.length - 1];
        }
        g_list.appendChild($C(`
            <div class="gallery" data-gallery="${i}">
                <div class="background" style="background-image: url('/photogallery/images/sources/${cover}')">&nbsp;</div>
                <div class="name" ><span lang="ru">${I.title.ru}</span><span lang="en">${I.title.en}</span></div>
            </div>
        `));
        let gal_btn = g_list.lastElementChild;
        gal_btn.addEventListener('click', open_gallery);

        g_contents.appendChild($C(`<div class="gallery" data-gallery="${i}"></div>`));
        let gal_c = g_contents.lastElementChild;

        gal_c.addEventListener('click', open_image);
        for(let j=0;j< I.contents.length;++j){
            let J = I.contents[j];
            gal_c.appendChild($C(`
                <div class="image-preview" data-gallery="${i}" data-image="${j}" style="background-image: url('/photogallery/images/sources/${J}')">&nbsp;</div>
            `));
        }
    }
}).catch(console.error);

init_scrolls();
