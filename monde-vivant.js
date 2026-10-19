/* FILS OF WAR - Monde vivant v1 - 19/10/2026.
 * Extension additive : remplit les terres entre les secteurs sans changer le moteur.
 * Les lieux sont des sites du moteur existant ; aucun nouveau type inconnu.
 * Toute la simulation est issue de la graine, jamais de Math.random().
 * Le décor ne change ni les collisions ni les ordres.
 */
(function(){
  'use strict';
  var carte=window.FOW_CARTE;
  if(!carte||carte.mondeVivant)return;
  var originalPeupler=carte.peupler, originalDecor=carte.decor;
  var secteurs=null,version=String(carte.version)+'-vivant1';
  var PROFILS={
    vallee:[['food',39],['wood',77],['stone',94],['gold',100]],
    foret:[['wood',59],['food',83],['stone',96],['gold',100]],
    prairie:[['food',46],['wood',78],['stone',94],['gold',100]],
    causses:[['stone',47],['wood',68],['food',88],['gold',100]],
    ruffes:[['stone',29],['gold',49],['wood',77],['food',100]],
    rives:[['wood',42],['food',82],['stone',96],['gold',100]]
  };
  // Une graine de tuile est indépendante de la séquence du moteur et de la carte de base.
  function hash(a,b,s){
    var h=Math.imul(a|0,374761393)^Math.imul(b|0,668265263)^Math.imul(s|0,2246822519);
    h=Math.imul(h^(h>>>13),1274126177);
    return (h^(h>>>16))>>>0;
  }
  function hasard(s){var k=s>>>0;return function(){k=(k+0x6d2b79f5)|0;var t=Math.imul(k^(k>>>15),1|k);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}
  function dist2(x,z,p){var dx=x-p.x,dz=z-p.z;return dx*dx+dz*dz;}
  function voisin(x,z,S){
    var best=null,d=Infinity;
    for(var i=0;i<S.length;i++){var dd=dist2(x,z,S[i]);if(dd<d){best=S[i];d=dd;}}
    return best;
  }
  function tirageType(b,r){
    var p=PROFILS[b]||PROFILS.prairie,k=r()*100;
    for(var i=0;i<p.length;i++)if(k<p[i][1])return p[i][0];
    return 'wood';
  }
  function sourcePour(b,type,r){
    if(type==='food'&&(b==='prairie'||b==='vallee'||b==='ruffes')&&r()<.35)return 'vine';
    return undefined; // sources reconnues nativement : baies, arbres, pierre, or.
  }
  function placeLibre(game,api,x,z,ray,centres,extra){
    if(x<12||z<12||x>756||z>756)return false;
    var marge=ray+3;
    if(api.terrainAt(x,z)!=='land'||api.terrainAt(x-marge,z)!=='land'||
       api.terrainAt(x+marge,z)!=='land'||api.terrainAt(x,z-marge)!=='land'||
       api.terrainAt(x,z+marge)!=='land')return false;
    for(var i=0;i<centres.length;i++)if(dist2(x,z,centres[i])<centres[i].ray*centres[i].ray)return false;
    var groupes=[game.nodes||[],game.villages||[],game.sites||[],game.herds||[],extra||[]];
    for(var g=0;g<groupes.length;g++)for(var j=0;j<groupes[g].length;j++){
      var e=groupes[g][j],ecart=ray+(e.radius||2)+(g===3?10:g===2?7:5);
      if(dist2(x,z,e)<ecart*ecart)return false;
    }
    return true;
  }
  function enrichir(game,api){
    if(!api||!api.SECTORS||typeof api.addNode!=='function')return;
    secteurs=api.SECTORS;
    var G=api.SECTORS;
    var depart=G[game.startRegion]||G[18],loin=G.slice().sort(function(a,b){
      return dist2(b.x,b.z,depart)-dist2(a.x,a.z,depart)||a.id-b.id;
    })[0];
    var centres=G.map(function(s){return {x:s.x,z:s.z,ray:s.id===depart.id||s.id===loin.id?43:25};});
    // Découvertes distantes des camps : un lieu notable environ tous les 3 secteurs.
    // Chaque lieu utilise les règles d'un site existant (soins, vision, revenu).
    var tresors=[
      {nom:'Le Bois des Mille Chenes',region:'Campawood',site:'spring',biome:'foret'},
      {nom:'Le Belvedere des Aigles',region:'Causses',site:'menhir',biome:'causses'},
      {nom:'Les Ruines des Orpailleurs',region:'Salagou',site:'mine',biome:'ruffes'},
      {nom:'La Fontaine des Bergers',region:'Prairies',site:'spring',biome:'prairie'},
      {nom:'Les Roches des Veilleurs',region:'Herault',site:'menhir',biome:'rives'}
    ];
    var ajoutes=[],places=game.sites||[];
    if(typeof api.addSite==='function'){
      for(var t=0;t<tresors.length;t++){
        var T=tresors[t],candidats=G.filter(function(s){
          return game.terroirs[s.id]===T.biome&&dist2(s.x,s.z,depart)>95*95&&dist2(s.x,s.z,loin)>95*95;
        }),proposition=null;
        for(var c=0;c<candidats.length&&!proposition;c++){
          var sec=candidats[(c+hash(t,game.seed,73))%candidats.length];
          var rd=hasard(hash(sec.id,t,game.seed));
          for(var e=0;e<18&&!proposition;e++){
            var a=rd()*Math.PI*2,d=36+rd()*19,x=sec.x+Math.cos(a)*d,z=sec.z+Math.sin(a)*d;
            if(!placeLibre(game,api,x,z,4,centres,ajoutes))continue;
            var ok=true;
            for(var u=0;u<places.length;u++)if(dist2(x,z,places[u])<90*90)ok=false;
            for(var v=0;v<ajoutes.length;v++)if(dist2(x,z,ajoutes[v])<90*90)ok=false;
            // Chemin simple vers le centre : pas de site coupe par un lac.
            for(var m=1;m<12&&ok;m++){
              var fx=x+(sec.x-x)*m/12,fz=z+(sec.z-z)*m/12;
              if(api.terrainAt(fx,fz)==='water')ok=false;
            }
            if(ok)proposition={x:x,z:z,nom:T.nom,region:T.region,site:T.site};
          }
        }
        if(proposition){
          api.addSite(T.site,proposition.x,proposition.z,T.nom);
          ajoutes.push(proposition);
          if(Array.isArray(game.heraultLieux))game.heraultLieux.push(proposition);
        }
      }
    }
    // Le problème observé : des secteurs riches en leur centre, mais 144 tuiles
    // avec d'immenses couloirs vides. Deux à trois gisements par tuile de 64 m,
    // dans les interstices des secteurs, avec une économie adaptée au biome.
    var ajouts=0,parTuile=[],parBiome={},parType={};
    for(var tz=0;tz<12;tz++)for(var tx=0;tx<12;tx++){
      var s=voisin(tx*64+32,tz*64+32,G),b=game.terroirs[s.id]||'prairie';
      var rnd=hasard(hash(tx,tz,game.seed^0x4a5d9bc1));
      var cible=(b==='foret'||b==='rives'?3:2)+(rnd()<.42?1:0),fait=0;
      for(var k=0;k<cible;k++){
        var type=tirageType(b,rnd),ray=type==='stone'?2.1:1.8,ok=false;
        for(var a2=0;a2<25;a2++){
          var x2=tx*64+8+rnd()*48,z2=tz*64+8+rnd()*48;
          if(!placeLibre(game,api,x2,z2,ray,centres,[]))continue;
          var src=sourcePour(b,type,rnd),quantite=type==='gold'?540:type==='stone'?740:type==='wood'?460:520;
          api.addNode(type,x2,z2,quantite,ray,src,s.id);
          ajouts++;fait++;parType[type]=(parType[type]||0)+1;parBiome[b]=(parBiome[b]||0)+1;ok=true;break;
        }
        // Les couloirs près des rivières et des reliefs peuvent rester dégagés.
        if(!ok)continue;
      }
      parTuile.push(fait);
    }
    game.fowMondeVivant={ressources:ajouts,parTuile:parTuile,parBiome:parBiome,parType:parType,sites:ajoutes.length};
  }
  carte.peupler=function(game,api){
    originalPeupler.call(this,game,api);
    enrichir(game,api);
    game.carteVersion=version;
  };

  // Habillage non bloquant des 144 tuiles. Buissons et pierres instanciés ;
  // arbres plus rares pour préserver le nombre de maillages sur mobile.
  carte.decor=function(col,row){
    var out=originalDecor.call(this,col,row),game=carte.courant;
    if(!game||!game.terroirs||!secteurs)return out;
    var s=voisin(col*64+32,row*64+32,secteurs),b=game.terroirs[s.id]||'prairie';
    var dens={vallee:[4,27,7],foret:[10,60,5],prairie:[4,38,5],
              causses:[2,21,23],ruffes:[2,26,20],rives:[7,54,7]}[b]||[4,32,8];
    var r=hasard(hash(col,row,game.seed^0x2f18d3e7)), x0=col*64,z0=row*64;
    function admissible(x,z,grand){
      if(x<9||z<9||x>759||z>759)return false;
      var ix=Math.floor(x/2),iz=Math.floor(z/2);
      if(game.obstacles&&game.obstacles[iz*384+ix])return false;
      if(Math.abs(z-(384+Math.sin(x*.018)*18))<10)return false;
      // Les centres constructibles sont dégagés.
      for(var i=0;i<secteurs.length;i++)if(dist2(x,z,secteurs[i])<(grand?31*31:23*23))return false;
      return true;
    }
    var focus=[];
    for(var f=0;f<9;f++)focus.push({x:x0+6+r()*52,z:z0+6+r()*52});
    function point(){
      var P=focus[Math.floor(r()*focus.length)];
      return {x:Math.max(x0+3,Math.min(x0+61,P.x+(r()-.5)*18)),
              z:Math.max(z0+3,Math.min(z0+61,P.z+(r()-.5)*18))};
    }
    for(var i=0;i<dens[1]*2;i++){
      if(out.buissons.length>dens[1]+40)break;
      var p=point();if(!admissible(p.x,p.z,false))continue;
      var h=carte.h(p.x,p.z);
      out.buissons.push({x:p.x,y:h+.22,z:p.z,
        sx:.28+r()*.55,sy:.22+r()*.39,sz:.3+r()*.55});
    }
    for(var j=0;j<dens[2]*2;j++){
      if(j>=dens[2])break;
      var p2=point();if(!admissible(p2.x,p2.z,false))continue;
      var y=carte.h(p2.x,p2.z);
      out.rochers.push({x:p2.x,y:y-.09,z:p2.z,sx:.37+r()*1.3,sy:.22+r()*.75,sz:.35+r()*1.4,ry:r()*6.28});
    }
    var arbres=0;
    for(var k=0;k<dens[0]*3&&arbres<dens[0];k++){
      var p3=point();if(!admissible(p3.x,p3.z,true))continue;
      var libre=true;
      for(var q=0;q<(game.nodes||[]).length&&libre;q++)if(dist2(p3.x,p3.z,game.nodes[q])<24)libre=false;
      if(!libre)continue;
      out.arbres.push({x:p3.x,y:carte.h(p3.x,p3.z)-.05,z:p3.z,h:2.7+r()*2.1,
        pin:b==='causses'||b==='ruffes'||b==='foret'?r()<.82:r()<.2,
        saule:b==='rives'||b==='vallee'});
      arbres++;
    }
    // Parcelles de vignes bien alignées : identifiable dès la caméra.
    if((b==='prairie'||b==='vallee')&&hash(col,row,game.seed)%7===0){
      var bx=x0+12,bz=z0+12;
      for(var vr=0;vr<4;vr++)for(var vc=0;vc<8;vc++){
        var xv=bx+vc*5.3,zv=bz+vr*9.2;
        if(!admissible(xv,zv,false))continue;
        out.buissons.push({x:xv,y:carte.h(xv,zv)+.19,z:zv,sx:.45,sy:.28,sz:.42});
      }
    }
    return out;
  };

  // Palette plus végétale : le Causse garde sa roche, sans nappe blanchâtre.
  carte.terroirs.causses.a=0x8b9477;
  carte.terroirs.causses.b=0x727f64;
  carte.terroirs.vallee.a=0x839d55;
  carte.terroirs.vallee.b=0x71894a;
  carte.version=version;
  carte.mondeVivant=true;
  window.FOW_MONDE_VIVANT={version:version};
})();
