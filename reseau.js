// FILS OF WAR · le reseau (18/10). Florian : « nouveauté en bêta test à
// proposer en mode réseau et solo, module à part mais à la table ».
//
// Le jeu de Florian se joue seul contre l'IA des Barons. En reseau, chaque
// telephone fait tourner LA MEME partie : meme graine, meme pas de 0,05 s, et
// les deux joueurs s'echangent seulement leurs ordres (marcher, recolter,
// batir, recruter...). Un ordre donne au tour k s'execute au tour k+2 sur les
// deux telephones a la fois (un tour = 5 pas = 0,25 s) : on ne peut pas jouer
// le tour k sans les ordres de l'autre pour ce tour, alors on l'attend.
// Toutes les 10 s, chacun envoie une empreinte de sa partie : si elles
// different, les deux royaumes ont diverge et on le dit (bêta).
//
// Transport : le client Supabase de l'app (window.top.sb), canal `fow-salon`
// sans presence -- le salon et les parties y passent, filtres par numero de
// partie. Hors app (banc a deux onglets) : un BroadcastChannel, avec latence
// et pertes simulables (?latence=250&perte=0.1).
//
// Ce qu'il y a dans jeu.js pour nous : FOW_NOUVELLE demande config() puis
// appelle brancher(game) ; la boucle appelle avancer(game, dt) tant que
// `actif` (claude/fow/extraire-fow.py).
(function(){
  const P=new URLSearchParams(location.search);
  const MODE=P.get('mode')==='reseau'?'reseau':'solo';
  const html=document.documentElement;
  if(P.get('club')==='1')html.classList.add('club');
  if(MODE==='reseau')html.classList.add('reseau');
  const MOI={id:String(P.get('uid')||'invite').slice(0,64)+':'+Math.random().toString(36).slice(2,8),
             nom:String(P.get('nom')||'Invité').slice(0,24)};
  const TICK=0.05,TOUR=5,DELAI=2,CONTROLE=40,SILENCE=15000;
  const METHODES=['order','train','placeBuilding','foundSettlement','upgradeSettlement','advanceAge','research','trade','rallyVillage','hater','fowLabo'];
  const $=id=>document.getElementById(id);
  const fow=()=>window.__FOW__||null;
  const toast=(t,k,d)=>{try{fow()?.toast(t,k||'notice',d||4500);}catch{}};
  function salle(type,data){try{if(parent!==window)parent.postMessage({channel:'sft-fow',type,...data},location.origin);}catch{}}

  /* ---- le canal --------------------------------------------------------- */
  let canal=null;
  function ouvrirCanal(recevoir){
    let client=null;
    // L'app la plus proche au-dessus de nous (dans le Club : jeu -> salle -> app).
    let t=null;
    if(P.get('canal')!=='local'){try{for(let w=window;w!==w.parent;){w=w.parent;if(w.sb&&typeof w.sb.channel==='function'){t=w;client=w.sb;break;}}}catch{}}
    if(client){
      let etat='',ch=null,ferme=false;
      // supabase-js rend le canal deja ouvert sur ce sujet : celui d'une page precedente
      // (cadre ferme sans pagehide) doit d'abord partir, sinon on herite de ses ecouteurs.
      (async()=>{
        try{for(const c of client.getChannels())if(c.topic==='realtime:fow-salon')await client.removeChannel(c);}catch{}
        if(ferme)return;
        ch=client.channel('fow-salon',{config:{broadcast:{self:false}}});
        ch.on('broadcast',{event:'m'},msg=>{try{recevoir(msg&&msg.payload);}catch(e){console.error(e);}});
        ch.subscribe(st=>{etat=st;if(st==='SUBSCRIBED')surPret();majEtat();rendreSalon();});
        t.__fowCanal=ch;
      })();
      return {nom:'supabase',get pret(){return etat==='SUBSCRIBED';},
        envoyer(p){if(!ch||etat!=='SUBSCRIBED')return false;try{ch.send({type:'broadcast',event:'m',payload:p});}catch{return false;}return true;},
        fermer(){ferme=true;if(!ch)return;try{client.removeChannel(ch);}catch{}if(t.__fowCanal===ch)t.__fowCanal=null;}};
    }
    // Hors app : un onglet parle aux autres onglets du meme navigateur.
    const bc=new BroadcastChannel('fow-salon'),lat=Number(P.get('latence'))||0,perte=Number(P.get('perte'))||0;
    bc.onmessage=e=>recevoir(e.data);
    setTimeout(surPret,50);
    return {nom:'local',pret:true,
      envoyer(p){if(perte&&Math.random()<perte)return true;const go=()=>{try{bc.postMessage(p);}catch{}};lat?setTimeout(go,lat*(0.6+Math.random()*0.8)):go();return true;},
      fermer(){bc.close();}};
  }
  const envoyer=p=>canal?canal.envoyer({v:1,...p}):false;

  /* ---- le salon --------------------------------------------------------- */
  const salons=new Map();          // id -> {id, hote:{id,nom}, region, vu}
  let monSalon=null,annonceT=null,demande=null,partie=null,lock=null,configEnAttente=null,actif=false;

  function surPret(){envoyer({t:'qui'});rendreSalon();}
  function recevoir(m){
    if(!m||m.v!==1||typeof m.t!=='string')return;
    if(m.t==='qui'){if(monSalon)annoncer();return;}
    if(m.t==='salon'){
      if(!m.hote||m.hote.id===MOI.id)return;
      salons.set(m.s,{id:m.s,hote:{id:String(m.hote.id),nom:String(m.hote.nom||'?').slice(0,24)},region:m.region|0,vu:Date.now()});
      rendreSalon();return;
    }
    if(m.t==='ferme'){salons.delete(m.s);rendreSalon();return;}
    if(m.t==='rejoindre'&&m.de&&m.de.id&&partie&&m.s===partie.id){   // il n'a pas recu le « go » : on le redit
      if(partie.go&&m.de.id===partie.go.invite)envoyer(partie.go);else envoyer({t:'refus',s:m.s,a:m.de.id});
      return;
    }
    if(m.t==='rejoindre'&&monSalon&&m.s===monSalon.id&&m.de&&m.de.id){
      const seed=(Math.random()*2147483646|0)+1,region=monSalon.region;
      const noms=[MOI.nom,String(m.de.nom||'?').slice(0,24)],ids=[MOI.id,String(m.de.id)];
      const go={t:'go',s:monSalon.id,invite:m.de.id,seed,region,noms,ids};
      envoyer(go);setTimeout(()=>envoyer(go),400);setTimeout(()=>envoyer(go),1200);   // le « go » ne doit pas se perdre
      fermerMonSalon(false);
      demarrer({id:go.s,siege:0,seed,region,noms,ids,go});return;
    }
    if(m.t==='go'&&demande&&m.s===demande.s){
      if(m.invite!==MOI.id){demande=null;salons.delete(m.s);etatTexte(`${m.noms?.[1]||'Quelqu’un'} a été plus rapide : la partie est prise.`);rendreSalon();return;}
      demande=null;
      demarrer({id:m.s,siege:1,seed:m.seed|0,region:m.region|0,noms:m.noms,ids:m.ids});return;
    }
    if(m.t==='refus'&&demande&&m.s===demande.s&&m.a===MOI.id){demande=null;salons.delete(m.s);etatTexte('Trop tard : la partie est prise.');rendreSalon();return;}
    if(!partie||m.s!==partie.id)return;
    if(m.t==='tours'&&lock&&m.de===1-lock.siege)recevoirTours(m);
    else if(m.t==='quitte'&&m.de===1-partie.siege)adversaireParti(m.motif);
  }
  function annoncer(){if(monSalon)envoyer({t:'salon',s:monSalon.id,hote:{id:MOI.id,nom:MOI.nom},region:monSalon.region});}
  function ouvrirMonSalon(){
    if(monSalon||partie)return;
    const region=Number($('start-region')?.value);
    monSalon={id:'w'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),region:Number.isFinite(region)?region:18};
    annoncer();annonceT=setInterval(annoncer,2000);
    salle('annonce',{s:monSalon.id});
    rendreSalon();
  }
  function fermerMonSalon(dire=true){
    if(!monSalon)return;
    clearInterval(annonceT);annonceT=null;
    if(dire)envoyer({t:'ferme',s:monSalon.id});
    monSalon=null;rendreSalon();
  }
  function rejoindre(s){
    if(partie||monSalon)return;
    demande={s:s.id,t:Date.now()};
    // Trois fois : un message peut se perdre, l'hote ne lance qu'une partie.
    for(const d of [0,900,2500])setTimeout(()=>{if(demande&&demande.s===s.id)envoyer({t:'rejoindre',s:s.id,de:{id:MOI.id,nom:MOI.nom}});},d);
    etatTexte(`On frappe chez ${s.hote.nom}…`);
    setTimeout(()=>{if(demande&&demande.s===s.id){demande=null;etatTexte(`${s.hote.nom} ne répond pas. Sa partie est peut-être fermée.`);salons.delete(s.id);rendreSalon();}},7000);
    rendreSalon();
  }

  /* ---- la partie, au pas commun ----------------------------------------- */
  function demarrer(p){
    partie={...p,adv:p.noms?.[1-p.siege]||'ton adversaire',fini:false};
    configEnAttente={siege:p.siege,options:{difficulty:'normal',seed:p.seed,startRegion:p.region}};
    const f=fow();
    if(!f){etatTexte('Le jeu n’est pas encore chargé.');return;}
    f.startGame();
    configEnAttente=null;
    textesReseau();
    toast(`⚔️ Partie lancée contre ${partie.adv}. Il est à l’autre bout de Campawood : fonde vite ton campement.`,'notice',8000);
    salle('debut',{adv:partie.adv});
    rendreSalon();
  }
  const config=()=>configEnAttente;
  function brancher(game){
    game.noAI=true;
    (partie.noms||[]).forEach((n,i)=>{if(game.players[i]&&n)game.players[i].name=n;});
    lock={siege:partie.siege,game,tick:0,acc:0,tours:new Map(),miens:new Map(),attente:[],
          empreintes:new Map(),siennes:new Map(),hEnvoi:null,fait:-1,recu:Date.now(),bloque:0,renvoi:0,desync:false};
    for(let n=0;n<DELAI;n++)lock.tours.set(n,[[],[]]);
    for(const m of METHODES){
      const orig=game[m].bind(game);
      game['_net_'+m]=orig;
      game[m]=function(...args){
        if(!lock||lock.game!==game||game.result)return {ok:false,reason:'La partie est terminée.'};
        const pre=avantVerif(game,m,args);if(pre&&!pre.ok)return pre;
        lock.attente.push([m,JSON.parse(JSON.stringify(args))]);
        return {ok:true,count:Array.isArray(args[0])?args[0].length:1};
      };
    }
    actif=true;
  }
  // Ce qu'on peut refuser tout de suite, sans attendre le tour (meme reponse qu'en solo).
  function avantVerif(game,m,args){
    try{
      if(m==='placeBuilding')return game.canPlace(args[0],args[1],args[2],args[3]);
      if(m==='foundSettlement')return game.canPlace(args[0],'townhall',args[1],args[2]);
      if(m==='upgradeSettlement')return game.canUpgradeSettlement(args[0]);
      if(m==='advanceAge')return game.canAdvanceAge(args[0]);
    }catch{}
    return null;
  }
  function appliquer(game,cmds,siege){
    const pause=game.paused;game.paused=false;   // la pause d'un ecran ne doit rien changer a la partie
    try{
      for(const [m,args] of cmds||[]){
        if(!METHODES.includes(m)||!Array.isArray(args))continue;
        let r;try{r=game['_net_'+m](...args);}catch(e){r={ok:false,reason:String(e&&e.message||e)};}
        if(siege===lock.siege&&r&&r.ok===false&&r.reason)toast(r.reason,'error');
      }
    }finally{game.paused=pause;}
  }
  function empreinte(g){
    const q=v=>Math.round((+v||0)*64)|0;let h=(g.units.length*7919+g.buildings.length)|0;
    const mix=v=>{h=(Math.imul(h,31)+q(v))|0;};
    for(const u of g.units){mix(u.x);mix(u.z);mix(u.hp);}
    for(const b of g.buildings){mix(b.hp);mix(b.progress);}
    for(const p of g.players)for(const k of Object.keys(p.resources))mix(p.resources[k]);
    return h>>>0;
  }
  function envoyerTour(n){
    const cmds=lock.attente.splice(0);
    lock.miens.set(n,cmds);
    const t=lock.tours.get(n)||[null,null];t[lock.siege]=cmds;lock.tours.set(n,t);
    for(const k of lock.miens.keys())if(k<n-12)lock.miens.delete(k);
    pousserTours(n,3);
  }
  function pousserTours(n,combien){
    const l=[];for(let k=n;k>n-combien;k--)if(lock.miens.has(k))l.push([k,lock.miens.get(k)]);
    const msg={t:'tours',s:partie.id,de:lock.siege,l};
    if(lock.hEnvoi)msg.h=lock.hEnvoi;
    envoyer(msg);
  }
  function recevoirTours(m){
    lock.recu=Date.now();bandeau(null);
    const autre=1-lock.siege;
    for(const [n,cmds] of Array.isArray(m.l)?m.l:[]){
      if(!(n>lock.fait)||!Array.isArray(cmds))continue;
      const t=lock.tours.get(n)||[null,null];
      if(!t[autre]){t[autre]=cmds;lock.tours.set(n,t);}
    }
    if(Array.isArray(m.h)){lock.siennes.set(m.h[0],m.h[1]>>>0);comparer(m.h[0]);}
  }
  function comparer(k){
    const a=lock.empreintes.get(k),b=lock.siennes.get(k);
    if(a===undefined||b===undefined)return;
    lock.empreintes.delete(k);lock.siennes.delete(k);
    if(a!==b&&!lock.desync){
      lock.desync=true;
      console.warn('FILS OF WAR : désynchronisé au tour',k,a,b);
      bandeau(`⚠️ Vos deux royaumes ne sont plus d’accord depuis ${Math.round(k*TOUR*TICK)} s de jeu. C’est la bêta : dis-le à Florian, et finissez pour rire.`,true);
      salle('desync',{tour:k,adv:partie.adv});
    }
  }
  function avancer(game,dt){
    if(!lock||lock.game!==game||game.result){if(game.result)fin(game);return;}
    lock.acc=Math.min(lock.acc+dt,0.6);
    const max=lock.acc>0.3?10:4;let pas=0;
    while(lock.acc>=TICK-1e-9&&pas<max&&!game.result){
      if(lock.tick%TOUR===0){
        const k=lock.tick/TOUR;
        if(!lock.miens.has(k+DELAI))envoyerTour(k+DELAI);
        const t=lock.tours.get(k);
        if(!t||!t[0]||!t[1]){attendre();break;}
        appliquer(game,t[0],0);appliquer(game,t[1],1);
        lock.tours.delete(k);lock.fait=k;lock.bloque=0;
        if(k>0&&k%CONTROLE===0){const h=empreinte(game);lock.empreintes.set(k,h);lock.hEnvoi=[k,h];comparer(k);}
      }
      game._tick(TICK);lock.tick++;lock.acc-=TICK;pas++;
    }
    if(game.result)fin(game);
  }
  function attendre(){
    const t=Date.now();
    if(!lock.bloque)lock.bloque=t;
    lock.acc=Math.min(lock.acc,TICK);
    if(t-lock.bloque>700&&t-lock.renvoi>700){lock.renvoi=t;pousserTours(Math.floor(lock.tick/TOUR)+DELAI,5);}
    if(t-lock.recu>SILENCE)bandeau(`${partie.adv} ne répond plus depuis ${Math.round((t-lock.recu)/1000)} s. Réseau coupé ? La partie reprendra s’il revient.`,false,true);
    else if(t-lock.bloque>1500)bandeau(`On attend ${partie.adv}…`);
  }
  function fin(game){
    if(!partie||partie.fini)return;
    partie.fini=true;
    const gagne=game.result&&game.result.winner===partie.siege;
    salle('fin',{reseau:true,gagne,adv:partie.adv,motif:game.result?.reason||'',temps:Math.round(game.time)});
    bandeau(null);
  }
  function adversaireParti(motif){
    const g=lock?.game;if(!g||g.result)return;
    g.result={winner:partie.siege,reason:motif==='abandon'?`${partie.adv} a abandonné.`:`${partie.adv} a quitté la partie.`};
    toast(`🏳️ ${partie.adv} a quitté le champ de bataille.`,'notice',6000);
  }
  function abandonner(){
    if(!partie||partie.fini)return;
    for(const d of [0,300,900])setTimeout(()=>partie&&envoyer({t:'quitte',s:partie.id,de:partie.siege,motif:'abandon'}),d);
    const g=lock?.game;
    if(g&&!g.result)g.result={winner:1-partie.siege,reason:'Tu as abandonné.'};
    try{$('pause-dialog')?.open&&$('pause-dialog').close();}catch{}
  }
  function retourSalon(){
    if(partie&&!partie.fini)abandonner();
    partie=null;lock=null;actif=false;bandeau(null);
    try{document.querySelectorAll('dialog[open]').forEach(d=>d.close());}catch{}
    fow()?.toMenu();
    textesReseau(false);rendreSalon();
  }

  /* ---- l'ecran ---------------------------------------------------------- */
  let etatMsg='';
  function etatTexte(t){etatMsg=t;majEtat();}
  function majEtat(){
    const e=$('fn-etat');if(!e)return;
    e.textContent=etatMsg||(canal&&canal.pret?(canal.nom==='local'?'Salon local (essai hors application).':'Connecté au salon des Sales Fils.'):'Connexion au salon…');
  }
  function rendreSalon(){
    const boite=$('fow-net');if(!boite)return;
    const t=Date.now();for(const [id,s] of salons)if(t-s.vu>6500)salons.delete(id);
    const liste=$('fn-liste');liste.textContent='';
    if(monSalon){
      const p=document.createElement('p');p.className='fn-attente';p.textContent='Ta partie est ouverte. Le premier Sale Fils qui la rejoint lance la bataille.';liste.append(p);
    }else for(const s of salons.values()){
      const b=document.createElement('button');b.type='button';b.className='fn-salon';b.disabled=!!demande||!!partie;
      b.innerHTML='<b></b><small>attend un adversaire · rejoindre</small><span class="arrow">→</span>';b.querySelector('b').textContent=`⚔️ ${s.hote.nom}`;
      b.onclick=()=>rejoindre(s);liste.append(b);
    }
    if(!monSalon&&!salons.size){const p=document.createElement('p');p.className='fn-vide';p.textContent='Aucune partie ouverte pour l’instant. Ouvre la tienne : la salle du Club sera prévenue.';liste.append(p);}
    $('fn-ouvrir').hidden=!!monSalon;$('fn-ouvrir').disabled=!!demande||!!partie||!(canal&&canal.pret);
    $('fn-fermer').hidden=!monSalon;
    majEtat();
  }
  function construireSalon(){
    const menu=document.querySelector('.menu-content');if(!menu)return;
    const d=document.createElement('div');d.id='fow-net';
    d.innerHTML=`<div class="fn-titre"><span>⚔️ EN RÉSEAU</span><i>BÊTA</i></div>
      <p id="fn-etat" class="fn-etat"></p>
      <div id="fn-liste" class="fn-liste"></div>
      <button id="fn-ouvrir" class="primary start-button" type="button"><span>OUVRIR UNE PARTIE</span><span class="arrow">→</span></button>
      <button id="fn-fermer" class="fn-fermer" type="button" hidden>Fermer ma partie</button>
      <p class="fn-note">Chacun sur son téléphone, l’un contre l’autre, sans IA. Rase le campement de l’autre, ou son colon avant qu’il ne s’installe. Bêta : pas de Filsous en jeu.</p>`;
    const avant=menu.querySelector('.start-region-label');
    menu.insertBefore(d,avant?avant.nextSibling:null);
    $('fn-ouvrir').onclick=ouvrirMonSalon;
    $('fn-fermer').onclick=()=>fermerMonSalon();
    setInterval(()=>{if(!partie)rendreSalon();},2000);
  }
  function textesReseau(enPartie=true){
    const p=document.querySelector('#pause-dialog p'),r=$('resume'),b=$('back-menu');
    if(p)p.textContent=enPartie?`La partie continue : ${partie?.adv||'ton adversaire'} ne t’attend pas.`:'La partie est en pause.';
    if(r)r.firstChild&&(r.firstChild.textContent=enPartie?'RETOUR AU COMBAT ':'REPRENDRE LA PARTIE ');
    if(b)b.textContent=enPartie?'Abandonner la partie':'Retour à l’accueil';
  }
  let bandeauEl=null;
  function bandeau(texte,grave=false,bouton=false){
    if(!texte){if(bandeauEl&&!bandeauEl.dataset.grave)bandeauEl.hidden=true;return;}
    if(!bandeauEl){bandeauEl=document.createElement('div');bandeauEl.id='fn-bandeau';document.body.append(bandeauEl);}
    if(bandeauEl.dataset.grave&&!grave)return;
    if(grave)bandeauEl.dataset.grave='1';
    bandeauEl.hidden=false;bandeauEl.textContent=texte;
    if(bouton){const q=document.createElement('button');q.type='button';q.textContent='Quitter';q.onclick=retourSalon;bandeauEl.append(' ',q);}
    if(grave){const x=document.createElement('button');x.type='button';x.textContent='×';x.onclick=()=>{bandeauEl.hidden=true;};bandeauEl.append(' ',x);}
  }
  // Le verdict dit qui, plutot que « le camp rival ».
  function surResultat(){
    const d=$('result-dialog');if(!d||!d.open||!partie)return;
    const g=lock?.game,gagne=g?.result?.winner===partie.siege;
    $('result-title').textContent=gagne?`Tu as eu ${partie.adv}.`:`${partie.adv} t’a eu.`;
    $('result-copy').textContent=(g?.result?.reason?g.result.reason+' ':'')+(gagne?'Campawood te reconnaît pour roi, jusqu’à la revanche.':'La buvette se souviendra de cette défaite. La revanche t’attend au salon.');
    const pa=$('play-again');if(pa&&pa.firstChild)pa.firstChild.textContent='RETOUR AU SALON ';
  }
  // En reseau, recommencer seul n'a pas de sens : ces boutons ramenent au salon.
  document.addEventListener('click',e=>{
    if(MODE!=='reseau')return;
    const b=e.target.closest&&e.target.closest('#restart,#back-menu,#play-again,#result-home');
    if(!b||!partie)return;
    e.stopImmediatePropagation();e.preventDefault();
    if(b.id==='back-menu'){if(partie.fini||confirm(`Abandonner ? ${partie.adv} gagnera la partie.`))partie.fini?retourSalon():abandonner();return;}
    retourSalon();
  },true);

  window.addEventListener('pagehide',()=>{
    if(partie&&!partie.fini)envoyer({t:'quitte',s:partie.id,de:partie.siege,motif:'parti'});
    if(monSalon)envoyer({t:'ferme',s:monSalon.id});
    canal?.fermer();canal=null;
  });

  window.FOW_NET={get actif(){return actif;},config,brancher,avancer,abandonner,
    get etat(){return {mode:MODE,moi:MOI,partie,salons:[...salons.values()],tick:lock?.tick||0,desync:!!lock?.desync,attente:lock?.attente.length||0};}};

  function demarrage(){
    if(MODE==='reseau'){
      construireSalon();
      const spec=document.querySelector('.map-specs span');if(spec)spec.textContent='2 JOUEURS EN RÉSEAU';
      const note=document.querySelector('#atlas-dialog .atlas-copy .subtle-note');
      if(note)note.textContent='En réseau, la partie continue pendant que tu consultes l’atlas.';
      canal=ouvrirCanal(recevoir);
      rendreSalon();
      new MutationObserver(surResultat).observe($('result-dialog'),{attributes:true,attributeFilter:['open']});
    }
    // La salle attend le signal pour retirer son « on prépare le royaume ».
    const t=setInterval(()=>{if(fow()){clearInterval(t);salle('pret',{mode:MODE});}},200);
    let enJeu=null;setInterval(()=>{const j=fow()?.mode==='playing';if(j!==enJeu){enJeu=j;salle('ecran',{jeu:j});}},400);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',demarrage);else demarrage();
})();
