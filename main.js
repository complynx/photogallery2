"use strict";


if(!window.gallery) window.gallery = {};
let G = window.gallery;
let start_location_search = location.search;

let $C = (()=>{

    //from jQuery
    let xhtmlTagCloser = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
        tagName = /<([\w:\-]+)/,
        tagNameSpace = /([\w\-]+):/;

    let wrapMap = {
        option: {
            level:1,
            prefix:"<select multiple='multiple'>",
            postfix:"</select>"
        },

        tbody: {
            level:1,
            prefix:"<table>",
            postfix:"</table>"
        },
        col: {
            level:2,
            prefix:"<table><colgroup>",
            postfix:"</colgroup></table>"
        },
        tr: {
            level:1,
            prefix:"<tbody>",
            postfix:"</tbody>",
            base:"tbody"
        },
        td: {
            level:1,
            prefix:"<tr>",
            postfix:"</tr>",
            base:"tr"
        },

        _default:{
            level:0,
            prefix:"",
            postfix:""
        }
    };

    wrapMap.optgroup = wrapMap.option;

    wrapMap.thead = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.tbody;
    wrapMap.th = wrapMap.td;

    /**
     * Creates HTML chunk from string.
     * @return  {DocumentFragment}
     * @param   {*}                     html        html chunk to parse and create
     * @param   {Document=document}     doc         relative document
     * @param   {Object=}               iWrapMap    wrapMap to use in element creation
     */
    let createFromString = (html,doc,iWrapMap)=>{
        iWrapMap = iWrapMap || wrapMap;
        doc = doc || window.document;
        if(typeof(html) !== "string") html = ""+html;
        let frag = doc.createDocumentFragment();
        let tmp = frag.appendChild(doc.createElement("div")),
            tag,wrap,nodes,base,prefix="",postfix="",level=0;

        // Deserialize a standard representation
        tag = ( tagName.exec( html ) || [ "", "" ] )[ 1 ].toLowerCase();

        let NS=(tagNameSpace.exec(tag)||["",""])[1],NSWrap=iWrapMap[ NS +":"];
        wrap = iWrapMap[ tag ];

        if(NSWrap && NSWrap.remove) html = html.replace(new RegExp((NS+":").escapeRegExp(),"gi"),"");
        if(NSWrap && NSWrap.wrapMap) return createFromString(html,doc,NSWrap.wrapMap);

        if(wrap){
            base = wrap;
            prefix = wrap.prefix;
            postfix = wrap.postfix;
            level = wrap.level;
            while(base.base && (base = iWrapMap[base.base])){
                prefix = base.prefix + prefix;
                postfix = postfix + base.postfix;
                level += base.level;
            }
        }

        prefix = iWrapMap._default.prefix + prefix;
        postfix = postfix + iWrapMap._default.postfix;
        level += iWrapMap._default.level;
        tmp.innerHTML = prefix + html.replace( xhtmlTagCloser, "<$1></$2>" ) + postfix;

        // Descend through wrappers to the right content
        let j = level;
        while ( j-- ) {
            tmp = tmp.lastChild;
        }
        nodes = Array.prototype.slice.call(tmp.childNodes);

        frag.textContent="";
        for(let j = 0; j < nodes.length; ++j) frag.appendChild(nodes[j]);

        return frag;
    };

    /**
     * Renders chunk of HTML and wraps it into DocumentFragment to be inserted wherever we want.
     * @return  {DocumentFragment}
     * @param   {*}                     html        html chunk to parse and create
     * @param   {Document=document}     doc         relative document
     * @param   {Number=3}              depth       recursion depth
     * @param   {Object=}               iWrapMap    wrapMap to use in element creation
     */
    return (html,doc,depth,iWrapMap)=>{
        if(depth === undefined) depth = 3;
        doc = doc || window.document;
        let ret = doc.createDocumentFragment();

        if(html instanceof DocumentFragment){
            return html;
        }else if(html instanceof Node){
            ret.appendChild(html);
        }else if(depth>0 && (html instanceof NodeList
            || html instanceof Array)){
            for(let i=0;i<html.length;++i){
                ret.appendChild(createFragment(html[i],doc,depth-1));
            }
        }else{
            ret.appendChild(createFromString(html,doc,iWrapMap));
        }

        if(ret.hasChildNodes())
            return ret;

        return null;
    };
})();
let $=(s,e=document)=>e.querySelector(s);
let $A=(s,e=document)=>e.querySelectorAll(s);
(()=>{
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
})();// scope polyfill
function splitOnce(str, splitter) {
    let ind = str.indexOf(splitter);
    if(ind < 0) return [str];

    let start = str.substring(0, ind);
    let rest = str.substring(ind + splitter.length);

    return [start, rest];
}
function parseQuery(query, tuples = false) {
    if(query[0] === '?') query = query.substring(1);

    let args = query.split('&');

    let ret = tuples ? [] : {};

    function add(key, value) {
        if(tuples){
            ret.push([key, value]);
        }else{
            ret[key] = value;
        }
    }

    for (let i=0; i < args.length; i++) {
        let arg = args[i];

        if (-1 === arg.indexOf('=')) {
            add(decodeURIComponent(arg).trim(), true);
        }
        else {
            let kvp = splitOnce(arg, '=');

            add(decodeURIComponent(kvp[0]).trim(), decodeURIComponent(kvp[1]).trim());
        }
    }

    return ret;
}

let fetch_image=function(resource, init, trials=5, delay=50){
    if(typeof trials === "number"){
        let max = trials, iteration = 0;
        trials = () => ++iteration <= max;
    }
    return new Promise((resolve, reject)=>{
        let fetcher = ()=>{
            fetch(resource, init).then(resp => resp.blob()).then(resolve).catch(reason => {
                if (trials(reason)) setTimeout(fetcher, delay);
                else reject(reason);
            });
        };
        fetcher();
    });
};

let get_lang = (langs=["en", "ru"])=>{
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
};
/**
 * @return {string}
 */
let L=G.L=function(choice, lang=document.body.lang){
    if(typeof choice === "string")
        return choice;
    if(choice[lang])
        return choice[lang];
    return choice[Object.keys(choice)[0]];
};
let is_touch = false;
window.addEventListener('touchstart', ()=>{
    is_touch = true;
    $('html').classList.add('touch-interface');
}, {once:true, capture:true});
let scrollbar_size = -1;
let getScrollbarSize = () =>{
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
};
document.body.style.cssText += '--scrollbar-size:' + getScrollbarSize() + "px;";

let sbv_remover = /(--scrollbar-ratio:[0-9.]+;|--scrollbar-top:[0-9.]+;)/g;
let scrollbar_recalc = (outer, inner) =>{
    let sh = inner.scrollHeight, oh = inner.offsetHeight;
    let ratio = sh > 0 ? oh / sh : 1, top = sh > 0 ? inner.scrollTop / sh : 0;

    if(ratio >= 1){
        outer.classList.add('no-scroll');
    }else{
        outer.classList.remove('no-scroll');
        let css = outer.style.cssText.replace(sbv_remover, "");
        outer.style.cssText = css + `--scrollbar-ratio:${ratio};--scrollbar-top:${top};`;
    }
};
let init_scroll = (el)=>{
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
};
let init_scrolls = ()=>{
    for(let i of $A('.scroll-outer')) init_scroll(i);
};

{

G.contact_services = {
    "skype:": "&#xf30b;",
    "mailto:": "&#xe800;",
    "https://fb.me/": "&#xf301;",
    "https://vk.me/": "&#xe802;",
    "tel:": "&#xe801;"
};
let current_page;
let push_current_state = function(){
    let [title, url] = current_page();
    history.pushState(null, title, url);
    document.title = title;
};
let replace_current_state = function(){
    let [title, url] = current_page();
    history.replaceState(null, title, url);
    document.title = title;
};
let open_galleries=()=>{
    document.body.classList.add('galleries');
    document.body.classList.remove('gallery');
    for(let i of $A('section .gallery.open')) i.classList.remove('open');

    push_current_state();
};
let switch_lang=()=>{
    let l = document.body.lang === 'ru' ? "en" : 'ru';
    localStorage.setItem('preferred_language', l);
    document.body.lang = l;

    replace_current_state();
};
for(let i of $A('.lang-change')) i.addEventListener('click', switch_lang);
// $('.to-main').addEventListener('click', open_main);
// $('.to-galleries').addEventListener('click', open_galleries);
let current_gallery_index = function(){
    let i = $(`section .gallery.open`).dataset.gallery;

    if(i < 0) i = 0;
    else if(i >= G.database.galleries.length) i = G.database.galleries.length - 1;

    return i;
};
current_page = function(){
    let location_prefix = `${location.origin}${location.pathname}`;
    if(document.body.classList.contains('galleries')){
        return [L(G.database.title), `${location_prefix}`];
    }else if($('.image-viewer').classList.contains('open')){
        let iv = $('.image-viewer');
        let i = current_gallery_index();
        let img_id = iv.dataset.image_id;
        let j = parseInt(iv.dataset.image_num);
        let I = G.database.galleries[i];

        return [`#${j} — ` + L(I.title) + " — " + L(G.database.title),
            `${location.origin}${location.pathname}?photo=${encodeURIComponent(img_id)}`];
    }else{
        let i = current_gallery_index();
        let I = G.database.galleries[i];
        let gallery_id = L(I.title, 'en');

        return [L(I.title) + " — " + L(G.database.title),
            `${location.origin}${location.pathname}?gallery=${encodeURIComponent(gallery_id)}`];
    }
};

let open_gallery = (ev)=>{
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
    document.body.classList.add('gallery');
    $(".galleries-list-outer .scroll-inner").scrollTop = 0;
    for (let j of $A('section .gallery.open')) j.classList.remove('open');
    for (let j of $A(`section .gallery[data-gallery="${i}"]`)) j.classList.add('open');

    push_current_state();
};

let open_image_no = (i, j) =>{
    if(i < 0) i = 0;
    else if(i >= G.database.galleries.length) i = G.database.galleries.length - 1;
    if(!$(`section .gallery[data-gallery="${i}"]`).classList.contains('open')){
        open_gallery(i);
    }

    let I = G.database.galleries[i];

    if(j < 0) j = I.contents.length - 1;
    else if(j >= I.contents.length) j = 0;

    let image_id = I.contents[j];

    let iv = $('.image-viewer');
    iv.dataset.image_num = j;
    iv.dataset.image_id = image_id;
    $('.image-container img', iv).src = `/photogallery/images/sources/${I.contents[j]}`;

    if(!iv.classList.contains('open')) {
        iv.classList.add('open');
        push_current_state();
    }else{
        replace_current_state();
    }
};
let open_image = (ev)=>{
    console.log("open image", ev);
    let i = parseInt(ev.target.dataset.gallery);
    let j = parseInt(ev.target.dataset.image);

    open_image_no(i, j);
};
let open_next_image = ()=>{
    let iv = $('.image-viewer');
    open_image_no(current_gallery_index(), parseInt(iv.dataset.image_num) + 1);
};
let open_prev_image = ()=>{
    let iv = $('.image-viewer');
    open_image_no(current_gallery_index(), parseInt(iv.dataset.image_num) - 1);
};
let slideshow_timer = false;
let toggle_slideshow = ()=>{
    if(!slideshow_timer){
        slideshow_timer = setInterval(open_next_image, 3000);
        $(".image-viewer").classList.add('slideshow');
    }else{
        clearInterval(slideshow_timer);
        slideshow_timer = false;
        $(".image-viewer").classList.remove('slideshow');
    }
};
let viewer_close = ()=>{
    $('.image-viewer').classList.remove('open');
    if(document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement){
        G.switch_fullscreen();
    }
    if(slideshow_timer){
        toggle_slideshow();
    }
    push_current_state();
};
$('.image-viewer .image-container .slideshow').addEventListener('click', toggle_slideshow);
$('.image-viewer .image-container .prev').addEventListener('click', open_prev_image);
$('.image-viewer .image-container .next').addEventListener('click', open_next_image);
$('.image-viewer .image-container .exit').addEventListener('click', viewer_close);
$('.image-viewer .background-overlay').addEventListener('click', viewer_close);
$('.image-viewer .image-container .fs-toggle').addEventListener('click', ()=>G.switch_fullscreen());


let find_photo=function(photo_id){
    for(let i=0, L=G.database.galleries.length;i < L; ++i){
        let I = G.database.galleries[i];
        for(let j=0, L = I.contents.length; j < L; ++j){
            let J = I.contents[j];
            if(J === photo_id){
                return [i, j];
            }
        }
    }
    return [false, false];
};
let find_gallery=function(gal_name){
    for(let i=0, L=G.database.galleries.length;i < L; ++i){
        let I = G.database.galleries[i];
        for(let t in I.title){
            if(I.title[t] === gal_name) return i;
        }
    }
    return false;
};
let parse_location = function(location){
    let q = parseQuery(location);
    console.log(q);
    if(q.photo){
        let [i,j] = find_photo(q.photo);
        if(j !== false){
            open_image_no(i,j);
        }
    }else if(q.gallery){
        if($('.image-viewer').classList.contains('open')) viewer_close();
        let i = find_gallery(q.gallery);
        if(i !== false) open_gallery(i);
    }else{
        if(!document.body.classList.contains('galleries')){
            if($('.image-viewer').classList.contains('open')) viewer_close();
            open_galleries();
        }
    }
};
let popStateListener=function(ev){
    parse_location(location.search);
};
window.addEventListener('popstate', popStateListener);

let fullscreen_change = G.fullscreen_change = ()=>{
    if(document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement)
        $('.image-viewer .ui-overlay .fs-toggle').innerText = "";
    else
        $('.image-viewer .ui-overlay .fs-toggle').innerText = "";
};

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
    }else if($("body.gallery")){
        if ((ev.key === "Escape") || (ev.key === "ArrowLeft")) {
            open_galleries();
        }
    }
};
window.addEventListener('keydown', G.key_parser);

fetch("gallery.json").then(resp=>resp.json()).then(db=>{
    G.database = db;

    document.title = L(db.title);
    document.body.classList.add('galleries');
    if(get_lang() !== document.body.lang) switch_lang();

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
    parse_location(start_location_search);
}).catch(console.error);

init_scrolls();

}


/**
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *                                    Admin section                                    *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 */

{
    if(!window.admin) window.admin = {};
    let A = window.admin;

    A.open_login = ()=>{
        if(!A.is_admin)
            $('body').classList.add('login');
    };
    A.close_login = ()=>{
        $('body').classList.remove('login');
    };
    A.logout = ()=>{
        $('body').classList.remove('admin-mode');
        A.is_admin = false;
    };
    A.send_login = ()=>{
        fetch("main.php?is_admin=1").then(r => r.json()).then(resp => {
            if (resp.admin) {
                A.init_admin(resp);
            }
        });
        A.close_login();
    };
    A.init_admin = (options)=>{
        if(A.is_admin) return;

        console.log("Yeah, you can call it manually, but you won't be able to save things on a server.");
        A.is_admin = true;
        $('body').classList.add('admin-mode');
    };

    for(let i of $A('.open-cp')) i.addEventListener('click', A.open_login);
    $('.login-popup .background-overlay').addEventListener('click', A.close_login);
    $('.login-popup .login-form').addEventListener('click', A.send_login);
}