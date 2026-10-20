/* FILS OF WAR - territoires de l'Herault - extension additive (19/10/2026).
 * S'appuie sur carte.js et les sites 3D existants. Aucun moteur remplace.
 * Les noms sont des inspirations geographiques, pas une carte cadastrale.
 */
(function () {
  'use strict';
  var carte = window.FOW_CARTE;
  if (!carte || carte.herault) return;

  // Types autorises par le moteur : source (soins), mine (revenu), menhir (vision).
  // Pas de fausse mer dans la carte actuelle : le littoral viendra avec l'extension du monde.
  var LIEUX = Object.freeze([
    {nom:'Les Sources de Campagnan', site:'spring', x:344, z:305, region:'Campagnan'},
    {nom:'Les Menhirs de Belarga', site:'menhir', x:453, z:460, region:'Belarga'},
    {nom:'La Mine des Ruffes du Salagou', site:'mine', x:158, z:148, region:'Salagou'},
    {nom:'Le Belvedere des Gorges', site:'menhir', x:611, z:156, region:'Gorges de l\'Herault'},
    {nom:'La Source du Salagou', site:'spring', x:232, z:230, region:'Salagou'},
    {nom:'L\'Ancienne Mine des Causses', site:'mine', x:571, z:602, region:'Causses'}
  ]);
  var DIRECTIONS = [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
  var origine = carte.peupler;
  var atlasAvant = carte.atlasDecor;
  var version = String(carte.version) + '-herault3';

  // Sur la carte nord-sud, chaque lieu suit son repere geographique (decalage en metres).
  var ANCRES={'Les Sources de Campagnan':['campagnan',22,-18],'Les Menhirs de Belarga':['belarga',26,8],
    'La Mine des Ruffes du Salagou':['salagou',46,58],'Le Belvedere des Gorges':['gorges',-30,6],
    'La Source du Salagou':['salagou',-38,-62],'L\'Ancienne Mine des Causses':['lodeve',-26,-52]};
  function placeLieu(l){
    var G=window.FOW_GEO_PLAYABLE,a=ANCRES[l.nom],B=G&&G.nordSud&&a&&G.byId[a[0]];
    if(!B)return l;
    return {nom:l.nom,site:l.site,region:l.region,x:B.x+a[1],z:B.z+a[2]};
  }
  function distance2(a,b){var x=a.x-b.x,z=a.z-b.z;return x*x+z*z;}

  function peutPoser(game, api, pos, camps) {
    var x=pos.x,z=pos.z;
    if (x<24 || z<24 || x>744 || z>744) return false;
    for (var k=0;k<9;k++) {
      var dx=(k%3-1)*5, dz=(Math.floor(k/3)-1)*5;
      if (api.terrainAt(x+dx,z+dz)!=='land') return false;
    }
    for (var i=0;i<camps.length;i++)if(distance2(pos,camps[i])<75*75)return false;
    var proches=[game.nodes||[],game.villages||[],game.sites||[],game.herds||[]];
    for(var j=0;j<proches.length;j++)for(var t=0;t<proches[j].length;t++){
      var p=proches[j][t],r=(p.radius||3)+(j===3?10:9);
      if(distance2(pos,p)<r*r)return false;
    }
    // Un nouveau lieu doit rester directement accessible depuis son secteur.
    var secteurs=api.SECTORS||[],proche=null,d=Infinity;
    for(var q=0;q<secteurs.length;q++){
      var c=distance2(pos,secteurs[q]);if(c<d){d=c;proche=secteurs[q];}
    }
    if(!proche)return false;
    var steps=Math.ceil(Math.sqrt(d)/2);
    for(var n=1;n<steps;n++){
      var u=n/steps;
      if(api.terrainAt(x+(proche.x-x)*u,z+(proche.z-z)*u)==='water')return false;
    }
    return true;
  }

  function trouver(game,api,lieu,camps,seed) {
    // Positions reproductibles. Aucun appel a game.random() ni a Math.random().
    var debut=(seed>>>0)%DIRECTIONS.length;
    for(var rayon=0;rayon<=54;rayon+=9){
      for(var i=0;i<DIRECTIONS.length;i++){
        var d=DIRECTIONS[(i+debut)%DIRECTIONS.length];
        var p={x:lieu.x+d[0]*rayon,z:lieu.z+d[1]*rayon};
        if(peutPoser(game,api,p,camps))return p;
      }
    }
    return null; // pas de site artificiellement pose dans l'eau ou sur un village
  }


  // Le Salagou devient une vraie etendue d'eau du moteur : obstacle au sol,
  // rendu aquatique 3D et bordures integres aux memes reliefs que carte.js.
  // Si aucun emplacement ne preserve les ressources et les voies, rien n'est pose.
  function poserLacSalagou(game, api) {
    var G=game.obstacles, F=game.reliefs;
    if(!G || G.length!==384*384 || !Array.isArray(F) || !api.SECTORS)return null;
    for(var dj=0;dj<F.length;dj++)if(F[dj].nom==='Lac du Salagou'){var c0=F[dj].c[0];return {x:c0[0],z:c0[1],rayon:50};}
    var origines=[[195,202],[223,206],[162,201],[231,174],[159,227],[266,207]];
    // 19/10 soir : le lac est au vrai Salagou de la carte nord-sud, entoure de ses ruffes rouges.
    var GPl=window.FOW_GEO_PLAYABLE,SLl=GPl&&GPl.nordSud&&GPl.byId&&GPl.byId.salagou;
    if(SLl)origines=[[SLl.x,SLl.z],[SLl.x+8,SLl.z-8],[SLl.x-8,SLl.z+6],[SLl.x+12,SLl.z+10],[SLl.x-14,SLl.z-10],[SLl.x+4,SLl.z+18]];
    var formes=[[0,0,32],[-18,5,19],[19,-9,19],[10,19,15]];
    var encombrants=[game.nodes||[],game.villages||[],game.sites||[],game.herds||[]];
    for(var n=0;n<origines.length;n++){
      var cx=origines[n][0],cz=origines[n][1],centres=[],indices=[],vu=new Uint8Array(G.length),ok=true;
      for(var c=0;c<formes.length;c++){
        var f=formes[c];centres.push([cx+f[0],cz+f[1],f[2]]);
      }
      for(var s=0;s<api.SECTORS.length&&ok;s++){
        if(distance2({x:cx,z:cz},api.SECTORS[s])<49*49)ok=false;
      }
      for(var g=0;g<encombrants.length&&ok;g++)for(var e=0;e<encombrants[g].length&&ok;e++){
        var ent=encombrants[g][e],pr=(ent.radius||2)+8;
        for(var cf=0;cf<centres.length;cf++){
          var cer=centres[cf];
          if(distance2(ent,{x:cer[0],z:cer[1]})<(pr+cer[2])*(pr+cer[2])){ok=false;break;}
        }
      }
      if(!ok)continue;
      for(var h=0;h<centres.length&&ok;h++){
        var C=centres[h],r=C[2],x0=Math.max(0,Math.floor((C[0]-r-2)/2)),x1=Math.min(383,Math.floor((C[0]+r+2)/2));
        var z0=Math.max(0,Math.floor((C[1]-r-2)/2)),z1=Math.min(383,Math.floor((C[1]+r+2)/2));
        for(var z=z0;z<=z1&&ok;z++)for(var x=x0;x<=x1;x++){
          var xx=x*2+1,zz=z*2+1,dd=(xx-C[0])*(xx-C[0])+(zz-C[1])*(zz-C[1]);
          if(dd>(r+2)*(r+2))continue;
          var ix=z*384+x;
          if(G[ix]||api.terrainAt(xx,zz)!=='land'){ok=false;break;}
          if(dd<=r*r&&!vu[ix]){vu[ix]=1;indices.push(ix);}
        }
      }
      if(!ok||indices.length<150)continue;
      for(var t=0;t<indices.length;t++)G[indices[t]]=1;
      if(!secteursAccessibles(api,G)){
        for(var undo=0;undo<indices.length;undo++)G[indices[undo]]=0;
        continue;
      }
      F.push({t:'lac',c:centres,sec:-1,nom:'Lac du Salagou'});
      return {x:cx,z:cz,rayon:50};
    }
    return null;
  }

  function secteursAccessibles(api,G){
    // BFS 4 directions a 2 m ; ponts existants conserves, aucun secteur isole.
    var start=api.SECTORS[0],origin=Math.floor(start.z/2)*384+Math.floor(start.x/2);
    var queue=new Int32Array(384*384),visited=new Uint8Array(384*384),head=0,tail=0;
    if(G[origin])return false;
    queue[tail++]=origin;visited[origin]=1;
    while(head<tail){
      var k=queue[head++],x=k%384,z=(k-x)/384;
      var nb=[x>0?k-1:-1,x<383?k+1:-1,z>0?k-384:-1,z<383?k+384:-1];
      for(var d=0;d<4;d++){
        var j=nb[d];if(j<0||visited[j]||G[j])continue;
        var nx=j%384,nz=(j-nx)/384;
        if(api.terrainAt(nx*2+1,nz*2+1)==='water')continue;
        visited[j]=1;queue[tail++]=j;
      }
    }
    for(var i=0;i<api.SECTORS.length;i++){
      var p=api.SECTORS[i],ix=Math.floor(p.z/2)*384+Math.floor(p.x/2);
      if(!visited[ix])return false;
    }
    return true;
  }

  // De nouvelles ressources a exploiter avec les outils et modeles existants.
  function ressourceLocale(game,api,x,z,type,source,quantite,rang){
    var candidats=[[18,0],[-18,0],[0,18],[0,-18],[25,10],[-25,10],[25,-10],[-25,-10],[36,0],[-36,0],[0,36],[0,-36],[30,24],[-30,-24]];
    var depart=(rang*5+(game.seed|0))>>>0;
    var camps=api.SECTORS||[];
    for(var i=0;i<candidats.length;i++){
      var d=candidats[(i+depart)%candidats.length],px=x+d[0],pz=z+d[1],p={x:px,z:pz};
      if(px<15||pz<15||px>753||pz>753)continue;
      if(api.terrainAt(px,pz)!=='land'||api.terrainAt(px+4,pz)!=='land'||api.terrainAt(px-4,pz)!=='land'||api.terrainAt(px,pz+4)!=='land'||api.terrainAt(px,pz-4)!=='land')continue;
      var libre=true;
      // Ne pas surcharger le coeur constructible d'un secteur.
      for(var s=0;s<camps.length&&libre;s++)if(distance2(p,camps[s])<13*13)libre=false;
      var groups=[game.nodes||[],game.villages||[],game.sites||[],game.herds||[]];
      for(var g=0;g<groups.length&&libre;g++)for(var j=0;j<groups[g].length;j++){
        var q=groups[g][j],ray=(q.radius||3)+7;
        if(distance2(p,q)<ray*ray){libre=false;break;}
      }
      if(!libre)continue;
      var sec=null,min=Infinity;
      for(var ss=0;ss<camps.length;ss++){
        var ds=distance2(p,camps[ss]);if(ds<min){min=ds;sec=camps[ss];}
      }
      api.addNode(type,px,pz,quantite,type==='stone'?2.7:1.8,source,sec?sec.id:null);
      return true;
    }
    return false;
  }

  function peuplerRessourcesLocales(game,api,lieux,lac){
    if(typeof api.addNode!=='function')return;
    var profiles={
      'Campagnan':[['food','vine',570],['food','vine',480],['wood','tree',500]],
      'Belarga':[['food','vine',540],['wood','tree',450]],
      'Salagou':[['gold','biggold',1400],['stone','bigstone',1300]],
      'Gorges de l\'Herault':[['wood','tree',550],['stone','bigstone',950]],
      'Causses':[['stone','bigstone',1700],['wood','tree',500]]
    };
    for(var i=0;i<lieux.length;i++){
      var p=lieux[i],items=profiles[p.region]||[];
      for(var j=0;j<items.length;j++)ressourceLocale(game,api,p.x,p.z,items[j][0],items[j][1],items[j][2],i*13+j);
    }
    if(lac)for(var k=0;k<3;k++)ressourceLocale(game,api,lac.x,lac.z,'food','fish',440,k+37);
  }

  function suivreDecouvertes(game){
    if(typeof game._updateFog!=='function'||typeof game.isExplored!=='function'||typeof game._event!=='function')return;
    var maj=game._updateFog,connus=[Object.create(null),Object.create(null)];
    game._updateFog=function(){
      var ret=maj.apply(this,arguments),lieux=this.heraultLieux||[];
      for(var owner=0;owner<Math.min(2,this.players.length);owner++){
        for(var i=0;i<lieux.length;i++){
          var p=lieux[i],id=p.nom;
          if(!connus[owner][id]&&this.isExplored(owner,p.x,p.z)){
            connus[owner][id]=true;
            this._event('notice',{owner:owner,x:p.x,z:p.z,text:'Exploration : '+p.nom+' decouvert. Repere ce lieu sur l\'atlas et envoie tes hommes.'});
          }
        }
      }
      return ret;
    };
  }

  carte.peupler=function(game,api){
    origine.call(this,game,api);
    // On complete la carte deja generee : pas de reinitialisation des regles.
    var lac=poserLacSalagou(game,api);
    game.heraultLieux=[];
    if(!api || typeof api.addSite!=='function')return;
    var start=(api.SECTORS||[])[game.startRegion],autre=null,loin=-1;
    if(start)for(var i=0;i<api.SECTORS.length;i++){
      var dist=distance2(api.SECTORS[i],start);
      if(dist>loin){loin=dist;autre=api.SECTORS[i];}
    }
    var camps=[start,autre].filter(Boolean);
    for(var j=0;j<LIEUX.length;j++){
      var lieu=placeLieu(LIEUX[j]),p=trouver(game,api,lieu,camps,(game.seed|0)+j*7919);
      if(!p)continue;
      api.addSite(lieu.site,p.x,p.z,lieu.nom);
      game.heraultLieux.push({nom:lieu.nom,region:lieu.region,site:lieu.site,x:p.x,z:p.z});
    }
    peuplerRessourcesLocales(game,api,game.heraultLieux,lac);
    suivreDecouvertes(game);
    game.heraultLac=lac;
    game.carteVersion=version;
  };

  // Toponymes sur l'atlas du jeu, uniquement apres exploration du terrain.
  // Ne remplace pas l'atlas et ne revele aucun point derriere le brouillard.
  carte.atlasDecor=function(ctx,w,h,game,fog,large){
    if(typeof atlasAvant==='function')atlasAvant.apply(this,arguments);
    if(!large || !game || !game.heraultLieux || !ctx)return;
    ctx.save();
    try {
      ctx.textAlign='center';ctx.textBaseline='bottom';
      ctx.font='italic 500 '+Math.max(8,Math.min(11,Math.round(w/64)))+'px Georgia, serif';
      ctx.lineWidth=2.6;ctx.strokeStyle='rgba(16,24,23,.85)';ctx.fillStyle='#f2deb0';
      for(var i=0;i<game.heraultLieux.length;i++){
        var p=game.heraultLieux[i],cx=Math.floor(p.x/2),cz=Math.floor(p.z/2);
        if(fog && !(fog[cz*384+cx]>0))continue;
        var xx=p.x*w/768,zz=p.z*h/768-9;
        if(xx<45||xx>w-45||zz<16||zz>h-10)continue;
        // 20/10 : le nom du lieu, pas celui d'une region qui n'est pas la (« Campawood » pres du Pic...).
        ctx.strokeText(p.nom,xx,zz);ctx.fillText(p.nom,xx,zz);
      }
    } finally {ctx.restore();}
  };
  carte.version=version;
  carte.herault=true;
  window.FOW_HERAULT={version:version,lieux:LIEUX};
})();