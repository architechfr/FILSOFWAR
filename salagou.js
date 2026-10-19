/* FILS OF WAR - Salagou iconique (19/10/2026)
 * Extension de la carte et du rendu, sans remplacement du moteur.
 * Les ajouts sont deterministes pour le reseau et n'interrompent aucune route.
 */
(function(){
  'use strict';
  var carte=window.FOW_CARTE;
  if(!carte||carte.salagouIconique)return;
  var originalPeupler=carte.peupler,originalDecor=carte.decor,originalAtlas=carte.atlasDecor;
  var version=String(carte.version)+'-salagou-iconique1',SIZE=384,WIDTH=768;
  var FORMES=[
    [-42,-19,24],[-67,-10,18],[-47,-40,19],[-13,-48,21],[18,-49,22],
    [46,-38,21],[65,-14,19],[70,9,18],[46,29,20],[20,46,18],
    [-15,46,19],[-46,27,21],[-70,13,16]
  ];
  function dist2(x,z,e){var dx=x-e.x,dz=z-e.z;return dx*dx+dz*dz;}
  function circleCells(x,z,r){
    var cells=[],a=Math.max(0,Math.floor((x-r)/2)),b=Math.min(SIZE-1,Math.ceil((x+r)/2)),
        c=Math.max(0,Math.floor((z-r)/2)),d=Math.min(SIZE-1,Math.ceil((z+r)/2)),r2=r*r;
    for(var iz=c;iz<=d;iz++)for(var ix=a;ix<=b;ix++){
      var px=ix*2+1,pz=iz*2+1,dx=px-x,dz=pz-z;
      if(dx*dx+dz*dz<=r2)cells.push(iz*SIZE+ix);
    }
    return cells;
  }
  function routesOuvertes(G,api){
    var S=api.SECTORS;if(!S||!S.length)return false;
    var start=S[0],initial=Math.floor(start.z/2)*SIZE+Math.floor(start.x/2);
    if(G[initial])return false;
    var deja=new Uint8Array(G.length),file=new Int32Array(G.length),h=0,t=0;
    file[t++]=initial;deja[initial]=1;
    while(h<t){
      var id=file[h++],x=id%SIZE,z=(id-x)/SIZE;
      var voisins=[x? id-1:-1,x<SIZE-1?id+1:-1,z?id-SIZE:-1,z<SIZE-1?id+SIZE:-1];
      for(var i=0;i<4;i++){
        var j=voisins[i];if(j<0||deja[j]||G[j])continue;
        var px=(j%SIZE)*2+1,pz=Math.floor(j/SIZE)*2+1;
        if(api.terrainAt(px,pz)==='water')continue;
        deja[j]=1;file[t++]=j;
      }
    }
    for(var i=0;i<S.length;i++){
      var q=S[i],k=Math.floor(q.z/2)*SIZE+Math.floor(q.x/2);
      if(!deja[k])return false;
    }
    return true;
  }
  function agrandir(game,api){
    var old=game.reliefs&&game.reliefs.find(function(f){return f.nom==='Lac du Salagou';});
    var center=game.heraultLac,G=game.obstacles;
    if(!old||!center||!G||G.length!==SIZE*SIZE)return;
    var masque=new Uint8Array(G.length),surfaceAvant=0,ajoutes=[],sites=game.sites||[];
    for(var i=0;i<old.c.length;i++){
      var c=old.c[i],liste=circleCells(c[0],c[1],c[2]);
      for(var j=0;j<liste.length;j++)masque[liste[j]]=1;
    }
    for(var n=0;n<G.length;n++)if(masque[n])surfaceAvant++;
    var obstacles=(game.villages||[]).concat(sites,game.herds||[]);
    var sec=api.SECTORS||[];
    // Agrandissement progressif du pourtour du lac existant.
    // Les lobes se superposent au plan d'eau, mais restent libres de gisements.
    var noyaux=old.c.slice(), candidats=[];
    for(var i=0;i<noyaux.length;i++){
      var C=noyaux[i];
      for(var t=0;t<16;t++){
        var ang=t*Math.PI/8,portee=C[2]*(.56+.12*(t%3));
        candidats.push([C[0]+Math.cos(ang)*portee,C[1]+Math.sin(ang)*portee,13+(t%3)*3]);
      }
    }
    for(var f=0;f<candidats.length;f++){
      var P=candidats[f],x=P[0],z=P[1];
      for(var radius=P[2];radius>=7;radius-=2){
        if(x-radius<10||z-radius<12||x+radius>758||z+radius>756)continue;
        // Le lac garde ses distances avec l'Herault : seul le ruisseau les relie.
        var GPr=window.FOW_GEO_PLAYABLE;if(GPr&&GPr.riverDist&&GPr.riverDist(x,z)<radius+50)continue;
        var possible=true;
        for(var b=0;b<obstacles.length&&possible;b++){
          var ent=obstacles[b],free=radius+(ent.radius||3)+3;
          if(dist2(x,z,ent)<free*free)possible=false;
        }
        for(var k=0;k<sec.length&&possible;k++){
          var marge=radius+19;if(dist2(x,z,sec[k])<marge*marge)possible=false;
        }
        for(var m=0;m<game.nodes.length&&possible;m++){
          var item=game.nodes[m],clear=radius+(item.radius||2)+2;
          if(dist2(x,z,item)<clear*clear)possible=false;
        }
        if(!possible)continue;
        var cells=circleCells(x,z,radius),changed=[];
        for(var h=0;h<cells.length;h++){
          var id=cells[h];if(masque[id])continue;
          if(G[id]){possible=false;break;}
          var px=(id%SIZE)*2+1,pz=Math.floor(id/SIZE)*2+1;
          if(api.terrainAt(px,pz)!=='land'){possible=false;break;}
          changed.push(id);
        }
        if(!possible||changed.length<5)continue;
        var relie=false;
        for(var tt=0;tt<cells.length&&!relie;tt++)if(masque[cells[tt]])relie=true;
        if(!relie)continue;
        for(var mm=0;mm<changed.length;mm++)G[changed[mm]]=1;
        if(!routesOuvertes(G,api)){
          for(var un=0;un<changed.length;un++)G[changed[un]]=0;
          continue;
        }
        for(var v=0;v<cells.length;v++)masque[cells[v]]=1;
        old.c.push([x,z,radius]);
        ajoutes.push([x,z,radius]);
        break;
      }
    }
    var surfaceApres=0;for(var p=0;p<G.length;p++)if(masque[p])surfaceApres++;
    var barrage={x:center.x+43,z:center.z+14,length:34};
    game.fowSalagou={
      x:center.x,z:center.z,rayon:Math.max(50,Math.ceil(Math.sqrt(surfaceApres*4/Math.PI))),
      surfaceAvant:surfaceAvant,surfaceApres:surfaceApres,lobes:ajoutes,barrage:barrage,
      sommet:(function(){var G=window.FOW_GEO_PLAYABLE;if(G&&G.nordSud&&G.xy){var q=G.xy(43.8,3.81);return {x:q.x,z:q.z,nom:'Pic Saint-Loup'};}return {x:355,z:83,nom:'Pic Saint-Loup'};})()
    };
    game.heraultLac.rayon=game.fowSalagou.rayon;
  }
  carte.peupler=function(game,api){
    originalPeupler.call(this,game,api);
    agrandir(game,api);
    game.carteVersion=version;
  };
  carte.decor=function(col,row){
    var out=originalDecor.call(this,col,row),g=carte.courant,L=g&&g.fowSalagou;
    if(L&&L.barrage&&Math.floor(L.barrage.x/64)===col&&Math.floor(L.barrage.z/64)===row){
      out.barrage=L.barrage;
    }
    return out;
  };
  carte.atlasDecor=function(ctx,w,h,game,fog,large){
    originalAtlas.apply(this,arguments);
    if(!large||!game||!game.fowSalagou)return;
    var L=game.fowSalagou;
    function vu(x,z){
      if(!fog)return true;
      var ix=Math.floor(x/2),iz=Math.floor(z/2);
      return ix>=0&&iz>=0&&ix<384&&iz<384&&fog[iz*384+ix]>0;
    }
    ctx.save();
    try{
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='bold '+Math.max(11,Math.round(w/43))+'px Georgia, serif';
      if(vu(L.x,L.z)){
        ctx.strokeStyle='rgba(36,57,64,.94)';ctx.lineWidth=3.4;
        ctx.strokeText('LAC DU SALAGOU',L.x*w/768,L.z*h/768);
        ctx.fillStyle='#fff0c5';ctx.fillText('LAC DU SALAGOU',L.x*w/768,L.z*h/768);
      }
      ctx.font='italic bold '+Math.max(9,Math.round(w/57))+'px Georgia, serif';
      if(vu(L.sommet.x,L.sommet.z)){
        ctx.strokeStyle='#1c2225';ctx.lineWidth=2.8;
        ctx.strokeText(L.sommet.nom,L.sommet.x*w/768,L.sommet.z*h/768-13);
        ctx.fillStyle='#faf0cc';ctx.fillText(L.sommet.nom,L.sommet.x*w/768,L.sommet.z*h/768-13);
      }
      if(L.barrage&&vu(L.barrage.x,L.barrage.z)){
        ctx.strokeStyle='#222b33';ctx.lineWidth=2.6;
        ctx.strokeText('Barrage du Salagou',L.barrage.x*w/768,L.barrage.z*h/768+19);
        ctx.fillStyle='#fff2cc';ctx.fillText('Barrage du Salagou',L.barrage.x*w/768,L.barrage.z*h/768+19);
      }
    }finally{ctx.restore();}
  };
  carte.version=version;
  carte.salagouIconique=true;
  window.FOW_SALAGOU={version:version};
})();