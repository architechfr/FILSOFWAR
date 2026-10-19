// FILS OF WAR sur telephone (18/10). Ce que la feuille club.css ne sait pas
// faire seule : savoir si l'ecran est tactile (le zoom se pince, les boutons
// + et - partent), si le plein ecran existe (pas sur iPhone dans un cadre :
// le bouton partait dans le vide), et replier la fiche d'objectif au debut
// d'une partie quand l'ecran est bas -- elle se rouvre d'un toucher.
(function(){
  const html=document.documentElement;
  if(matchMedia('(pointer:coarse)').matches||'ontouchstart' in window)html.classList.add('tactile');
  if(!(document.fullscreenEnabled||document.webkitFullscreenEnabled))html.classList.add('sans-plein-ecran');
  const bas=matchMedia('(orientation:landscape) and (max-height:500px)');
  let mode=null;
  setInterval(()=>{
    const m=window.__FOW__?.mode;if(m===mode)return;mode=m;
    if(m!=='playing'||!bas.matches)return;
    const corps=document.getElementById('objective-body');
    if(corps&&!corps.hidden)document.getElementById('objective-toggle')?.click();
  },300);
})();

// 18/10, Florian : « je n'arrive pas à basculer en paysage au démarrage ».
// Dans un onglet, Android ne tourne l'écran sur ordre qu'en plein écran, et
// seulement dans un geste : l'app avait beau demander le paysage en ouvrant
// le jeu, rien ne bougeait. Ici, comme au Circuit : au premier toucher du
// menu (et au bouton de l'écran « Tourne ton téléphone »), plein écran puis
// verrou paysage. Le bouton Plein écran du jeu verrouille aussi le paysage.
// iPhone refuse le verrou : le bouton le dit, il faut coucher le téléphone.
(function(){
  var html=document.documentElement;
  if(!html.classList.contains('tactile'))return;
  var hint=document.getElementById('portrait-hint');
  var ignorer=document.getElementById('ignore-portrait');
  var portrait=window.matchMedia?matchMedia('(orientation:portrait)'):null;
  var TEXTE='⟳ Passer en paysage';
  var bouton=null;
  if(hint&&ignorer){
    bouton=document.createElement('button');
    bouton.id='force-paysage';bouton.type='button';bouton.textContent=TEXTE;
    bouton.className='fow-paysage';
    hint.insertBefore(bouton,ignorer);
  }
  var refusMinuteur=0;
  function refuse(){
    if(!bouton)return;
    bouton.textContent='Couche le téléphone à la main';
    clearTimeout(refusMinuteur);
    refusMinuteur=setTimeout(function(){bouton.textContent=TEXTE;},3500);
  }
  function verrou(signaler){
    try{
      if(screen.orientation&&screen.orientation.lock){
        var p=screen.orientation.lock('landscape');
        if(p&&p.then)p.then(function(){},function(){if(signaler)refuse();});
        return;
      }
    }catch(e){}
    if(signaler)refuse();
  }
  function paysage(signaler){
    var el=html,f=el.requestFullscreen||el.webkitRequestFullscreen;
    if(document.fullscreenElement||document.webkitFullscreenElement||!f){verrou(signaler);return;}
    try{
      var q=f.call(el,{navigationUI:'hide'});
      if(q&&q.then)q.then(function(){verrou(signaler);},function(){verrou(signaler);});
      else verrou(signaler);
    }catch(e){verrou(signaler);}
  }
  if(bouton)bouton.addEventListener('click',function(ev){ev.stopPropagation();paysage(true);});
  // Le premier toucher, sauf « Continuer dans ce format » : celui-là veut garder le portrait.
  function premierToucher(ev){
    if(ev.target===ignorer||ev.target===bouton)return;
    document.removeEventListener('pointerdown',premierToucher,true);
    if(portrait&&portrait.matches)paysage(false);
  }
  if(ignorer)ignorer.addEventListener('click',function(){document.removeEventListener('pointerdown',premierToucher,true);});
  document.addEventListener('pointerdown',premierToucher,true);
  // Le bouton Plein écran du jeu : entrer en plein écran couche aussi l'écran.
  document.addEventListener('fullscreenchange',function(){if(document.fullscreenElement)verrou(false);});
})();
