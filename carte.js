// FILS OF WAR · la carte vivante (18/10). Florian : « la nouvelle map manque
// d'originalité au niveau de la diversité des paysages et des territoires,
// et des ressources : on aurait dit que je traverse un désert ».
//
// Avant : 24 secteurs tous pareils (2 baies, 4 arbres, 2 pierres, 2 or, un
// troupeau, toujours au meme endroit) sur un sol ocre uniforme. Ici, chaque
// partie tire ses REGIONS : six terroirs aux couleurs, decors et ressources
// differents, regroupes en grandes contrees (on traverse une foret, on
// arrive aux ruffes rouges du Salagou...). Le secteur d'arrivee de chaque
// camp reste une vallee equilibree, celle d'avant : personne ne part avantage.
//
// Le RESEAU exige que les deux telephones tirent la meme carte : tout part de
// la graine de la partie, avec un tirage en entiers (Math.imul) et des
// calculs simples (+, *, comparaisons de carres), identiques sur tout moteur JS.
// Les couleurs et les herbes, elles, ne sont que de l'affichage.
//
// Branchements dans jeu.js (claude/fow/extraire-fow.py) : le moteur appelle
// peupler() a la creation de la partie ; la vue demande sol(), herbe() et
// fleurs() ; l'atlas et la minicarte demandent carteCouleur() ; la graine
// d'une partie solo vient de graine().
(function(){
  var VERSION='4-nord-sud';
  var TERROIRS={
    vallee: {nom:'Vallée',        a:0x8a9852,b:0x758646,herbe:.6, fleurs:.07,carte:[[70,72,48],[140,134,86]]},
    foret:  {nom:'Forêt de Campawood',a:0x5e7a3e,b:0x4a6634,herbe:.88,fleurs:.04,carte:[[36,58,34],[72,112,60]]},
    prairie:{nom:'Prairies',      a:0x8fae52,b:0x7b9c46,herbe:.92,fleurs:.2, carte:[[56,76,38],[120,150,72]]},
    causses:{nom:'Causses rocheux',a:0x9fa198,b:0x82857c,herbe:.22,fleurs:.02,carte:[[72,70,62],[160,154,138]]},
    ruffes: {nom:'Ruffes du Salagou',a:0x9c4532,b:0x7e3a2c,herbe:.3,fleurs:.03,carte:[[80,40,30],[170,86,60]]},
    rives:  {nom:'Rives de l’Hérault',a:0x6f9a5a,b:0x5c8650,herbe:.82,fleurs:.1,carte:[[44,66,46],[96,140,92]]}
  };
  // Seize directions (cos, sin) ecrites en dur : pas de trigonometrie dans le tirage.
  var DIR=[[1,0],[.9239,.3827],[.7071,.7071],[.3827,.9239],[0,1],[-.3827,.9239],[-.7071,.7071],[-.9239,.3827],
           [-1,0],[-.9239,-.3827],[-.7071,-.7071],[-.3827,-.9239],[0,-1],[.3827,-.9239],[.7071,-.7071],[.9239,-.3827]];
  // Ce que chaque terroir pousse : [type, bouquets, par bouquet, quantite, rayon].
  var POUSSES={
    foret:  [['wood',2,9,420,1.8],['food',1,4,500,1.7],['stone',1,2,700,2.0],['gold',1,1,500,1.7]],
    prairie:[['food',1,6,620,1.8],['wood',1,6,480,1.8],['stone',1,2,700,2.0],['gold',1,1,500,1.7]],
    causses:[['stone',1,5,900,2.1],['gold',1,3,700,1.7],['wood',1,5,450,1.8],['food',1,3,500,1.7]],
    ruffes: [['gold',1,5,650,1.7],['stone',1,4,750,2.0],['wood',1,7,450,1.8],['food',1,3,500,1.7]],
    rives:  [['wood',1,8,450,1.8],['food',1,5,550,1.8],['stone',1,2,700,2.0],['gold',1,1,500,1.7]]
  };
  var NOMS_HAMEAUX={foret:'Hameau des Bûcherons',prairie:'Hameau des Bergers',causses:'Hameau des Carriers',ruffes:'Hameau des Orpailleurs',rives:'Hameau des Pêcheurs'};
  var TROUPEAUX={foret:[4,5],prairie:[6,7],causses:[2,3],ruffes:[3,4],rives:[4,5]};
  // Le secteur d'avant, a l'identique : la vallee de depart.
  var VALLEE=[["food",-13,3,500,1.7],["food",-11,7,500,1.8],["wood",-4,15,500,1.8],["wood",1,16,500,1.8],["wood",-9,15,500,1.8],
              ["wood",6,15,500,1.8],["stone",12,4,750,2.1],["stone",16,0,750,2],["gold",11,-14,600,1.7],["gold",14,-10,600,1.7]];

  function tirage(graine){
    var t=(graine^0x5a17c0de)>>>0;
    return function(){t=(t+0x6d2b79f5)|0;var r=Math.imul(t^(t>>>15),1|t);r=(r+Math.imul(r^(r>>>7),61|r))^r;return ((r^(r>>>14))>>>0)/4294967296;};
  }
  function d2(a,b){var dx=a.x-b.x,dz=a.z-b.z;return dx*dx+dz*dz;}

  // Les contrees : quelques foyers tires au sort, chaque secteur prend le terroir du foyer le plus proche.
  function contrees(SECTORS,depart,rnd){
    var loin=SECTORS.slice().sort(function(a,b){return d2(b,depart)-d2(a,depart)||a.id-b.id;})[0];
    var liste=['foret','prairie','causses','ruffes','foret','prairie','causses','ruffes'];
    for(var i=liste.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1)),x=liste[i];liste[i]=liste[j];liste[j]=x;}
    var libres=SECTORS.filter(function(s){return s.id!==depart.id&&s.id!==loin.id;}),foyers=[];
    for(var k=0;k<liste.length&&libres.length;k++){
      var n=Math.floor(rnd()*libres.length);foyers.push({s:libres[n],t:liste[k]});libres.splice(n,1);
    }
    var res=[];
    for(var q=0;q<SECTORS.length;q++){
      var s=SECTORS[q];
      if(s.id===depart.id||s.id===loin.id){res[s.id]='vallee';continue;}
      var best=null,bd=Infinity;
      for(var f=0;f<foyers.length;f++){var dd=d2(s,foyers[f].s);if(dd<bd||(dd===bd&&foyers[f].s.id<best.s.id)){bd=dd;best=foyers[f];}}
      var t=best?best.t:'prairie';
      // Les berges du milieu de carte (rangees 2 et 3) virent aux rives une fois sur trois.
      if((s.row===1||s.row===2)&&t!=='causses'&&rnd()<.34)t='rives';
      res[s.id]=t;
    }
    return res;
  }

  /* ---- les contrees geographiques (lab 19/10) -------------------------------
     Les terroirs de la partie ne sont plus repartis arbitrairement.
     Les reperes forment une geographie de jeu inspiree de l'Herault, jamais
     une carte SIG ; leger jitter de graine pour garder des parties variees.
     Les deux vallees de depart gardent leur economie de depart intacte.
     Important : assigner les biomes AVANT les ressources et les obstacles. */
  function contreesHerault(SECTORS,depart,rnd){
    var loin=SECTORS.slice().sort(function(a,b){return d2(b,depart)-d2(a,depart)||a.id-b.id;})[0];
    var G=window.FOW_GEO_PLAYABLE,B=G&&G.byId;
    // Les foyers viennent des memes localisations que le continent 3D.
    // On garde seulement un petit jitter visuel : la geographie ne change plus de partie en partie.
    var rep=G&&B?[
      {x:B.salagou.x,z:B.salagou.z,t:'ruffes'},
      {x:B.clermont.x,z:B.clermont.z,t:'prairie'},
      {x:B.gorges.x,z:B.gorges.z,t:'causses'},
      {x:B['saint-guilhem'].x,z:B['saint-guilhem'].z,t:'causses'},
      {x:B.lodeve.x,z:B.lodeve.z,t:'causses'},
      {x:B.couvertoirade.x,z:B.couvertoirade.z,t:'causses'},
      {x:B.campagnan.x,z:B.campagnan.z,t:'prairie'},
      {x:B.pezenas.x,z:B.pezenas.z,t:'prairie'},
      {x:B.belarga.x,z:B.belarga.z,t:'rives'},
      {x:B['pont-canet'].x,z:B['pont-canet'].z,t:'rives'},
      {x:B.campawood.x,z:B.campawood.z,t:'foret'},
      {x:B['viols-laval'].x,z:B['viols-laval'].z,t:'foret'},
      {x:B.narbonne.x,z:B.narbonne.z,t:'prairie'},
      {x:B.beziers.x,z:B.beziers.z,t:'prairie'},
      {x:B.sete.x,z:B.sete.z,t:'rives'},
      {x:B.palavas.x,z:B.palavas.z,t:'rives'}
    ]:[
      {x:175,z:192,t:'ruffes'},{x:275,z:197,t:'ruffes'},
      {x:615,z:141,t:'causses'},{x:606,z:578,t:'causses'},
      {x:351,z:279,t:'prairie'},{x:344,z:585,t:'prairie'},
      {x:452,z:430,t:'rives'},{x:515,z:350,t:'rives'},
      {x:92,z:156,t:'foret'},{x:90,z:568,t:'foret'}
    ];
    for(var k=0;k<rep.length;k++){
      rep[k]={x:rep[k].x+(rnd()-.5)*10,z:rep[k].z+(rnd()-.5)*10,t:rep[k].t};
    }
    var result=[];
    for(var i=0;i<SECTORS.length;i++){
      var sec=SECTORS[i];
      if(sec.id===depart.id||sec.id===loin.id){result[sec.id]='vallee';continue;}
      var best=Infinity,type='prairie';
      for(var r=0;r<rep.length;r++){
        var p=rep[r],dx=sec.x-p.x,dz=sec.z-p.z;
        var d=dx*dx+dz*dz;
        if(p.t==='rives'){
          // L'Herault est desormais le vrai axe v0.8 du moteur.
          if(G&&G.riverDist){var drn=G.riverDist(sec.x,sec.z);d=dz*dz*.34+drn*drn*.58;}
          else{var rz=G&&G.riverZ?G.riverZ(sec.x):p.z;var dr=sec.z-rz;d=dx*dx*.34+dr*dr*.58;}
        }
        if(d<best){best=d;type=p.t;}
      }
      // La bande proche du fleuve gagne toujours sur les foyers voisins.
      if(G&&dRiv(sec.x,sec.z)<78&&type!=='causses')type='rives';
      result[sec.id]=type;
    }
    return result;
  }

  /* ---- le relief qui compte : lacs, falaises, marais (18/10) -------------------
     Florian : « une belle carte originale, vallonnée, variée ». Choix : du relief
     pour le decor ET des obstacles infranchissables, sans jamais couper un passage.
     Une grille de 384 x 384 cases (2 m) : 0 libre, 1 lac, 2 falaise, 3 marais.
     Le moteur la lit dans terrainAt (comme la riviere) : on la contourne. */
  var OB_N=384;
  var FORMES={lac:{code:1,r:[7,12],n:[3,5],garde:.86},falaise:{code:2,r:[4.5,8],n:[4,6],garde:.95},marais:{code:3,r:[5,8],n:[4,6],garde:.88}};
  function obstacles(game,api,SECTORS,terroirs,depart,loin,rnd){
    api.setObstacles&&api.setObstacles(null);
    var base=new Uint8Array(OB_N*OB_N);
    for(var iz=0;iz<OB_N;iz++)for(var ix=0;ix<OB_N;ix++)base[iz*OB_N+ix]=api.terrainAt(ix*2+1,iz*2+1)==='water'?1:0;
    var feats=[];
    function peindre(G,f,gonfle,code){
      for(var c=0;c<f.c.length;c++){
        var C=f.c[c],R=C[2]*(gonfle?1:FORMES[f.t].garde)+(gonfle||0),x0=Math.max(0,Math.floor((C[0]-R)/2)),x1=Math.min(OB_N-1,Math.floor((C[0]+R)/2)),
            z0=Math.max(0,Math.floor((C[1]-R)/2)),z1=Math.min(OB_N-1,Math.floor((C[1]+R)/2)),R2=R*R;
        for(var z=z0;z<=z1;z++)for(var x=x0;x<=x1;x++){
          var wx=x*2+1,wz=z*2+1,dx=wx-C[0],dz=wz-C[1];
          if(dx*dx+dz*dz>R2)continue;
          // Aucun obstacle procedural ne coupe ou ne bouche la vallée de l'Hérault.
          if(dRiv(wx,wz)<34)continue;
          G[z*OB_N+x]=code;
        }
      }
    }
    function grille(gonfle){var G=new Uint8Array(OB_N*OB_N);for(var i=0;i<feats.length;i++)peindre(G,feats[i],gonfle,gonfle?1:FORMES[feats[i].t].code);return G;}
    // Tout le monde doit pouvoir aller partout : du camp de depart, on atteint chaque secteur.
    var file=new Int32Array(OB_N*OB_N);
    function relie(){
      var G=grille(2.5),vu=new Uint8Array(OB_N*OB_N);
      function cel(s){return Math.floor(s.z/2)*OB_N+Math.floor(s.x/2);}
      var d0=cel(depart),tete=0,queue=0;file[queue++]=d0;vu[d0]=1;
      while(tete<queue){
        var k=file[tete++],x=k%OB_N,z=(k-x)/OB_N;
        if(x>0){var a1=k-1;if(!vu[a1]&&!G[a1]&&!base[a1]){vu[a1]=1;file[queue++]=a1;}}
        if(x<OB_N-1){var a2=k+1;if(!vu[a2]&&!G[a2]&&!base[a2]){vu[a2]=1;file[queue++]=a2;}}
        if(z>0){var a3=k-OB_N;if(!vu[a3]&&!G[a3]&&!base[a3]){vu[a3]=1;file[queue++]=a3;}}
        if(z<OB_N-1){var a4=k+OB_N;if(!vu[a4]&&!G[a4]&&!base[a4]){vu[a4]=1;file[queue++]=a4;}}
      }
      for(var i=0;i<SECTORS.length;i++)if(!vu[cel(SECTORS[i])])return false;
      return true;
    }
    function permis(x,z,r){
      if(x<r+10||z<r+10||x>758-r||z>758-r)return false;
      // Pas d'etang ni de marais colle a la mer : ils se confondraient avec elle.
      var GPc=window.FOW_GEO_PLAYABLE;if(GPc&&GPc.coastZ&&z+r>GPc.coastZ(x)-60)return false;
      var dzr=dRiv(x,z);if(dzr<r+42)return false;
      for(var i=0;i<SECTORS.length;i++){var s=SECTORS[i],m=r+(s.id===depart.id||s.id===loin.id?38:24);if(d2({x:x,z:z},s)<m*m)return false;}
      for(var j=0;j<feats.length;j++)for(var c=0;c<feats[j].c.length;c++){var C=feats[j].c[c],m2=C[2]+r+12;if(d2({x:x,z:z},{x:C[0],z:C[1]})<m2*m2)return false;}
      return true;
    }
    // 19/10 soir : le lac du Salagou est pose en premier, a sa place, avant toute ressource.
    var GPs=window.FOW_GEO_PLAYABLE,SLs=GPs&&GPs.nordSud&&GPs.byId&&GPs.byId.salagou;
    if(SLs)feats.push({t:'lac',c:[[SLs.x,SLs.z,30],[SLs.x-22,SLs.z-6,20],[SLs.x+22,SLs.z+8,20],[SLs.x+6,SLs.z+22,16],[SLs.x-6,SLs.z-20,15]],sec:-1,nom:'Lac du Salagou'});
    var ESPECE={causses:[['falaise',.9]],ruffes:[['falaise',.75],['lac',.2]],foret:[['marais',.4],['lac',.35]],prairie:[['lac',.55],['marais',.1]],rives:[['lac',.45],['marais',.35]]};
    for(var q=0;q<SECTORS.length;q++){
      var sec=SECTORS[q],t=terroirs[sec.id],choix=ESPECE[t];
      if(!choix)continue;
      for(var e=0;e<choix.length;e++){
        if(rnd()>=choix[e][1])continue;
        var F=FORMES[choix[e][0]];
        for(var essai=0;essai<10;essai++){
          var d=DIR[Math.floor(rnd()*16)],dist=30+rnd()*24,R=F.r[0]+rnd()*(F.r[1]-F.r[0]),cx=sec.x+d[0]*dist,cz=sec.z+d[1]*dist;
          if(!permis(cx,cz,R))continue;
          var f={t:choix[e][0],c:[[cx,cz,R]],sec:sec.id},n=F.n[0]+Math.floor(rnd()*(F.n[1]-F.n[0]+1)),dir=Math.floor(rnd()*16),px=cx,pz=cz,pr=R;
          for(var k=1;k<n;k++){
            // Une falaise s'etire en crete ; un lac ou un marais s'arrondit.
            dir=(dir+(f.t==='falaise'?(rnd()<.5?15:1):Math.floor(rnd()*7)+13)+16)%16;
            var dd=DIR[dir],r2=pr*(.65+rnd()*.35),nx=px+dd[0]*pr*.85,nz=pz+dd[1]*pr*.85;
            if(!permis(nx,nz,r2)&&k>1)break;
            f.c.push([nx,nz,r2]);if(f.t==='falaise'){px=nx;pz=nz;pr=r2;}
          }
          feats.push(f);
          if(!relie())feats.pop();
          break;
        }
      }
    }
    var G=grille(0);
    api.setObstacles&&api.setObstacles(G);
    game.obstacles=G;game.reliefs=feats;
    return feats;
  }

  function peupler(game,api){
    var SECTORS=api.SECTORS,rnd=tirage(game.seed|0),depart=SECTORS[game.startRegion]||SECTORS[18];
    var terroirs=contreesHerault(SECTORS,depart,rnd),poses=[];
    var loin0=SECTORS.slice().sort(function(a,b){return d2(b,depart)-d2(a,depart)||a.id-b.id;})[0];
    sectorsVue=SECTORS;courant=game;cacheH=null;cacheCarte.clear();cachePeint.clear();riverFn=api.riverZ;
    var reliefs=obstacles(game,api,SECTORS,terroirs,depart,loin0,rnd);
    function terre(x,z,r){
      if(x<r+8||z<r+8||x>760-r||z>760-r)return false;
      return api.terrainAt(x,z)==='land'&&api.terrainAt(x-r-1,z)==='land'&&api.terrainAt(x+r+1,z)==='land'&&
             api.terrainAt(x,z-r-1)==='land'&&api.terrainAt(x,z+r+1)==='land';
    }
    function libre(x,z,r,sec){
      var p={x:x,z:z};
      if(d2(p,sec)<100)return false;                                   // le coeur du secteur reste au colon
      if(auPont(x,z,20))return false;
      for(var b=0;b<api.BRIDGES.length;b++){var bx=api.BRIDGES[b],dx=x-bx;if(dx>-14&&dx<14){var dz=z-api.riverZ(bx);if(dz>-18&&dz<18)return false;}}
      for(var i=0;i<poses.length;i++){var o=poses[i],m=o.r+r+1.1;if(d2(o,p)<m*m)return false;}
      return true;
    }
    function poser(type,x,z,amount,r,sec){
      if(!terre(x,z,r)||!libre(x,z,r,sec))return false;
      api.addNode(type,x,z,amount,r,void 0,sec.id);poses.push({x:x,z:z,r:r});return true;
    }
    for(var q=0;q<SECTORS.length;q++){
      var sec=SECTORS[q],t=terroirs[sec.id];
      if(t==='vallee'){
        for(var v=0;v<VALLEE.length;v++){var e=VALLEE[v];api.addNode(e[0],sec.x+e[1],sec.z+e[2],e[3],e[4],void 0,sec.id);poses.push({x:sec.x+e[1],z:sec.z+e[2],r:e[4]});}
        api.addHerd(sec,sec.x-26,sec.z-14,4,[[-3,0],[2,-3],[3,3]]);
        continue;
      }
      var pousses=POUSSES[t];
      for(var g=0;g<pousses.length;g++){
        var type=pousses[g][0],bouquets=pousses[g][1],par=pousses[g][2],qte=pousses[g][3],ray=pousses[g][4];
        for(var k=0;k<bouquets;k++){
          // Un bouquet : un centre a 15-34 du coeur, puis ses membres serres autour.
          var cx=0,cz=0,ok=false;
          for(var essai=0;essai<14&&!ok;essai++){
            var d=DIR[Math.floor(rnd()*16)],dist=15+rnd()*19;
            cx=sec.x+d[0]*dist;cz=sec.z+d[1]*dist;
            ok=terre(cx,cz,ray)&&libre(cx,cz,ray,sec);
          }
          if(!ok)continue;
          var poses0=0;
          for(var m=0;m<par;m++){
            for(var e2=0;e2<10;e2++){
              var dd=DIR[Math.floor(rnd()*16)],ecart=m===0&&e2===0?0:ray*2.2+rnd()*3.2;
              // Des quantites qui varient un peu d'une plante a l'autre.
              if(poser(type,cx+dd[0]*ecart,cz+dd[1]*ecart,Math.round(qte*(.85+rnd()*.3)),ray,sec)){poses0++;break;}
            }
          }
        }
      }
      var tr=TROUPEAUX[t];
      for(var h=0;h<12;h++){
        var dh=DIR[Math.floor(rnd()*16)],dist2=20+rnd()*10,hx=sec.x+dh[0]*dist2,hz=sec.z+dh[1]*dist2;
        if(terre(hx,hz,4)){
          var pts=[[-3,0],[2,-3],[3,3],[-2,4],[4,-1],[0,-4],[-4,-3]].slice(0,tr[0]);
          api.addHerd(sec,hx,hz,tr[1],pts);break;
        }
      }
    }
    /* ---- les richesses nouvelles (18/10) : poissons, vignes, gros filons ---------- */
    var src=api.addNode.length>=6;   // le moteur accepte une « source » (poisson, vigne)
    function poserSrc(type,x,z,q,r,sec,source){
      if(!terre(x,z,r)||!libre(x,z,r,sec))return false;
      api.addNode(type,x,z,q,r,source,sec.id);poses.push({x:x,z:z,r:r});return true;
    }
    function secteurDe(x,z){var b=null,bd=Infinity;for(var i=0;i<SECTORS.length;i++){var dd=d2({x:x,z:z},SECTORS[i]);if(dd<bd){bd=dd;b=SECTORS[i];}}return b;}
    // Ancien systeme de "coins peche" desactive : les poissons flottants/decales
    // ne sont plus generes. La peche sera liee a des constructions (cabane, bateau, port).
    for(var l=0;false&&l<reliefs.length;l++){
      var L=reliefs[l];if(L.t!=='lac')continue;
      var C0=L.c[0],mis=0;
      for(var a8=0;a8<16&&mis<2;a8++){
        var dl=DIR[(a8*5+l)%16];
        for(var ext=0;ext<8;ext++){var fx=C0[0]+dl[0]*(C0[2]+2+ext),fz=C0[1]+dl[1]*(C0[2]+2+ext),sf=secteurDe(fx,fz);
          if(api.terrainAt(fx,fz)==='land'){if(poserSrc('food',fx,fz,420,1.6,sf,'fish')){mis++;a8+=4;}break;}}
      }
    }
    for(var q2=0;false&&q2<SECTORS.length;q2++){
      var sr=SECTORS[q2];if(sr.row!==1&&sr.row!==2)continue;
      var nb=terroirs[sr.id]==='rives'?2:terroirs[sr.id]==='vallee'?0:1;
      for(var f2=0;f2<nb;f2++)for(var e3=0;e3<8;e3++){
        var rx=sr.x-36+rnd()*72,cote=sr.row===1?-1:1,rz=api.riverZ(rx)+cote*(9+rnd()*3);
        if(poserSrc('food',rx,rz,420,1.6,sr,'fish'))break;
      }
    }
    for(var q3=0;q3<SECTORS.length;q3++){
      var sv3=SECTORS[q3],t3=terroirs[sv3.id];
      // Les vignes de l'Herault : sur les ruffes et les prairies.
      if((t3==='ruffes'&&rnd()<.85)||(t3==='prairie'&&rnd()<.6)){
        for(var e4=0;e4<12;e4++){
          var dv=DIR[Math.floor(rnd()*16)],dist4=18+rnd()*16,vx=sv3.x+dv[0]*dist4,vz=sv3.z+dv[1]*dist4,mises=0;
          for(var m4=0;m4<3;m4++)if(poserSrc('food',vx+m4*4.4*dv[1],vz-m4*4.4*dv[0],450,1.7,sv3,'vine'))mises++;
          if(mises)break;
        }
      }
      // Les gros filons, rares : pierre sur les causses, filsous sur les ruffes.
      if((t3==='causses'||t3==='ruffes')&&rnd()<.6){
        for(var e5=0;e5<12;e5++){
          var dg=DIR[Math.floor(rnd()*16)],dist5=20+rnd()*16;
          if(poserSrc(t3==='causses'?'stone':'gold',sv3.x+dg[0]*dist5,sv3.z+dg[1]*dist5,t3==='causses'?2200:1700,2.7,sv3,t3==='causses'?'bigstone':'biggold'))break;
        }
      }
    }
    // Les hameaux neutres (18/10, Florian : 6, a rallier ou a piller) : au coeur de six secteurs,
    // loin des deux vallees de depart et loin les uns des autres.
    if(api.addVillage){
      var loin=SECTORS.slice().sort(function(a,b){return d2(b,depart)-d2(a,depart)||a.id-b.id;})[0];
      var cand=SECTORS.filter(function(s){return terroirs[s.id]!=='vallee'&&d2(s,depart)>=22500&&d2(s,loin)>=22500;});
      for(var c=cand.length-1;c>0;c--){var cj=Math.floor(rnd()*(c+1)),cx2=cand[c];cand[c]=cand[cj];cand[cj]=cx2;}
      var pris=[],vus={};
      for(var ecart=40000;ecart>=10000&&pris.length<6;ecart-=10000)
        for(var v=0;v<cand.length&&pris.length<6;v++){
          var sv=cand[v],ok2=pris.indexOf(sv)<0;
          for(var w=0;w<pris.length&&ok2;w++)if(d2(pris[w],sv)<ecart)ok2=false;
          if(ok2&&terre(sv.x,sv.z,4))pris.push(sv);
        }
      for(var h2=0;h2<pris.length;h2++){
        var sh=pris[h2],th=terroirs[sh.id],nom=NOMS_HAMEAUX[th]||'Hameau';
        if(vus[nom])nom+=' · '+sh.name;vus[nom]=1;
        api.addVillage(sh.x,sh.z,th,sh.id,nom);
      }
    }
    /* ---- les sites speciaux (18/10) : une source chaude, une vieille mine, des menhirs.
       Sur les lisieres entre deux secteurs, loin des deux camps et des hameaux. */
    if(api.addSite){
      var lis=[];
      for(var a9=0;a9<SECTORS.length;a9++)for(var b9=a9+1;b9<SECTORS.length;b9++){
        var A=SECTORS[a9],B=SECTORS[b9],dx9=A.col-B.col,dz9=A.row-B.row;
        if(dx9*dx9+dz9*dz9!==1)continue;
        var mx=(A.x+B.x)/2,mz=(A.z+B.z)/2,p9={x:mx,z:mz};
        if(d2(p9,depart)<160*160||d2(p9,loin0)<160*160)continue;
        var dzr9=dRiv(mx,mz);if(dzr9<18)continue;
        lis.push(p9);
      }
      for(var c9=lis.length-1;c9>0;c9--){var j9=Math.floor(rnd()*(c9+1)),x9=lis[c9];lis[c9]=lis[j9];lis[j9]=x9;}
      var SITES=[['spring','La Source chaude'],['mine','La Vieille Mine'],['menhir','Les Menhirs du Salagou']],faits=[];
      for(var s9=0;s9<SITES.length;s9++)for(var l9=0;l9<lis.length;l9++){
        var P=lis[l9],ok9=true;
        for(var f9=0;f9<faits.length;f9++)if(d2(faits[f9],P)<220*220)ok9=false;
        if(!ok9)continue;
        // Une place libre de 9 m autour du site.
        var bon=null;
        for(var e9=0;e9<10&&!bon;e9++){var dd9=DIR[(e9*3+s9)%16],r9=e9?4+e9:0,sx=P.x+dd9[0]*r9,sz=P.z+dd9[1]*r9;if(terre(sx,sz,8)&&libre(sx,sz,6,{x:-999,z:-999}))bon={x:sx,z:sz};}
        if(!bon)continue;
        api.addSite(SITES[s9][0],bon.x,bon.z,SITES[s9][1]);poses.push({x:bon.x,z:bon.z,r:8});faits.push(bon);lis.splice(l9,1);break;
      }
    }
    game.terroirs=terroirs;game.carteVersion=VERSION;
  }

  /* ---- l'affichage ------------------------------------------------------ */
  // Le terroir d'un point : les secteurs voisins se fondent les uns dans les autres.
  var sectorsVue=null,courant=null,cacheH=null;
  function poids(game,x,z){
    var S=sectorsVue,T=game.terroirs,out={},tot=0;
    if(!S||!T)return null;
    // Des frontieres qui ondulent : pas de carres de terroir.
    var gw=(game.seed|0)^0x5bd1e995,wx=x+(vn(x,z,52,gw)-.5)*80,wz=z+(vn(x+911,z+317,52,gw+1)-.5)*80;
    for(var i=0;i<S.length;i++){
      var dx=wx-S[i].x,dz=wz-S[i].z,d=Math.sqrt(dx*dx+dz*dz);
      if(d>150)continue;
      var w=Math.exp(-d/16),t=T[S[i].id]||'vallee';
      out[t]=(out[t]||0)+w;tot+=w;
    }
    if(!tot)return null;
    for(var k in out)out[k]/=tot;
    return out;
  }
  function dominant(game,x,z){
    var p=poids(game,x,z),best='vallee',bw=-1;
    if(!p)return TERROIRS.vallee;
    for(var k in p)if(p[k]>bw){bw=p[k];best=k;}
    return TERROIRS[best];
  }
  // Couleur du sol : meme melange que la vue d'origine (a vers b selon un bruit n), terroir par terroir,
  // dans l'espace de couleurs de three.js (setHex convertit, lerp travaille en lineaire comme avant).
  var tA=null,tB=null;
  function sol(base,x,z,n,game){
    var p=poids(game,x,z),m=Math.max(0,Math.min(1,n))*.63;
    if(!tA){tA=new base.constructor();tB=new base.constructor();}
    if(!p){base.setHex(TERROIRS.vallee.a).lerp(tB.setHex(TERROIRS.vallee.b),m);return base;}
    var r=0,g=0,b=0;
    for(var k in p){
      var T=TERROIRS[k],w=p[k];
      tA.setHex(T.a).lerp(tB.setHex(T.b),m);
      r+=w*tA.r;g+=w*tA.g;b+=w*tA.b;
    }
    base.r=r;base.g=g;base.b=b;
    var GP=window.FOW_GEO_PLAYABLE,SL=GP&&GP.byId&&GP.byId.salagou;
    if(SL){
      var ds=Math.hypot(x-SL.x,z-SL.z),ks=1-lisse(62,118,ds);
      if(ks>0)base.lerp(tA.setHex(0xa54b36),ks*.86);
    }
    if(GP&&GP.isBeach&&GP.isBeach(x,z)){var dcs=z-GP.coastZ(x),kb=dcs>-16?lisse(-16,-9,dcs):1;if(GP.surSete&&GP.surSete(x,z))kb=1;base.lerp(tA.setHex(0xd8c48e),kb*.92);}
    return base;
  }
  function herbe(x,z,game){return dominant(game,x,z).herbe;}
  function fleurs(x,z,game){return dominant(game,x,z).fleurs;}
  var cacheCarte=new Map();
  function connaitreSecteurs(S){sectorsVue=S;}

  /* ---- le relief a l'ecran (18/10) ----------------------------------------------
     Purement visuel (le moteur reste a plat, seuls les obstacles comptent) : des
     collines selon le terroir (causses et ruffes accidentes, prairies et rives
     douces), une vallee plate le long de la riviere, un replat au coeur de chaque
     secteur pour batir, des cuvettes pour les lacs et marais, des falaises dressees.
     Grille de 385 x 385 points (2 m), calculee une fois par partie. */
  var HN=385,riverFn=null;
  // 19/10 soir : l'Herault coule du nord au sud. La distance au fleuve vient de la
  // geographie quand elle la connait, sinon de l'ancienne riviere horizontale.
  function dRiv(x,z){var G=window.FOW_GEO_PLAYABLE;if(G&&G.riverDist)return G.riverDist(x,z);return riverFn?Math.abs(z-riverFn(x)):999;}
  function auPont(x,z,m){var G=window.FOW_GEO_PLAYABLE,P=G&&G.ponts||[];for(var i=0;i<P.length;i++){var dx=x-P[i].x,dz=z-P[i].z;if(dx*dx+dz*dz<m*m)return true;}return false;}
  var AMP={vallee:2.4,foret:6,prairie:3.6,causses:10,ruffes:8,rives:2};
  var NIV={lac:-1.15,marais:-.35};
  function hash(ix,iz,g){var h=Math.imul(ix|0,374761393)^Math.imul(iz|0,668265263)^Math.imul(g|0,2246822519);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
  function vn(x,z,cel,g){
    var gx=x/cel,gz=z/cel,ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz;
    fx=fx*fx*(3-2*fx);fz=fz*fz*(3-2*fz);
    var a=hash(ix,iz,g),b=hash(ix+1,iz,g),c=hash(ix,iz+1,g),d=hash(ix+1,iz+1,g);
    return a+(b-a)*fx+(c-a)*fz+(a-b-c+d)*fx*fz;
  }
  function lisse(a,b,x){var t=(x-a)/(b-a);t=t<0?0:t>1?1:t;return t*t*(3-2*t);}
  function reliefCalc(game){
    var g=(game.seed|0)^0x1234567,H=new Float32Array(HN*HN),L=new Float32Array(HN*HN),M=new Float32Array(HN*HN),F=new Float32Array(HN*HN);
    L.fill(-9);M.fill(-9);F.fill(-9);
    // L'amplitude suit le terroir, sur une grille grossiere (tous les 8 m) puis interpolee.
    var CN=97,amp=new Float32Array(CN*CN),rug=new Float32Array(CN*CN);
    for(var cz=0;cz<CN;cz++)for(var cx=0;cx<CN;cx++){var p=poids(game,cx*8,cz*8),A=1.8,Rg=0;if(p){A=0;for(var k in p)A+=p[k]*(AMP[k]||2);Rg=(p.causses||0)+(p.ruffes||0)*.8+(p.foret||0)*.35;}amp[cz*CN+cx]=A;rug[cz*CN+cx]=Rg;}
    function grosse(T,x,z){var gx=x/8,gz=z/8,ix=Math.min(CN-2,Math.floor(gx)),iz=Math.min(CN-2,Math.floor(gz)),fx=gx-ix,fz=gz-iz;
      return T[iz*CN+ix]*(1-fx)*(1-fz)+T[iz*CN+ix+1]*fx*(1-fz)+T[(iz+1)*CN+ix]*(1-fx)*fz+T[(iz+1)*CN+ix+1]*fx*fz;}
    function ampAt(x,z){return grosse(amp,x,z);}
    for(var iz=0;iz<HN;iz++)for(var ix=0;ix<HN;ix++){
      var x=ix*2,z=iz*2,n=vn(x,z,64,g)+vn(x,z,26,g+1)*.5+vn(x,z,11,g+2)*.18,c=n/1.68-.42,h=c*ampAt(x,z)*1.6;
      // Les causses et les ruffes ont des cretes : un bruit « en arete ».
      var ru=grosse(rug,x,z);if(ru>.02){var cr=1-Math.abs(2*vn(x,z,38,g+3)-1);h+=ru*cr*cr*cr*7;}
      var dr=dRiv(x,z);h*=lisse(10,34,dr);
      // Pas de cuvette au hasard : seuls les lacs et marais descendent sous l'eau.
      var hh0=(h<-.6?-.6+(h+.6)*.15:h)+montagneSalagou(x,z);
      // Gorges de l'Herault : vallée encaissée lisible autour du repère géographique.
      var GP=window.FOW_GEO_PLAYABLE,GG=GP&&GP.byId&&GP.byId.gorges;
      if(GG){
        var dg=Math.hypot(x-GG.x,z-GG.z),drg=dRiv(x,z);
        if(dg<115&&drg>7&&drg<62){
          var kg=(1-dg/115)*lisse(7,28,drg)*(1-lisse(48,64,drg));
          hh0+=kg*(12+8*(1-Math.abs(2*vn(x,z,23,g+19)-1)));
        }
      }
      H[iz*HN+ix]=hh0;
    }
    // Un replat au coeur de chaque secteur : on y bâtit a plat.
    var S=sectorsVue||[];
    for(var s=0;s<S.length;s++){
      var sc=S[s],hc=0,R=34,nb0=0;
      for(var az=-6;az<=6;az+=3)for(var ax=-6;ax<=6;ax+=3){var ii=Math.min(HN-1,Math.max(0,Math.round(sc.z/2)+az))*HN+Math.min(HN-1,Math.max(0,Math.round(sc.x/2)+ax));hc+=H[ii];nb0++;}
      hc/=nb0;var x0=Math.max(0,Math.floor((sc.x-R)/2)),x1=Math.min(HN-1,Math.ceil((sc.x+R)/2)),z0=Math.max(0,Math.floor((sc.z-R)/2)),z1=Math.min(HN-1,Math.ceil((sc.z+R)/2));
      for(var zz=z0;zz<=z1;zz++)for(var xx=x0;xx<=x1;xx++){var dx=xx*2-sc.x,dz=zz*2-sc.z,k2=lisse(34,13,Math.sqrt(dx*dx+dz*dz)),i2=zz*HN+xx;H[i2]=H[i2]*(1-k2)+hc*k2;}
    }
    // Lacs, marais, falaises : la profondeur relative (1 au centre d'un cercle, 0 au bord, negative dehors).
    var feats=game.reliefs||[];
    for(var f=0;f<feats.length;f++){
      var T=feats[f].t==='lac'?L:feats[f].t==='marais'?M:F;
      for(var c2=0;c2<feats[f].c.length;c2++){
        var C=feats[f].c[c2],R2=C[2]*1.6,a0=Math.max(0,Math.floor((C[0]-R2)/2)),a1=Math.min(HN-1,Math.ceil((C[0]+R2)/2)),b0=Math.max(0,Math.floor((C[1]-R2)/2)),b1=Math.min(HN-1,Math.ceil((C[1]+R2)/2));
        for(var zb=b0;zb<=b1;zb++)for(var xb=a0;xb<=a1;xb++){var ddx=xb*2-C[0],ddz=zb*2-C[1],v=1-Math.sqrt(ddx*ddx+ddz*ddz)/C[2],i3=zb*HN+xb;if(v>T[i3])T[i3]=v;}
      }
    }
    for(var i=0;i<HN*HN;i++){
      var hh=H[i],xg=(i%HN)*2,zg=((i-i%HN)/HN)*2;
      if(L[i]>-.45){var kl=lisse(-.4,.25,L[i]);hh=hh*(1-kl)+(-2)*kl;}
      if(M[i]>-.4){var km=lisse(-.35,.15,M[i]);hh=hh*(1-km)+(-.6)*km;}
      if(F[i]>-.15){var kf=lisse(-.06,.22,F[i]);hh+=kf*(6.5+2.2*vn(xg,zg,7,g+5));}
      H[i]=hh;
    }
    // Derniere passe : l'Herault reste un cours d'eau continu, jamais enseveli par une colline.
    if(riverFn||(window.FOW_GEO_PLAYABLE&&window.FOW_GEO_PLAYABLE.riverDist)){
      for(var rz0=0;rz0<HN;rz0++)for(var rx0=0;rx0<HN;rx0++){
        var wx0=rx0*2,wz0=rz0*2,dr0=dRiv(wx0,wz0),ii0=rz0*HN+rx0;
        if(dr0<8)H[ii0]=Math.min(H[ii0],-.58);
        else if(dr0<42){
          // Talus progressif sur 34 m : pas de mur vertical ni de montagne qui traverse l'eau.
          var kv=lisse(8,42,dr0),cap=-.58+kv*10.5;
          H[ii0]=Math.min(H[ii0],cap);
        }
      }
    }
    var GPm=window.FOW_GEO_PLAYABLE;
    if(GPm&&GPm.coastZ){
      for(var cz1=0;cz1<HN;cz1++)for(var cx1=0;cx1<HN;cx1++){
        var wxc=cx1*2,wzc=cz1*2,dc=wzc-GPm.coastZ(wxc),ic=cz1*HN+cx1;
        if(GPm.surSete&&dc>-2&&GPm.surSete(wxc,wzc)){H[ic]=GPm.isBeach(wxc,wzc)?-.18:-.18+GPm.hauteurSete(wxc,wzc);continue;}
        if(dc>0)H[ic]=Math.min(H[ic],-.9-Math.min(1.2,dc*.05));
        else if(dc>-24){var kc=lisse(-24,0,dc);H[ic]=H[ic]*(1-kc)+(-.24)*kc;}
      }
    }
    return {H:H,L:L,M:M,F:F};
  }
  function relief(){
    if(!courant||!courant.terroirs)return null;
    if(!cacheH||cacheH.game!==courant){cacheH=reliefCalc(courant);cacheH.game=courant;}
    return cacheH;
  }
  function echant(T,x,z){
    var gx=x/2,gz=z/2;if(gx<0)gx=0;if(gz<0)gz=0;if(gx>HN-1.001)gx=HN-1.001;if(gz>HN-1.001)gz=HN-1.001;
    var ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz,i=iz*HN+ix;
    return T[i]*(1-fx)*(1-fz)+T[i+1]*fx*(1-fz)+T[i+HN]*(1-fx)*fz+T[i+HN+1]*fx*fz;
  }
  function montagneSalagou(x,z){
    var G=window.FOW_GEO_PLAYABLE,B=G&&G.byId;
    var pics;
    if(B){
      pics=[
        [B.salagou.x-32,B.salagou.z-20,19,58,44],
        [B.salagou.x+40,B.salagou.z+25,17,52,39],
        [B.gorges.x-6,B.gorges.z-20,34,62,46],
        [B['saint-guilhem'].x+18,B['saint-guilhem'].z+5,24,48,40],
        [B.lodeve.x-8,B.lodeve.z-14,25,58,43],
        [B.couvertoirade.x+10,B.couvertoirade.z+4,31,68,48],
        [B['saint-pons'].x+8,B['saint-pons'].z+18,15,45,36],
        [B.campawood.x-12,B.campawood.z-8,11,42,34]
      ];
      if(G.pic)pics.push([G.pic.x,G.pic.z,G.pic.h,G.pic.rx,G.pic.rz],[G.pic.x-30,G.pic.z+14,18,30,24],[G.pic.x+26,G.pic.z+10,14,26,22]);
    }else{
      pics=[[129,120,22,49,37],[287,121,26,44,35],[302,255,20,44,34],[101,280,18,39,47],
            [351,89,42,54,42],[251,291,21,45,31],[71,199,22,39,42],[322,190,18,33,54]];
    }
    var h=0;
    for(var i=0;i<pics.length;i++){
      var p=pics[i],dx=(x-p[0])/p[3],dz=(z-p[1])/p[4],d=dx*dx+dz*dz;
      if(d<1){var v=(1-d);h+=p[2]*v*v*(.83+.17*Math.sin(x*.16+z*.11)*Math.sin(z*.13));}
    }
    return h;
  }

  function h(x,z){var R=relief();return R?echant(R.H,x,z):0;}
  function hBat(x,z,r){
    var R=relief();if(!R)return 0;var k=(r||2)*.82;
    var v=[echant(R.H,x-k,z-k),echant(R.H,x+k,z-k),echant(R.H,x-k,z+k),echant(R.H,x+k,z+k),echant(R.H,x,z)];
    v.sort(function(a,b){return a-b;});
    // Niveau de terrasse : mediane, puis leger relevage pour garder le soubassement visible.
    return v[4]+.08;
  }
  function penteBat(x,z,r){
    var R=relief();if(!R)return 0;var k=(r||2)*.95,c=echant(R.H,x,z),mx=0;
    var pts=[[x-k,z-k],[x+k,z-k],[x-k,z+k],[x+k,z+k],[x-k,z],[x+k,z],[x,z-k],[x,z+k]];
    for(var i=0;i<pts.length;i++){var d=Math.abs(echant(R.H,pts[i][0],pts[i][1])-c);if(d>mx)mx=d;}
    return mx;
  }
  function normale(x,z,out){var R=relief();if(!R){out[0]=0;out[1]=1;out[2]=0;return out;}
    var nx=echant(R.H,x-2,z)-echant(R.H,x+2,z),nz=echant(R.H,x,z-2)-echant(R.H,x,z+2),l=Math.sqrt(nx*nx+16+nz*nz);out[0]=nx/l;out[1]=4/l;out[2]=nz/l;return out;}
  // Ce qui teinte le sol : la roche des falaises, la vase des marais, le sable des rives de lac.
  function teinte(x,z){var R=relief();if(!R)return null;return {lac:echant(R.L,x,z),marais:echant(R.M,x,z),falaise:echant(R.F,x,z),h:echant(R.H,x,z)};}
  function solRelief(base,x,z){
    var t=teinte(x,z);if(!t)return base;
    if(!tA){tA=new base.constructor();tB=new base.constructor();}
    if(t.falaise>-.12){var kf=lisse(-.12,.3,t.falaise);base.lerp(tA.setHex(0x7d776c),kf*.92);}
    if(t.lac>-.45){var ks=lisse(-.45,-.1,t.lac)*(1-lisse(0,.3,t.lac));base.lerp(tA.setHex(0xc9b98a),ks*.7);if(t.lac>-.05)base.lerp(tA.setHex(0x5b6650),lisse(-.05,.3,t.lac));}
    if(t.marais>-.35)base.lerp(tA.setHex(0x55583a),lisse(-.35,.1,t.marais)*.85);
    // Un ombrage peint, eclaire du nord-ouest comme sur une carte : le relief se lit d'un coup d'oeil.
    var R=relief(),dx=echant(R.H,x-2,z)-echant(R.H,x+2,z),dz=echant(R.H,x,z-2)-echant(R.H,x,z+2),pente=Math.sqrt(dx*dx+dz*dz)/4;
    // Les pentes fortes montrent la roche.
    if(pente>.14)base.lerp(tA.setHex(0x8a8070),lisse(.14,.45,pente)*.65);
    var om=1+(echant(R.H,x-2.5,z-2.5)-echant(R.H,x+2.5,z+2.5))*.11;
    base.multiplyScalar(Math.max(.55,Math.min(1.38,om))*(1+Math.max(-.1,Math.min(.12,t.h*.012))));
    return base;
  }
  // Le decor d'une tuile de 64 m : l'eau des lacs et marais, les rochers des falaises,
  // les roseaux des marais, les arbres poses dans ce qu'on ne peut pas traverser.
  function decor(col,row){
    var R=relief(),out={eaux:[],rochers:[],roseaux:[],arbres:[],nenuphars:[],buissons:[]};if(!R)return out;
    var x0=col*64,z0=row*64,q={lac:[],marais:[]};
    for(var iz=0;iz<32;iz++)for(var ix=0;ix<32;ix++){
      var gx=x0/2+ix,gz=z0/2+iz,i=gz*HN+gx;if(gx>=HN-1||gz>=HN-1)continue;
      var l=Math.max(R.L[i],R.L[i+1],R.L[i+HN],R.L[i+HN+1]),m=Math.max(R.M[i],R.M[i+1],R.M[i+HN],R.M[i+HN+1]);
      // L'eau deborde sous le sol : c'est le relief qui dessine la rive, bien ronde.
      if(l>-.3)q.lac.push(gx*2,gz*2);
      else if(m>-.28)q.marais.push(gx*2,gz*2);
    }
    if(q.lac.length)out.eaux.push({y:-.11+NIV.lac,marais:false,cases:q.lac});
    if(q.marais.length)out.eaux.push({y:-.11+NIV.marais,marais:true,cases:q.marais});
    var r=tirage((col*977+row*7919)^(courant.seed|0));
    for(var k=0;k<260;k++){
      var x=x0+r()*64,z=z0+r()*64,f=echant(R.F,x,z),mm=echant(R.M,x,z),ll=echant(R.L,x,z),hh=echant(R.H,x,z);
      if(f>.05){
        if(r()<.45)out.rochers.push({x:x,y:hh-.15,z:z,sx:.7+r()*1.8,sy:.5+r()*1.4,sz:.7+r()*1.6,ry:r()*6.28});
        else if(r()<.16)out.arbres.push({x:x,y:hh-.05,z:z,h:2.4+r()*1.6,pin:true});
      }else if(mm>-.05&&mm<.85&&r()<.8){if(r()<.75)out.roseaux.push({x:x,y:-.11+NIV.marais+.25,z:z,sx:.09+r()*.06,sy:.7+r()*.7,sz:.09+r()*.06,ry:r()*6.28});else out.nenuphars.push({x:x,y:-.11+NIV.marais+.02,z:z,sx:.5+r()*.4,sy:.5+r()*.4,sz:1,rx:-1.5708});}
      else if(ll>-.4&&ll<-.02&&r()<.06&&dRiv(x,z)>10&&(!window.FOW_GEO_PLAYABLE||!window.FOW_GEO_PLAYABLE.isSea(x,z)))
        out.arbres.push({x:x,y:hh-.05,z:z,h:2.6+r()*1.2,saule:true});
    }
    // Sur les pentes : des rochers et quelques buissons, pour que l'oeil lise les collines.
    for(var k3=0;k3<140;k3++){var xp=x0+r()*64,zp=z0+r()*64;if(echant(R.L,xp,zp)>-.4||echant(R.M,xp,zp)>-.3||echant(R.F,xp,zp)>-.05)continue;
      var gx3=echant(R.H,xp-2,zp)-echant(R.H,xp+2,zp),gz3=echant(R.H,xp,zp-2)-echant(R.H,xp,zp+2),pe=Math.sqrt(gx3*gx3+gz3*gz3)/4,hp=echant(R.H,xp,zp);
      if(pe>.18&&r()<.5)out.rochers.push({x:xp,y:hp-.1,z:zp,sx:.4+r()*.9,sy:.3+r()*.6,sz:.4+r()*.8,ry:r()*6.28});
      else if(hp>2.5&&r()<.1&&dRiv(xp,zp)>12&&(!window.FOW_GEO_PLAYABLE||!window.FOW_GEO_PLAYABLE.isSea(xp,zp)))
        out.buissons.push({x:xp,y:hp+.25,z:zp,sx:.5+r()*.5,sy:.35+r()*.3,sz:.5+r()*.5});}
    // Les marais, plus touffus : roseaux et nenuphars.
    for(var k2=0;k2<500;k2++){var xm=x0+r()*64,zm=z0+r()*64,mv=echant(R.M,xm,zm);if(mv<-.08||mv>.95)continue;
      if(r()<.8)out.roseaux.push({x:xm,y:-.11+NIV.marais+.45,z:zm,sx:.22+r()*.14,sy:1+r()*.9,sz:.22+r()*.14,ry:r()*6.28});
      else out.nenuphars.push({x:xm,y:-.11+NIV.marais+.02,z:zm,sx:.45+r()*.4,sy:.45+r()*.4,sz:1,rx:-1.5708});}
    return out;
  }
  // L'essence d'un arbre de ressource, selon son terroir.
  function essence(n){
    var t=courant&&courant.terroirs?courant.terroirs[n.sectorId]:null,u=((n.x*7+n.z*13)|0)&3;
    if(t==='causses')return u<3?'pin':'chene';
    if(t==='ruffes')return u<2?'olivier':'pin';
    if(t==='rives')return u<2?'saule':'chene';
    if(t==='prairie')return u<1?'bouleau':'chene';
    return 'chene';
  }

  /* ---- l'atlas peint (18/10) : relief ombre, eaux, roches, contrees nommees ------ */
  var PEINT={vallee:[156,154,98],foret:[78,104,58],prairie:[150,170,88],causses:[168,163,146],ruffes:[170,84,58],rives:[112,150,100]};
  var cachePeint=new Map();
  function peint(game,w,hh){
    var cle=w+'x'+hh,c=cachePeint.get(cle);
    if(c&&c.game===game)return c;
    var R=relief(),col=new Uint8ClampedArray(w*hh*3);
    // Les teintes des terroirs sur une grille de 6 m, puis interpolees : bien plus rapide sur telephone.
    if(!game._fowTeintes){var TN=129,TT=new Float32Array(TN*TN*3);
      for(var tz=0;tz<TN;tz++)for(var tx=0;tx<TN;tx++){var pp=poids(game,tx*6,tz*6),o2=(tz*TN+tx)*3,r1=156,g1=154,b1=98;
        if(pp){r1=g1=b1=0;for(var k in pp){var P=PEINT[k]||PEINT.vallee;r1+=P[0]*pp[k];g1+=P[1]*pp[k];b1+=P[2]*pp[k];}}var SLp=window.FOW_GEO_PLAYABLE&&window.FOW_GEO_PLAYABLE.byId&&window.FOW_GEO_PLAYABLE.byId.salagou;if(SLp){var kr=(1-lisse(62,118,Math.hypot(tx*6-SLp.x,tz*6-SLp.z)))*.86,PR=PEINT.ruffes||[170,86,60];r1=r1*(1-kr)+PR[0]*kr;g1=g1*(1-kr)+PR[1]*kr;b1=b1*(1-kr)+PR[2]*kr;}TT[o2]=r1;TT[o2+1]=g1;TT[o2+2]=b1;}
      game._fowTeintes=TT;}
    var TE=game._fowTeintes;
    for(var py=0;py<hh;py++)for(var px=0;px<w;px++){
      var x=(px+.5)*768/w,z=(py+.5)*768/hh,o=(py*w+px)*3,qx=Math.min(127.999,x/6),qz=Math.min(127.999,z/6),ix0=Math.floor(qx),iz0=Math.floor(qz),fx0=qx-ix0,fz0=qz-iz0,j=(iz0*129+ix0)*3,
          w00=(1-fx0)*(1-fz0),w10=fx0*(1-fz0),w01=(1-fx0)*fz0,w11=fx0*fz0,
          r=TE[j]*w00+TE[j+3]*w10+TE[j+387]*w01+TE[j+390]*w11,g=TE[j+1]*w00+TE[j+4]*w10+TE[j+388]*w01+TE[j+391]*w11,b=TE[j+2]*w00+TE[j+5]*w10+TE[j+389]*w01+TE[j+392]*w11;
      if(R){
        var l=echant(R.L,x,z),m=echant(R.M,x,z),f=echant(R.F,x,z),H0=echant(R.H,x-3,z-3),H1=echant(R.H,x+3,z+3);
        var sh=1+(H0-H1)*.07;sh=sh<.6?.6:sh>1.32?1.32:sh;r*=sh;g*=sh;b*=sh;
        if(f>-.08){var kf=lisse(-.08,.25,f);r=r*(1-kf)+122*kf*sh;g=g*(1-kf)+112*kf*sh;b=b*(1-kf)+98*kf*sh;}
        if(m>-.1){var km=lisse(-.1,.1,m);r=r*(1-km)+92*km;g=g*(1-km)+102*km;b=b*(1-km)+70*km;}
        if(l>-.25&&l<=0){var ks=lisse(-.25,0,l)*.6;r=r*(1-ks)+214*ks;g=g*(1-ks)+196*ks;b=b*(1-ks)+140*ks;}
        if(l>0){var kl=lisse(0,.5,l);r=86-22*kl;g=150-26*kl;b=168-14*kl;}
      }
      var dr=dRiv(x,z);
      var GPa=window.FOW_GEO_PLAYABLE;
      if(GPa&&GPa.isSea&&GPa.isSea(x,z)){var kd=Math.min(1,(z-GPa.coastZ(x))/40);r=78-18*kd;g=142-22*kd;b=166-6*kd;}
      else if(GPa&&GPa.isBeach&&GPa.isBeach(x,z)){r=r*.35+214*.65;g=g*.35+196*.65;b=b*.35+150*.65;}
      if(dr<6.5){r=70;g=134;b=156;}else if(dr<8.5){var kb=.5;r=r*(1-kb)+214*kb;g=g*(1-kb)+196*kb;b=b*(1-kb)+140*kb;}
      // Le grain du papier.
      var gr=(hash(px,py,7)-.5)*14;col[o]=r+gr;col[o+1]=g+gr;col[o+2]=b+gr*.8;
    }
    c={game:game,col:col};cachePeint.set(cle,c);return c;
  }
  // Couleur d'un pixel de l'atlas (vu = 2, connu = 1).
  function carteCouleur(game,i,w,hh,visible){
    var c=peint(game,w,hh),o=i*3,k=visible?1:.58;
    return [c.col[o]*k,c.col[o+1]*k,c.col[o+2]*(visible?1:.62)];
  }
  // Par-dessus, sur le grand atlas : les arbres, les rochers, les noms des contrees, la rose des vents.
  function atlasDecor(ctx,w,hh,game,fog,large){
    if(!large)return;
    var SX=w/768,SZ=hh/768,R=relief();
    function connu(x,z){if(!fog)return true;var ix=Math.floor(x/2),iz=Math.floor(z/2);return ix>=0&&iz>=0&&ix<384&&iz<384&&fog[iz*384+ix]>0;}
    ctx.save();
    // Les forets : de petits arbres dessines la ou pousse le bois.
    for(var n=0;n<game.nodes.length;n++){
      var N=game.nodes[n];if(N.type!=='wood'||!connu(N.x,N.z))continue;
      var x=N.x*SX,z=N.z*SZ,e=essence(N);
      ctx.fillStyle=e==='pin'?'#2f4a32':e==='olivier'?'#6f7d55':'#3e5e36';
      ctx.beginPath();
      if(e==='pin'){ctx.moveTo(x,z-4.2);ctx.lineTo(x+2.6,z+1.6);ctx.lineTo(x-2.6,z+1.6);}else ctx.arc(x,z-1,2.5,0,6.283);
      ctx.fill();ctx.fillStyle='#4a3826';ctx.fillRect(x-.5,z+1.4,1,1.8);
    }
    // Les 31 reperes : memes localisations que le continent 3D.
    var GP=window.FOW_GEO_PLAYABLE;
    if(GP&&GP.sites){
      var labelsGeo=[];
      for(var gi=0;gi<GP.sites.length;gi++){
        var gp=GP.sites[gi];if(!connu(gp.x,gp.z))continue;
        var gx0=gp.x*SX,gz0=gp.z*SZ;
        ctx.beginPath();
        ctx.fillStyle=gp.kind==='pont'?'#e9c77b':gp.kind==='lac'?'#5a9ab0':gp.kind==='port'?'#7ab4c4':'#eee1bd';
        ctx.strokeStyle='rgba(47,38,28,.8)';ctx.lineWidth=1.2;
        ctx.arc(gx0,gz0,gp.major?2.4:1.5,0,6.283);ctx.fill();ctx.stroke();
        if(!gp.major)continue;
        var nomg=gp.name,fs=Math.max(8,Math.round(w/68));ctx.font='600 '+fs+'px Georgia, serif';
        var tw=ctx.measureText(nomg).width/2+3,lx0=Math.max(tw+2,Math.min(w-tw-2,gx0)),lz0=Math.max(fs+3,Math.min(hh-4,gz0-6));
        var clash=false;
        for(var gl=0;gl<labelsGeo.length;gl++){var LG=labelsGeo[gl];if(Math.abs(LG[0]-lx0)<LG[2]+tw&&Math.abs(LG[1]-lz0)<fs+3){clash=true;break;}}
        if(clash)continue;
        labelsGeo.push([lx0,lz0,tw]);
        ctx.lineWidth=2.5;ctx.strokeStyle='rgba(246,236,211,.88)';ctx.strokeText(nomg,lx0,lz0);
        ctx.fillStyle='rgba(53,40,27,.94)';ctx.fillText(nomg,lx0,lz0);
      }
      // L'Herault porte enfin son nom sur la carte jouable.
      var hz=GP.riverX?560:384,hx=GP.riverX?GP.riverX(hz)+16:430;if(!GP.riverX)hz=GP.riverZ?GP.riverZ(hx):384;
      if(connu(hx,hz)){ctx.save();ctx.translate(hx*SX,hz*SZ);ctx.rotate(GP.riverX?Math.PI/2:-.1);ctx.font='italic 700 '+Math.max(9,Math.round(w/58))+'px Georgia, serif';ctx.fillStyle='rgba(236,244,237,.9)';ctx.strokeStyle='rgba(38,70,72,.8)';ctx.lineWidth=3;ctx.strokeText("L’HÉRAULT",0,-8);ctx.fillText("L’HÉRAULT",0,-8);ctx.restore();}
    }
    // Les falaises : des hachures sombres.
    if(R)for(var f=0;f<(game.reliefs||[]).length;f++){
      var Fe=game.reliefs[f];if(Fe.t!=='falaise')continue;
      for(var c2=0;c2<Fe.c.length;c2++){var C=Fe.c[c2];if(!connu(C[0],C[1]))continue;
        ctx.strokeStyle='rgba(60,50,40,.55)';ctx.lineWidth=1;
        for(var a=0;a<10;a++){var an=a*.628,rx=C[0]+Math.cos(an)*C[2]*.95,rz=C[1]+Math.sin(an)*C[2]*.95;ctx.beginPath();ctx.moveTo(rx*SX,rz*SZ);ctx.lineTo((rx+Math.cos(an)*3)*SX,(rz+Math.sin(an)*3)*SZ);ctx.stroke();}}
    }
    // Les noms des contrees, sur chaque groupe de secteurs du meme terroir deja explore.
    var S=sectorsVue||[],T=game.terroirs||[],vu={},etiq=[];
    ctx.textAlign='center';ctx.font='italic 600 '+Math.round(w/52)+'px Georgia, serif';
    for(var s=0;s<S.length;s++){
      var t=T[S[s].id];if(!t||vu[s])continue;
      var grp=[s],pile=[s];vu[s]=1;
      while(pile.length){var a2=S[pile.pop()];for(var b2=0;b2<S.length;b2++){if(vu[b2]||T[S[b2].id]!==t)continue;var B=S[b2];if(Math.abs(B.col-a2.col)+Math.abs(B.row-a2.row)===1){vu[b2]=1;grp.push(b2);pile.push(b2);}}}
      var gx=0,gz=0,ok=false;for(var q=0;q<grp.length;q++){gx+=S[grp[q]].x;gz+=S[grp[q]].z;if(connu(S[grp[q]].x,S[grp[q]].z))ok=true;}
      if(!ok)continue;gx/=grp.length;gz/=grp.length;
      var nom=(TERROIRS[t]||{}).nom||t,lx=gx*SX,lz=gz*SZ+20*SZ,lw=ctx.measureText(nom).width/2+4,lh=Math.round(w/52)+4,pris2=false;lx=Math.max(lw+2,Math.min(w-lw-2,lx));lz=Math.max(lh,Math.min(hh-6,lz));
      for(var e2=0;e2<etiq.length;e2++){var E=etiq[e2];if(Math.abs(E[0]-lx)<E[2]+lw&&Math.abs(E[1]-lz)<lh)pris2=true;}
      if(pris2){lz+=lh*1.2;pris2=false;for(var e3=0;e3<etiq.length;e3++){var E3=etiq[e3];if(Math.abs(E3[0]-lx)<E3[2]+lw&&Math.abs(E3[1]-lz)<lh)pris2=true;}}
      if(pris2)continue;etiq.push([lx,lz,lw]);
      ctx.lineWidth=3;ctx.strokeStyle='rgba(240,228,196,.8)';ctx.strokeText(nom,lx,lz);
      ctx.fillStyle='rgba(58,40,24,.92)';ctx.fillText(nom,lx,lz);
    }
    // La rose des vents.
    var rx2=w-30,rz2=hh-34,rr=16;ctx.translate(rx2,rz2);ctx.fillStyle='rgba(60,42,26,.85)';
    for(var d=0;d<4;d++){ctx.beginPath();ctx.moveTo(0,-rr);ctx.lineTo(4,0);ctx.lineTo(0,4);ctx.lineTo(-4,0);ctx.closePath();ctx.fill();ctx.rotate(1.5708);}
    ctx.setTransform(1,0,0,1,0,0);ctx.font='bold 10px Georgia, serif';ctx.fillText('N',rx2,rz2-rr-3);
    // Le cadre de parchemin.
    var gr=ctx.createRadialGradient(w/2,hh/2,Math.min(w,hh)*.42,w/2,hh/2,Math.max(w,hh)*.72);
    gr.addColorStop(0,'rgba(60,40,20,0)');gr.addColorStop(1,'rgba(60,40,20,.38)');ctx.fillStyle=gr;ctx.fillRect(0,0,w,hh);
    ctx.strokeStyle='rgba(90,64,36,.8)';ctx.lineWidth=3;ctx.strokeRect(1.5,1.5,w-3,hh-3);
    ctx.restore();
  }

  /* ---- la graine d'une partie solo ---------------------------------------- */
  // Une carte neuve a chaque partie. Le menu montre celle qui vient ; « Fonder » la prend.
  var prochaine=null;
  function graine(prendre){
    if(prochaine==null)prochaine=(Math.floor(Math.random()*2147483646)+1)|0;
    var g=prochaine;if(prendre)prochaine=null;return g;
  }

  window.FOW_CARTE={version:VERSION,terroirs:TERROIRS,peupler:peupler,sol:sol,herbe:herbe,fleurs:fleurs,
    carteCouleur:carteCouleur,connaitreSecteurs:connaitreSecteurs,graine:graine,dominant:dominant,
    h:h,hBat:hBat,normale:normale,solRelief:solRelief,decor:decor,essence:essence,atlasDecor:atlasDecor,
    penteBat:penteBat,get courant(){return courant;}};
})();
