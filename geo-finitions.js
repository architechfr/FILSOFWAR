/* FILS OF WAR - finitions de la carte nord-sud (20/10/2026).
 * Derniere couche, chargee apres toutes les autres : rien ne pousse dans la mer,
 * ni dans le fleuve, et la plage reste du sable (pas d'arbre ni de gisement dessus).
 * Deterministe : on retire, on n'ajoute rien, dans le meme ordre sur les deux telephones.
 */
(function(){
  'use strict';
  var carte=window.FOW_CARTE,G=window.FOW_GEO_PLAYABLE;
  if(!carte||!G||!G.nordSud||carte.geoFinitions)return;
  var originalPeupler=carte.peupler,originalDecor=carte.decor;

  function mouille(x,z,marge){return G.isSea(x,z)||G.riverDist(x,z)<G.riverHalfWidth+(marge||0);}
  function surSable(x,z){return G.isBeach(x,z);}

  carte.peupler=function(game,api){
    originalPeupler.call(this,game,api);
    // Les gisements poses par les couches precedentes sur la plage ou dans l'eau sont retires.
    var garde=[],retires=0;
    for(var i=0;i<game.nodes.length;i++){
      var n=game.nodes[i];
      if(mouille(n.x,n.z,(n.radius||1)+.5)||surSable(n.x,n.z)){retires++;if(game._entities&&game._entities.delete)game._entities.delete(n.id);continue;}
      garde.push(n);
    }
    game.nodes.length=0;for(var j=0;j<garde.length;j++)game.nodes.push(garde[j]);
    game.fowFinitions={gisementsRetires:retires,bancs:poserBancs(game,api)};
  };

  // 20/10 : les bancs de poissons, au bord du fleuve, des lacs et de la mer.
  // On ne les peche qu'avec une cabane de pecheur toute proche.
  function poserBancs(game,api){
    var S=api.SECTORS||[],poses=0,P=G.ponts||[];
    function secteur(x,z){var b=S[0],bd=1e9;for(var i=0;i<S.length;i++){var dx=x-S[i].x,dz=z-S[i].z,d=dx*dx+dz*dz;if(d<bd){bd=d;b=S[i];}}return b;}
    function libre(x,z){
      if(x<14||z<14||x>754||z>754)return false;
      if(api.terrainAt(x,z)!=='land')return false;
      for(var i=0;i<P.length;i++){var a=x-P[i].x,b=z-P[i].z;if(a*a+b*b<28*28)return false;}
      for(var j=0;j<S.length;j++){var c=x-S[j].x,d=z-S[j].z;if(c*c+d*d<30*30)return false;}
      for(var k=0;k<game.nodes.length;k++){var n=game.nodes[k],e=x-n.x,f=z-n.z,m=(n.radius||1)+4;if(e*e+f*f<m*m)return false;}
      return true;
    }
    function poser(x,z){if(!libre(x,z))return false;api.addNode('food',x,z,420,1.8,'fish',secteur(x,z).id);poses++;return true;}
    // le long de l'Herault, une rive puis l'autre
    var cote=1;
    for(var z=34;z<G.coastZ(G.riverX(700))-20;z+=36){
      var rx=G.riverX(z),sl=G.riverSlope(z),l=Math.sqrt(1+sl*sl),off=G.riverHalfWidth+3.6;
      for(var essai=0;essai<2;essai++){var sg=essai?-cote:cote;if(poser(rx+sg*off/l,z-sg*off*sl/l))break;}
      cote=-cote;
    }
    // sur la plage, face a la mer
    for(var x=40;x<740;x+=58){var cz=G.coastZ(x);if(G.riverDist(x,cz)<30)continue;poser(x,cz-4);}
    // autour des lacs (et du Salagou), trois places au plus par lac
    var R=game.reliefs||[];
    for(var r=0;r<R.length;r++){
      var L=R[r];if(L.t!=='lac'||/Ruisseau/.test(L.nom||''))continue;
      var C=L.c[0],mis=0,max=L.nom==='Lac du Salagou'?4:2;
      for(var a=0;a<16&&mis<max;a++){
        var ang=a*Math.PI/8;
        for(var dd=0;dd<14;dd+=1.5){
          var px=C[0]+Math.cos(ang)*(C[2]+dd),pz=C[1]+Math.sin(ang)*(C[2]+dd);
          if(api.terrainAt(px,pz)!=='land')continue;
          if(poser(px+Math.cos(ang)*2,pz+Math.sin(ang)*2)){mis++;a+=3;}
          break;
        }
      }
    }
    return poses;
  }

  carte.decor=function(col,row){
    var out=originalDecor.call(this,col,row);
    function filtre(liste,sableOk){
      if(!liste||!liste.length)return liste;
      var res=[];
      for(var i=0;i<liste.length;i++){var t=liste[i];if(mouille(t.x,t.z,1.2))continue;if(!sableOk&&surSable(t.x,t.z))continue;res.push(t);}
      return res;
    }
    out.arbres=filtre(out.arbres,false);
    out.buissons=filtre(out.buissons,false);
    out.roseaux=filtre(out.roseaux,false);
    out.nenuphars=filtre(out.nenuphars,false);
    out.rochers=filtre(out.rochers,true);
    return out;
  };
  carte.geoFinitions=true;
})();
